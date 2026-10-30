const { test } = require('node:test');
const assert = require('node:assert/strict');
const { defineComponent, jsonContract, compileGraph, describeRegistry, contract } = require('../dist/cjs');
const { validateGraph } = require('../dist/cjs/model');
const { getGraphDefinition } = require('../dist/cjs/graph');
const { z } = require('zod');
let calls = 0;
const make = (id, input = jsonContract, output = jsonContract) => defineComponent({ id, version: 1,
  title: id, description: '', in: { in: input }, out: { out: output }, create() { calls++; return async () => {}; } });
const registry = { 'a@1': make('a') };
const spec = () => ({ version: 1, nodes: [{ id: 'a', component: 'a@1' }], edges: [],
  inputs: { input: { node: 'a', port: 'in' } }, outputs: { output: { node: 'a', port: 'out' } } });
test('reject graph before effects; browser and server graph issues agree', () => {
  const cases = [
    [s => { s.version = 2; }, 'INVALID_GRAPH'],
    [s => { s.extra = true; }, 'INVALID_GRAPH'],
    [s => { s.nodes[0].id = ''; }, 'INVALID_GRAPH'],
    [s => { s.nodes[0].component = ''; }, 'INVALID_GRAPH'],
    [s => { s.nodes[0].component = 'missing'; }, 'UNKNOWN_COMPONENT'],
    [s => { s.nodes.push({ ...s.nodes[0] }); }, 'DUPLICATE_ID'],
    [s => { s.inputs.input.port = 'missing'; }, 'UNKNOWN_PORT'],
    [s => { s.inputs.input.node = 'missing'; }, 'UNKNOWN_PORT'],
    [s => { s.inputs.input.port = ''; }, 'INVALID_GRAPH'],
    [s => { s.inputs = {}; }, 'PORT_CARDINALITY'],
    [s => { s.inputs.other = s.inputs.input; }, 'PORT_CARDINALITY'],
    [s => { s.edges = [{ from: { node: 'a', port: 'out' }, to: { node: 'a', port: 'in' }, capacity: 0 }]; s.inputs = {}; s.outputs = {}; }, 'INVALID_CAPACITY'],
    [s => { s.edges = [{ from: { node: 'a', port: 'out' }, to: { node: 'a', port: 'in' } }]; s.inputs = {}; s.outputs = {}; }, 'CYCLE'],
    [s => { s.nodes = Array.from({ length: 1001 }, (_, i) => ({ id: `n${i}`, component: 'a@1' })); }, 'GRAPH_LIMIT'],
    [s => { s.edges = Array(4097).fill({ from: { node: 'a', port: 'out' }, to: { node: 'a', port: 'in' } }); }, 'GRAPH_LIMIT'],
    [s => { s.nodes = null; }, 'INVALID_GRAPH'],
    [s => { s.edges = null; }, 'INVALID_GRAPH'],
    [s => { s.inputs = null; }, 'INVALID_GRAPH'],
    [s => { s.outputs = null; }, 'INVALID_GRAPH'],
  ];
  for (const [change, code] of cases) {
    const value = spec(); change(value);
    const result = compileGraph(value, registry);
    assert.equal(result.ok, false); assert(result.issues.some(issue => issue.code === code), code);
    assert.deepEqual(result, validateGraph(value, describeRegistry(registry)));
    assert.deepEqual(result, validateGraph(JSON.parse(JSON.stringify(value)), JSON.parse(JSON.stringify(describeRegistry(registry)))));
  }
  assert.equal(calls, 0);
});
test('compile snapshots definitions and refuses forged handles', () => {
  const value = spec(), local = { ...registry }, original = local['a@1'];
  const result = compileGraph(value, local); assert.equal(result.ok, true);
  const definition = getGraphDefinition(result.graph);
  value.nodes[0].id = 'changed'; value.inputs.input.port = 'changed'; local['a@1'] = make('replacement');
  assert.equal(definition.spec.nodes[0].id, 'a'); assert.equal(definition.spec.inputs.input.port, 'in');
  assert.equal(definition.registry['a@1'], original);
  assert(Object.isFrozen(definition.spec.nodes[0])); assert(Object.isFrozen(result.graph));
  assert.throws(() => getGraphDefinition({}), { code: 'INVALID_ARGUMENT' });
  assert.equal(calls, 0);
});
test('own identity and contracts', () => {
  const numeric = contract('number@1', z.number()), text = contract('text@1', z.string());
  const r = { 'n@1': make('n', numeric, numeric), 't@1': make('t', text, text) };
  const value = { version: 1, nodes: [{ id: 'n', component: 'n@1' }, { id: 't', component: 't@1' }],
    edges: [{ from: { node: 'n', port: 'out' }, to: { node: 't', port: 'in' }, capacity: 256 }],
    inputs: { input: { node: 'n', port: 'in' } }, outputs: { output: { node: 't', port: 'out' } } };
  assert.deepEqual(compileGraph(value, r).issues, [{ code: 'CONTRACT_MISMATCH', path: '$.edges[0]' }]);
  r['t@1'] = make('t', jsonContract, jsonContract); assert.equal(compileGraph(value, r).ok, true);
  const ports = Object.fromEntries([['__proto__', jsonContract]]);
  const special = defineComponent({ id: 'special', version: 1, title: 'special', description: '',
    in: ports, out: {}, create: () => async () => {} });
  assert.equal(compileGraph({ version: 1, nodes: [{ id: '__proto__', component: 'special@1' }], edges: [],
    inputs: { input: { node: '__proto__', port: '__proto__' } }, outputs: {} }, { 'special@1': special }).ok, true);
});
test('graph shape, names and capacities are deterministic', () => {
  for (const value of [null, [], {}, () => {}, { ...spec(), nodes: [{}] },
    { ...spec(), edges: [{}] }, { ...spec(), inputs: { x: {} } },
    { ...spec(), edges: [{ from: {}, to: {} }] }]) {
    assert.deepEqual(compileGraph(value, registry), { ok: false, issues: [{ code: 'INVALID_GRAPH', path: '$' }] });
  }
  for (const field of ['inputs', 'outputs']) {
    const value = spec(); value[field] = { '': Object.values(value[field])[0] };
    assert(compileGraph(value, registry).issues.some(issue => issue.code === 'INVALID_GRAPH'));
  }
  for (const capacity of [-1, 0, 1.5, 257, '16', null]) {
    const value = spec(); value.inputs = {}; value.outputs = {};
    value.edges = [{ from: { node: 'a', port: 'out' }, to: { node: 'a', port: 'in' }, capacity }];
    assert(compileGraph(value, registry).issues.some(issue => issue.code === 'INVALID_CAPACITY'));
  }
  for (const capacity of [1, 16, 256]) {
    const value = spec(); value.nodes.push({ id: 'b', component: 'a@1' });
    value.edges = [{ from: { node: 'a', port: 'out' }, to: { node: 'b', port: 'in' }, capacity }];
    value.outputs.output.node = 'b'; assert.equal(compileGraph(value, registry).ok, true);
  }
  assert.equal(compileGraph({ version: 1, nodes: [], edges: [], inputs: {}, outputs: {} }, registry).ok, true);
});
test('catalog refusal, duplicate unknown IDs and no executable authority from metadata', () => {
  assert.equal(validateGraph(spec(), { version: 2, components: [] }).ok, false);
  assert.equal(validateGraph(spec(), null).ok, false);
  assert.equal(compileGraph(spec(), { 'a@1': {} }).ok, false);
  assert.equal(compileGraph(spec(), describeRegistry(registry)).ok, false);
  const value = spec(); value.nodes = [{ id: 'x', component: 'missing' }, { id: 'x', component: 'missing' }];
  assert(compileGraph(value, registry).issues.some(issue => issue.code === 'DUPLICATE_ID'));
  const conflict = { 'n@1': make('n', contract('same@1', z.number())),
    's@1': make('s', contract('same@1', z.string())) };
  assert.deepEqual(compileGraph(value, conflict), { ok: false, issues: [{ code: 'CONTRACT_ID_CONFLICT', path: '$.registry' }] });
});
test('acyclic shared paths and multi-node cycles', () => {
  const node = defineComponent({ id: 'branch', version: 1, title: 'branch', description: '',
    in: { x: jsonContract, y: jsonContract }, out: { x: jsonContract, y: jsonContract }, create: () => async () => {} });
  const value = { version: 1, nodes: [{ id: 'a', component: 'branch@1' }, { id: 'b', component: 'branch@1' }],
    edges: ['x', 'y'].map(port => ({ from: { node: 'a', port }, to: { node: 'b', port } })),
    inputs: Object.fromEntries(['x', 'y'].map(port => [port, { node: 'a', port }])),
    outputs: Object.fromEntries(['x', 'y'].map(port => [port, { node: 'b', port }])) };
  assert.equal(compileGraph(value, { 'branch@1': node }).ok, true);
  value.edges.push(...['x', 'y'].map(port => ({ from: { node: 'b', port }, to: { node: 'a', port } })));
  value.inputs = {}; value.outputs = {};
  assert.deepEqual(compileGraph(value, { 'branch@1': node }).issues, [{ code: 'CYCLE', path: '$.edges' }]);
});
test('supported graph limits include exposed boundary channels', () => {
  const empty = defineComponent({ id: 'empty', version: 1, title: 'Empty', description: '',
    in: {}, out: {}, create: () => async () => {} });
  const value = { version: 1, nodes: Array.from({ length: 1000 }, (_, i) => ({ id: String(i), component: 'empty@1' })),
    edges: [], inputs: {}, outputs: {} };
  assert.equal(compileGraph(value, { 'empty@1': empty }).ok, true);
  const ports = Object.fromEntries(Array.from({ length: 2048 }, (_, i) => [`p${i}`, jsonContract]));
  const wide = defineComponent({ id: 'wide', version: 1, title: 'Wide', description: '',
    in: ports, out: ports, create: () => async () => {} });
  const boundary = Object.fromEntries(Object.keys(ports).map(port => [port, { node: 'wide', port }]));
  const large = { version: 1, nodes: [{ id: 'wide', component: 'wide@1' }], edges: [], inputs: boundary, outputs: boundary };
  assert.equal(compileGraph(large, { 'wide@1': wide }).ok, true);
  large.inputs = { ...boundary, extra: { node: 'wide', port: 'p0' } };
  assert.deepEqual(compileGraph(large, { 'wide@1': wide }), { ok: false, issues: [{ code: 'GRAPH_LIMIT', path: '$' }] });
});
test('untrusted fields are not read through accessors and malformed endpoints never execute', () => {
  let reads = 0;
  const value = spec(); Object.defineProperty(value, 'extra', { get() { reads++; return 1; } });
  assert.equal(compileGraph(value, registry).ok, false); assert.equal(reads, 0);
  for (const change of [s => { s.nodes[0].component = 42; }, s => { s.inputs.input.node = ''; },
    s => { s.edges = [{ from: { node: 'a', port: 'missing' }, to: { node: 'a', port: 'in' } }]; }]) {
    const value = spec(); change(value); assert.equal(compileGraph(value, registry).ok, false);
  }
  const catalog = JSON.parse(JSON.stringify(describeRegistry(registry)));
  catalog.components[0].in.in.representationId = 'binary@1';
  assert.equal(validateGraph(spec(), catalog).issues[0].code, 'UNSUPPORTED_REPRESENTATION');
  const missing = spec(); missing.nodes[0].component = 'a@2';
  assert(compileGraph(missing, registry).issues.some(issue => issue.code === 'UNKNOWN_COMPONENT'));
  assert.equal(calls, 0);
});

test('malformed catalog accessors are never evaluated', () => {
  let reads = 0;
  const catalog = { components: [] };
  Object.defineProperty(catalog, 'version', { get() { reads++; return 1; } });
  assert.deepEqual(validateGraph(spec(), catalog), { ok: false, issues: [{ code: 'INVALID_CATALOG', path: '$' }] });
  assert.equal(reads, 0);
});

test('exact issue codes and paths for endpoint and capacity failures', () => {
  const value = spec(); value.inputs.input.port = 'missing';
  assert.deepEqual(compileGraph(value, registry).issues, [
    { code: 'UNKNOWN_PORT', path: '$.inputs["input"]' },
    { code: 'PORT_CARDINALITY', path: '$.nodes[0].in["in"]' },
  ]);
  value.inputs.input.port = 'in'; value.outputs.output.port = 'missing';
  assert.deepEqual(compileGraph(value, registry).issues, [
    { code: 'PORT_CARDINALITY', path: '$.nodes[0].out["out"]' },
    { code: 'UNKNOWN_PORT', path: '$.outputs["output"]' },
  ]);
  value.inputs = {}; value.outputs = {};
  value.edges = [{ from: { node: 'a', port: 'out' }, to: { node: 'a', port: 'in' }, capacity: 0 }];
  assert.deepEqual(compileGraph(value, registry).issues, [
    { code: 'CYCLE', path: '$.edges' }, { code: 'INVALID_CAPACITY', path: '$.edges[0].capacity' },
  ]);
});
test('registry snapshot preserves nonenumerable definition entries', () => {
  const local = {};
  Object.defineProperty(local, 'a@1', { value: registry['a@1'], enumerable: false });
  const result = compileGraph(spec(), local);
  assert.equal(result.ok, true);
  assert.equal(getGraphDefinition(result.graph).registry['a@1'], registry['a@1']);
});
