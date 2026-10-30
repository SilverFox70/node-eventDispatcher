const { test } = require('node:test');
const assert = require('node:assert/strict');
const z = require('zod');
const { contract, defineComponent, describeRegistry } = require('../dist/cjs/index.js');

test('one contract meaning', () => {
  const n = contract('value@1', z.number());
  const s = contract('value@1', z.string());
  let creates = 0;
  const make = (id, c) => defineComponent({ id, version: 1, title: id, description: 'fixture',
    in: { value: c }, out: {}, create() { creates++; return async () => {}; } });
  const a = make('a', n), b = make('b', s);
  assert.throws(() => describeRegistry({ 'a@1': a, 'b@1': b }), { code: 'CONTRACT_ID_CONFLICT' });
  assert.equal(creates, 0);
});

test('equivalent contracts are local identities with immutable validation', () => {
  const { jsonContract } = require('../dist/cjs/index.js');
  const a = contract('n@1', z.number().min(0).max(10));
  const b = contract('n@1', z.number().min(0).max(10).describe('annotation'));
  assert.equal(a.validate(3), true);
  assert.equal(a.validate(-1), false);
  assert.equal(a.validate(NaN), false);
  assert.equal(a.validate(new Date()), false);
  assert.equal(jsonContract.validate({ values: [null, true, 2] }), true);
  assert.equal(jsonContract.validate(undefined), false);
  assert.deepEqual(jsonContract.schema, {});
  assert.equal(Object.isFrozen(a), true);
  assert.equal(Object.isFrozen(a.schema), true);
  const make = c => defineComponent({ id: 'test', version: 1, title: 'Test', description: '',
    in: { a: c }, out: { b }, create: () => async () => {} });
  assert.equal(describeRegistry({ 'test@1': make(a) }).components.length, 1);
  assert.throws(() => make(contract('n@1', z.string())), { code: 'CONTRACT_ID_CONFLICT' });
  assert.throws(() => contract('json@1', z.string()), { code: 'INVALID_ARGUMENT' });
  for (const id of ['', null, 1, 'unversioned', '@1', 'name@', 'x'.repeat(129)]) assert.throws(() => contract(id, z.number()), { code: 'INVALID_ARGUMENT' });
  const { contractsCompatible } = require('../dist/cjs/model/index.js');
  const port = c => ({ contractId: c.id, representationId: c.representationId, schema: c.schema });
  assert.equal(contractsCompatible(port(a), port(b)), true);
  assert.equal(contractsCompatible(port(a), port(jsonContract)), true);
  assert.equal(contractsCompatible(port(jsonContract), port(a)), false);
  const narrowString = contract('s@1', z.string());
  assert.equal(contractsCompatible(port(a), port(narrowString)), false);
  const { assertCompatibleContracts } = require('../dist/cjs/contracts.js');
  assert.throws(() => assertCompatibleContracts(narrowString, a), { code: 'CONTRACT_MISMATCH' });
  assert.doesNotThrow(() => assertCompatibleContracts(a, jsonContract));
  assert.equal(contractsCompatible({ ...port(a), representationId: 'binary@1' }, port(a)), false);
});

test('component definitions snapshot ports and validate authored examples before export', () => {
  const n = contract('n@1', z.number());
  const input = { value: n };
  const examples = [{ in: { value: 2 }, out: { total: 4 } }];
  let creates = 0;
  const spec = { id: 'double', version: 1, title: 'Double', description: 'public description', in: input,
    out: { total: n }, examples, effects: ['read-service'], requiredDependencies: ['lookup'],
    create() { creates++; return async () => {}; } };
  const component = defineComponent(spec);
  input.value = contract('s@1', z.string()); examples[0].in.value = 'mutated';
  const catalog = describeRegistry({ 'double@1': component });
  assert.equal(catalog.components[0].in.value.contractId, 'n@1');
  assert.equal(catalog.components[0].examples[0].in.value, 2);
  assert.equal(creates, 0);
  assert.equal(Object.isFrozen(component.in), true);
  assert.equal(Object.isFrozen(catalog.components[0].examples[0]), true);
  assert.doesNotMatch(JSON.stringify(catalog), /create|validate|mutated/);
  for (const examples of [[{ in: { value: 'bad' } }], [{ in: { missing: 2 } }], [{ other: {} }], null, [null], [{ in: null }]]) {
    assert.throws(() => defineComponent({ ...spec, in: { value: n }, examples }), { code: 'INVALID_EXAMPLE' });
  }
  for (const change of [{ id: '' }, { version: 0 }, { version: 1.5 }, { title: '' }, { description: 42 },
    { create: null }, { in: null }, { out: { bad: null } }, { effects: 1 }, { requiredDependencies: [''] }]) {
    assert.throws(() => defineComponent({ ...spec, in: { value: n }, examples: [], ...change }), { code: 'INVALID_ARGUMENT' });
  }
  assert.throws(() => defineComponent({ ...spec, in: { value: { ...n, representationId: 'binary@1' } }, examples: [] }), { code: 'UNSUPPORTED_REPRESENTATION' });
  assert.throws(() => defineComponent({ ...spec, in: { value: { ...n } }, examples: [] }), { code: 'INVALID_ARGUMENT' });
  assert.throws(() => describeRegistry({ wrong: component }), { code: 'INVALID_ARGUMENT' });
  assert.throws(() => describeRegistry({ 'double@1': { ...component } }), { code: 'INVALID_ARGUMENT' });
});

test('unexpected validator failures propagate instead of becoming payload refusals', t => {
  const schema = z.number();
  const c = contract('failure@1', schema);
  const sentinel = new Error('validator failed');
  const stub = t.mock.method(schema._zod, 'run', () => { throw sentinel; });
  assert.throws(() => c.validate(1), error => error === sentinel);
  stub.mock.restore();
  const { FlowError } = require('../dist/cjs/index.js');
  const internal = new FlowError('INTERNAL');
  t.mock.method(schema._zod, 'run', () => { throw internal; });
  assert.throws(() => c.validate(1), error => error === internal);
  assert.throws(() => contract('empty@1', z.enum({})), { code: 'UNSUPPORTED_SCHEMA' });
});


test('runtime validation details can be displayed without exposing rejected values', () => {
  const { getContractIssues } = require('../dist/cjs/contracts.js');
  const c = contract('report@1', z.strictObject({ count: z.number(), items: z.array(z.number()) }));
  const issues = getContractIssues(c, { count: 'private-value', items: ['private-item'] });
  assert.deepEqual(issues.map(issue => issue.path), [['count'], ['items', 0]]);
  assert.ok(issues.every(issue => issue.code === 'invalid_type'));
  assert.ok(Object.isFrozen(issues) && Object.isFrozen(issues[0].path));
  assert.doesNotMatch(JSON.stringify(issues), /private|input|message/);
  assert.deepEqual(getContractIssues(c, undefined), [{ code: 'INVALID_PACKET', path: [] }]);
  assert.deepEqual(getContractIssues(c, { count: 1, items: [] }), []);
});

test('valid maximum-sized examples are not charged for surrounding metadata', () => {
  const c = contract('large@1', z.string());
  const component = defineComponent({ id: 'large', version: 1, title: 'Large', description: '', in: { value: c }, out: {},
    examples: [{ in: { value: 'x'.repeat(1048574) } }], create: () => async () => {} });
  assert.equal(describeRegistry({ 'large@1': component }).components[0].examples[0].in.value.length, 1048574);
});


test('exported examples preserve every data member validated by the contract', () => {
  const c = contract('hidden@1', z.strictObject({ hidden: z.number() }));
  const value = Object.defineProperty({}, 'hidden', { value: 2 });
  const component = defineComponent({ id: 'hidden', version: 1, title: 'Hidden', description: '', in: { value: c }, out: {},
    examples: [{ in: { value } }], create: () => async () => {} });
  const exported = describeRegistry({ 'hidden@1': component }).components[0].examples[0].in.value;
  assert.deepEqual(exported, { hidden: 2 });
  assert.equal(c.validate(exported), true);
});
