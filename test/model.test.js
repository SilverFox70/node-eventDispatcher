const { test } = require('node:test');
const assert = require('node:assert/strict');
const z = require('zod');
const { contract, defineComponent, describeRegistry, jsonContract } = require('../dist/cjs/index.js');
const { validateCatalog, canonicalSchema, contractsCompatible } = require('../dist/cjs/model/index.js');

const clone = value => JSON.parse(JSON.stringify(value));

const make = (schema = z.number(), example = 2) => {
  const n = contract('value@1', schema);
  return describeRegistry({ 'test@1': defineComponent({ id: 'test', version: 1, title: 'Test', description: '',
    in: { value: n }, out: { result: jsonContract }, examples: [{ in: { value: example } }],
    effects: [], requiredDependencies: ['lookup'], create: () => async () => {} }) });
};

test('catalog parity and authority boundary', () => {
  const catalog = make();
  assert.deepEqual(validateCatalog(catalog), { ok: true });
  assert.deepEqual(validateCatalog(JSON.parse(JSON.stringify(catalog))), { ok: true });
  const edited = JSON.parse(JSON.stringify(catalog));
  edited.components[0].examples[0].in.value = 'wrong-business-value';
  assert.deepEqual(validateCatalog(edited), { ok: true }); // Metadata validation is not browser payload evaluation.
  const second = make(z.string(), 'a');
  assert.equal(validateCatalog({ version: 1, components: [catalog.components[0], { ...second.components[0], id: 'other' }] }).issues[0].code, 'CONTRACT_ID_CONFLICT');
  assert.equal(validateCatalog({ ...catalog, components: [catalog.components[0], catalog.components[0]] }).ok, false);
  assert.deepEqual(validateCatalog({ version: 1, components: [] }), { ok: true });
});

test('canonical schema retains assertion fields even when property names are annotations', () => {
  const a = { type: 'object', properties: { description: { type: 'number', description: 'a' } }, additionalProperties: false };
  const b = { additionalProperties: false, properties: { description: { description: 'b', type: 'number' } }, type: 'object' };
  assert.equal(canonicalSchema(a), canonicalSchema(b));
  assert.notEqual(canonicalSchema(a), canonicalSchema({ ...a, properties: { description: { type: 'string' } } }));
  assert.equal(canonicalSchema({ anyOf: [{ type: 'string', title: 'a' }, { type: 'null' }] }), canonicalSchema({ anyOf: [{ type: 'string' }, { type: 'null' }] }));
  assert.notEqual(canonicalSchema({ enum: ['a', 'b'] }), canonicalSchema({ enum: ['b', 'a'] }));
  assert.equal(contractsCompatible({ representationId: 'json@1', contractId: 'n', schema: { type: 'number' } },
    { representationId: 'json@1', contractId: 'n', schema: { type: 'string' } }), false);
});

test('invalid catalog and unsupported descriptor table', () => {
  const catalog = JSON.parse(JSON.stringify(make()));
  const withSchema = schema => { const c = clone(catalog); c.components[0].in.value.schema = schema; return c; };
  const invalidSchemas = [null, {}, { type: 'wat' }, { type: [] }, { $schema: 'draft7', type: 'number' },
    { type: 'number', minimum: '0' }, { type: 'number', multipleOf: 0 }, { type: 'string', minLength: -1 },
    { type: 'string', format: 'email' }, { type: 'string', pattern: 3 }, { type: 'object' }, { properties: [] },
    { items: null }, { anyOf: [] }, { anyOf: [false] }, { required: [1] }, { enum: [] }, { enum: [{}] }, { const: {} }, { unknown: true }, { additionalProperties: true }];
  for (const schema of invalidSchemas) assert.equal(validateCatalog(withSchema(schema)).ok, false, JSON.stringify(schema));
  const variants = [null, [], {}, { ...catalog, version: 2 }, { ...catalog, extra: true },
    { ...catalog, components: [null] }, { ...catalog, components: [{ ...catalog.components[0], version: 0 }] }];
  for (const value of variants) assert.equal(validateCatalog(value).ok, false);
  const repr = clone(catalog); repr.components[0].in.value.representationId = 'binary@1';
  assert.equal(validateCatalog(repr).issues[0].code, 'UNSUPPORTED_REPRESENTATION');
  const forged = clone(catalog); forged.components[0].in.value.contractId = 'json@1';
  assert.equal(validateCatalog(forged).ok, false);
  const examples = clone(catalog); examples.components[0].examples = [{ in: { missing: 2 } }];
  assert.equal(validateCatalog(examples).ok, false);
  const effects = clone(catalog); effects.components[0].effects = [''];
  assert.equal(validateCatalog(effects).ok, false);
  const cycle = {}; cycle.self = cycle;
  for (const value of [cycle, { x: undefined }, { x: () => {} }, new Date(), { [Symbol('x')]: 1 }]) assert.equal(validateCatalog(value).ok, false);
  const getter = Object.defineProperty({}, 'version', { get() { throw new Error('not called'); } });
  assert.equal(validateCatalog(getter).ok, false);
});

test('metadata arrays and opaque failures refuse without executing accessors', () => {
  const sparse = new Array(1);
  sparse.extra = 1;
  const getter = [0];
  Object.defineProperty(getter, '0', { get() { throw new Error('should not execute'); } });
  const extra = []; extra.other = 1;
  for (const components of [sparse, getter, extra]) assert.equal(validateCatalog({ version: 1, components }).ok, false);
  const proxy = new Proxy({}, { getPrototypeOf() { throw new Error('opaque failure'); } });
  assert.equal(validateCatalog(proxy).issues[0].code, 'INVALID_CATALOG');
  let deep = null;
  for (let index = 0; index < 260; index++) deep = [deep];
  assert.equal(validateCatalog(deep).ok, false);
});


test('generated schemas for structured and literal contracts remain valid metadata', () => {
  const schemas = [z.strictObject({ x: z.string().optional() }), z.array(z.number()).min(1).max(2),
    z.literal([1, 'a', true, null]), z.discriminatedUnion('tag', [z.strictObject({ tag: z.literal('a') }), z.strictObject({ tag: z.literal('b') })])];
  schemas.forEach((schema, index) => {
    const c = contract(`structured-${index}@1`, schema);
    const component = defineComponent({ id: 'node', version: 1, title: 'Node', description: '', in: { value: c }, out: {}, create: () => async () => {} });
    assert.deepEqual(validateCatalog(describeRegistry({ 'node@1': component })), { ok: true });
  });
});


test('catalog contract IDs require explicit revisions', () => {
  for (const id of ['unversioned', 'name@']) {
    const value = clone(make()); value.components[0].in.value.contractId = id;
    assert.equal(validateCatalog(value).ok, false);
  }
});
