const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGraph, defineComponent, contract, jsonContract, compileGraph } = require('../dist/cjs');
const { z } = require('zod');
let calls = 0;
const numeric = contract('number@1', z.number());
const node = defineComponent({ id: 'number', version: 1, title: 'Number', description: '',
  in: { value: numeric }, out: { result: numeric }, create() { calls++; return async () => {}; } });
const registry = { 'number@1': node };

test('builder emits authoritative graph spec', () => {
  const graph = createGraph(), a = graph.add('a', node), b = graph.add('b', node);
  graph.connect(a, 'result', b, 'value', 2);
  graph.exposeInput('value', a, 'value'); graph.exposeOutput('result', b, 'result');
  const spec = graph.toSpec();
  assert.deepEqual(spec, { version: 1, nodes: [{ id: 'a', component: 'number@1' }, { id: 'b', component: 'number@1' }],
    edges: [{ from: { node: 'a', port: 'result' }, to: { node: 'b', port: 'value' }, capacity: 2 }],
    inputs: { value: { node: 'a', port: 'value' } }, outputs: { result: { node: 'b', port: 'result' } } });
  assert.equal(compileGraph(spec, registry).ok, true);
  assert(Object.isFrozen(spec.edges[0].from)); assert(Object.isFrozen(spec.inputs.value));
  assert.throws(() => spec.nodes.push({}), TypeError);
  const c = graph.add('c', node);
  graph.connect(b, 'result', c, 'value');
  assert.equal(spec.nodes.length, 2); assert.equal(graph.toSpec().nodes.length, 3);
  assert.equal(spec.edges.length, 1); assert.equal(graph.toSpec().edges.length, 2);
  assert(Object.isFrozen(a)); assert(Object.isFrozen(graph)); assert.equal(calls, 0);
});
test('foreign handle rejected before graph mutation', () => {
  const graph = createGraph(), other = createGraph();
  const local = graph.add('same', node), foreign = other.add('same', node);
  const before = graph.toSpec();
  for (const action of [() => graph.connect(foreign, 'result', local, 'value'),
    () => graph.connect(local, 'result', foreign, 'value'), () => graph.exposeInput('x', foreign, 'value'),
    () => graph.exposeOutput('x', foreign, 'result'), () => graph.connect({}, 'result', local, 'value'),
    () => graph.connect(null, 'result', local, 'value')]) assert.throws(action, { code: 'INVALID_ARGUMENT' });
  assert.deepEqual(graph.toSpec(), before);
});
test('construction guards preserve existing graph', () => {
  const graph = createGraph(), a = graph.add('a', node), before = graph.toSpec();
  for (const id of ['', 'x'.repeat(129), null]) assert.throws(() => graph.add(id, node), { code: 'INVALID_ARGUMENT' });
  assert.throws(() => graph.add('a', node), { code: 'DUPLICATE_ID' });
  assert.throws(() => graph.add('bad', {}), { code: 'INVALID_ARGUMENT' });
  for (const action of [() => graph.connect(a, 'missing', a, 'value'), () => graph.connect(a, 'result', a, 'missing'),
    () => graph.exposeInput('x', a, 'missing'), () => graph.exposeOutput('x', a, 'missing')]) assert.throws(action, { code: 'UNKNOWN_PORT' });
  for (const capacity of [0, -1, 257, 1.5, NaN, Infinity, '1']) {
    assert.throws(() => graph.connect(a, 'result', a, 'value', capacity), { code: 'INVALID_CAPACITY' });
  }
  for (const name of ['', null, 'x'.repeat(129)]) {
    assert.throws(() => graph.exposeInput(name, a, 'value'), { code: 'INVALID_ARGUMENT' });
    assert.throws(() => graph.exposeOutput(name, a, 'result'), { code: 'INVALID_ARGUMENT' });
  }
  assert.deepEqual(graph.toSpec(), before);
  graph.exposeInput('x', a, 'value'); graph.exposeOutput('x', a, 'result');
  assert.throws(() => graph.exposeInput('x', a, 'value'), { code: 'DUPLICATE_ID' });
  assert.throws(() => graph.exposeOutput('x', a, 'result'), { code: 'DUPLICATE_ID' });
});
test('compiler still decides identity compatibility, cardinality and cycles', () => {
  const different = defineComponent({ id: 'different', version: 1, title: 'Different', description: '',
    in: { value: contract('other-number@1', z.number()) }, out: {}, create: () => async () => {} });
  const graph = createGraph(), a = graph.add('a', node), b = graph.add('b', different);
  graph.connect(a, 'result', b, 'value'); graph.exposeInput('value', a, 'value');
  assert.deepEqual(compileGraph(graph.toSpec(), { ...registry, 'different@1': different }).issues,
    [{ code: 'CONTRACT_MISMATCH', path: '$.edges[0]' }]);
  assert.equal(Object.hasOwn(graph.toSpec().edges[0], 'capacity'), false);
  const loop = createGraph(), n = loop.add('n', node); loop.connect(n, 'result', n, 'value');
  assert.deepEqual(compileGraph(loop.toSpec(), registry).issues, [{ code: 'CYCLE', path: '$.edges' }]);
  loop.exposeInput('extra', n, 'value');
  assert(compileGraph(loop.toSpec(), registry).issues.some(issue => issue.code === 'PORT_CARDINALITY'));
  assert.equal(calls, 0);
});
test('prototype names and JSON wildcard remain ordinary compiler inputs', () => {
  const ports = Object.fromEntries([['__proto__', jsonContract]]);
  const special = defineComponent({ id: 'special', version: 1, title: 'Special', description: '',
    in: ports, out: ports, create: () => async () => {} });
  const graph = createGraph(), a = graph.add('a', node), b = graph.add('__proto__', special);
  graph.connect(a, 'result', b, '__proto__', 256);
  graph.exposeInput('__proto__', a, 'value'); graph.exposeOutput('__proto__', b, '__proto__');
  assert.equal(compileGraph(JSON.parse(JSON.stringify(graph.toSpec())), { ...registry, 'special@1': special }).ok, true);
});
test('malformed JavaScript arguments cannot execute coercion hooks', () => {
  const graph = createGraph(), a = graph.add('a', node);
  let reads = 0;
  const port = { toString() { reads++; return 'value'; } };
  assert.throws(() => graph.exposeInput('x', a, port), { code: 'UNKNOWN_PORT' });
  const id = { toString() { reads++; return 'fake'; } };
  assert.throws(() => graph.add('fake', { id, version: 1 }), { code: 'INVALID_ARGUMENT' });
  assert.equal(reads, 0);
  assert.deepEqual(graph.toSpec().inputs, {});
});
test('invalid definitions and accessor fields refuse before registration', () => {
  const graph = createGraph(); let reads = 0;
  const accessor = { version: 1 };
  Object.defineProperty(accessor, 'id', { get() { reads++; return 'number'; } });
  for (const value of [null, accessor, { id: 'fake', version: '1' }, { id: 'fake', version: 1 }]) {
    assert.throws(() => graph.add('retry', value), { code: 'INVALID_ARGUMENT' });
  }
  assert.equal(reads, 0); assert.deepEqual(graph.toSpec().nodes, []);
  const n = graph.add('retry', node); graph.exposeInput('x', n, 'value'); graph.exposeOutput('y', n, 'result');
  assert.equal(compileGraph(graph.toSpec(), registry).ok, true);
});
