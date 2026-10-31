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

test('safe diagram export includes topology using synthetic identifiers', () => {
  const { toMermaid } = require('../dist/cjs/model');
  const snapshot = { version: 1, sources: [{ id: 'hostile"]\nclick injected "javascript:alert(1)"<script>bad</script>%%{init:bad}%%', kind: 'dispatcher', topology: {
    version: 1, events: [{ name: 'changed' }], subscribers: [{ id: 1, event: 'changed', ownerId: null, callbackName: 'anonymous', once: false }, { id: 2, event: 'changed', ownerId: 'service', callbackName: 'refresh', once: true }],
    publishers: [{ id: 1, event: 'changed', ownerId: 'service', provenance: 'declared' }],
  } }] };
  const diagram = toMermaid(snapshot); assert.equal(diagram, toMermaid(JSON.parse(JSON.stringify(snapshot))));
  assert.match(diagram, /subgraph s0/); assert.match(diagram, /declared/); assert.match(diagram, /active/); assert.match(diagram, /unassigned/);
  assert(!diagram.includes('<script>')); assert(!diagram.includes('%%{')); assert(!diagram.includes('\nclick '));
});

test('diagram exports defined wiring, exposed ports and scoped repeated local names', () => {
  const { toMermaid } = require('../dist/cjs/model');
  const { createGraph } = require('../dist/cjs');
  const node = defineComponent({ id: 'draw', version: 1, title: 'Quoted "title"', description: '', in: { in: jsonContract }, out: { out: jsonContract }, create: () => async () => {} });
  const builder = createGraph(), a = builder.add('same', node), b = builder.add('next', node);
  builder.connect(a, 'out', b, 'in'); builder.exposeInput('request', a, 'in'); builder.exposeOutput('response', b, 'out');
  const spec = builder.toSpec(), catalog = describeRegistry({ 'draw@1': node });
  const snapshot = { version: 1, sources: [{ id: 'a', kind: 'graph', spec, catalog, run: null }, { id: 'b', kind: 'graph', spec, catalog, run: null }] };
  assert.throws(() => toMermaid({ version: 1, sources: [{ ...snapshot.sources[0], extra: 1 }] }), { code: 'INVALID_ARGUMENT' });
  const diagram = toMermaid(snapshot); assert.match(diagram, /input request/); assert.match(diagram, /output response/); assert.match(diagram, /#34;title#34;/);
  const ids = [...diagram.matchAll(/^ {4}(s\d+_v\d+)\[/gm)].map(match => match[1]); assert.equal(new Set(ids).size, ids.length);
  assert.match(diagram, /s0_v2 -->\|defined\| s0_v4/); assert.match(diagram, /s1_v2 -->\|defined\| s1_v4/);
  assert(!diagram.includes('s0_v2 -->|defined| s1_v4'));
  assert.equal(toMermaid({ version: 1, sources: [] }), 'flowchart LR');
  const empty = toMermaid({ version: 1, sources: [{ id: 'empty', kind: 'graph', spec: { version: 1, nodes: [], edges: [], inputs: {}, outputs: {} }, catalog: { version: 1, components: [] }, run: null },
    { id: 'events', kind: 'dispatcher', topology: { version: 1, events: [], subscribers: [], publishers: [] } }] });
  assert.match(empty, /No nodes/); assert.match(empty, /No active or declared relationships/);
});

test('diagram malformed data refuses and label delimiters stay inert', () => {
  const { toMermaid } = require('../dist/cjs/model'); const { label } = require('../dist/cjs/model/mermaid/labels');
  assert.equal(label('a\r\nb\rc\nd\u2028e\u2029f'), 'a ⏎ b ⏎ c ⏎ d ⏎ e ⏎ f');
  assert.equal(label('<>&%#`"[]{}\\|\u0000\u202e'), '＜＞＆％＃｀#34;#91;#93;#123;#125;#92;#124;  ');
  const empty = { id: 'events', kind: 'dispatcher', topology: { version: 1, events: [], subscribers: [], publishers: [] } };
  for (const value of [null, {}, { version: 2, sources: [] }, { version: 1, sources: {} }, { version: 1, sources: [], extra: true },
    { version: 1, sources: [null] }, { version: 1, sources: [empty, empty] },
    ...['', 1, 'x'.repeat(129)].map(id => ({ version: 1, sources: [{ ...empty, id }] })),
    { version: 1, sources: [{ ...empty, kind: 'unknown' }] }, { version: 1, sources: [{ ...empty, extra: 1 }] },
    { version: 1, sources: [{ id: 'graph', kind: 'graph', spec: {}, catalog: {}, run: null }] }]) assert.throws(() => toMermaid(value), { code: 'INVALID_ARGUMENT' });
});
