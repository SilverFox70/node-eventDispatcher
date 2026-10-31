const { test } = require('node:test');
const { assert, component, createGraph, compileGraph, startNetwork, graphFor } = require('./node-task-fixture.cjs');
const { validateGraph } = require('../dist/cjs/model');
const { describeRegistry } = require('../dist/cjs');
const retry = { maxRetries: 2, codes: ['TEMPORARY'], delayMs: 5, idempotent: true };
test('configuration parity and static budget rejection precede factories', () => {
  let factories = 0;
  const node = component('policy', () => { factories++; return async () => {}; }, {}, {});
  const builder = createGraph(); builder.add('node', node, { taskTimeoutMs: 10, retry });
  const spec = builder.toSpec(), catalog = describeRegistry({ 'policy@1': node });
  assert.equal(validateGraph(JSON.parse(JSON.stringify(spec)), catalog).ok, true);
  assert.equal(spec.nodes[0].retry.maxRetries, 2); assert(Object.isFrozen(spec.nodes[0].retry.codes));
  const compiled = compileGraph(spec, { 'policy@1': node }).graph;
  assert.throws(() => startNetwork(compiled, { timeoutMs: 9 }), { code: 'INVALID_TIMEOUT_POLICY' });
  const run = startNetwork(compiled, { timeoutMs: 10 }); run.cancel();
  const noFlow = startNetwork(compiled); noFlow.cancel(); assert.equal(factories, 0);
  for (const bad of [0, -1, 1.5, null, undefined, '1', Infinity]) {
    const value = { ...spec, nodes: [{ ...spec.nodes[0], taskTimeoutMs: bad }] };
    assert.deepEqual(compileGraph(value, { 'policy@1': node }), validateGraph(value, catalog));
    assert.equal(validateGraph(value, catalog).issues[0].code, bad === undefined || bad === Infinity ? 'INVALID_GRAPH' : 'INVALID_TIMEOUT_POLICY');
    assert.throws(() => createGraph().add('x', node, { taskTimeoutMs: bad }), { code: 'INVALID_TIMEOUT_POLICY' });
  }
  for (const bad of [{ ...retry, maxRetries: 0 }, { ...retry, maxRetries: 6 }, { ...retry, maxRetries: 1.5 },
    { ...retry, idempotent: false }, { ...retry, codes: [] }, { ...retry, codes: ['TASK_ACTIVE'] },
    { ...retry, codes: ['TIMEOUT'] }, { ...retry, codes: ['CONTRACT_ID_CONFLICT'] }, { ...retry, codes: ['A', 'A'] }, { ...retry, codes: ['bad'] },
    { ...retry, codes: [1] }, { ...retry, codes: Array.from({ length: 17 }, (_, i) => 'E' + i) },
    { ...retry, delayMs: -1 }, { ...retry, settleTimeoutMs: -1 }, { ...retry, extra: true }]) {
    assert.throws(() => createGraph().add('x', node, { retry: bad }), { code: 'INVALID_TIMEOUT_POLICY' });
    const value = { ...spec, nodes: [{ ...spec.nodes[0], retry: bad }] };
    const verdict = validateGraph(value, catalog);
    assert.deepEqual(compileGraph(value, { 'policy@1': node }), verdict);
    assert(verdict.issues.some(issue => issue.code === 'INVALID_TIMEOUT_POLICY' && issue.path === '$.nodes[0].retry'));
  }
  assert.throws(() => createGraph().add('x', node, { other: true }), { code: 'INVALID_TIMEOUT_POLICY' });
  assert.throws(() => startNetwork(graphFor(node, { retry: { ...retry, delayMs: 30 } }), { timeoutMs: 20 }), { code: 'INVALID_TIMEOUT_POLICY' });
  assert.throws(() => startNetwork(graphFor(node, { retry: { ...retry, settleTimeoutMs: 30 } }), { timeoutMs: 20 }), { code: 'INVALID_TIMEOUT_POLICY' });
});
test('retry policy data validation never invokes array accessors', () => {
  let reads = 0;
  const codes = ['TEMPORARY']; Object.defineProperty(codes, '0', { get() { reads++; return 'TEMPORARY'; } });
  const node = component('accessors', () => async () => {}, {}, {});
  assert.throws(() => createGraph().add('node', node, { retry: { ...retry, codes } }), { code: 'INVALID_TIMEOUT_POLICY' });
  assert.equal(reads, 0);
});
