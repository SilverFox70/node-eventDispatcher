const { test } = require('node:test');
const assert = require('node:assert/strict');
const { defineComponent, contract, packet, createGraph, compileGraph, startNetwork, RuntimeValidationError } = require('../dist/cjs');
const { z } = require('zod');
function setup(schema = z.number(), handler) {
  const numeric = contract('value@1', schema);
  const node = defineComponent({ id: 'check', version: 1, title: 'Check', description: '',
    in: { in: numeric }, out: { out: numeric }, create: () => handler ?? (async ctx => {
      for await (const p of ctx.inputs.in) await ctx.send('out', p);
    }) });
  const g = createGraph(), n = g.add('node', node); g.exposeInput('in', n, 'in'); g.exposeOutput('out', n, 'out');
  return startNetwork(compileGraph(g.toSpec(), { 'check@1': node }).graph);
}
test('runtime validates both sides and returns attributed backend verdict', async () => {
  const run = setup(); const iterator = run.outputs.out[Symbol.asyncIterator]();
  let error;
  try { await run.send('in', packet('secret-value')); } catch (caught) { error = caught; }
  assert(error instanceof RuntimeValidationError);
  assert.equal(error.code, 'INPUT_CONTRACT');
  assert.deepEqual(error.validation, { runId: run.runId, nodeId: 'node', port: 'in', direction: 'input',
    componentId: 'check', componentVersion: 1, contractId: 'value@1', representationId: 'json@1',
    issues: [{ code: 'invalid_type', path: [] }], truncated: false });
  assert(Object.isFrozen(error.validation.issues[0].path));
  assert.equal(run.snapshot().channels[0].sent, 0);
  await run.send('in', packet(3)); assert.equal((await iterator.next()).value.value, 3);
  const finish = run.finish(); await iterator.next(); assert.equal((await finish).status, 'completed');
  assert.doesNotMatch(JSON.stringify(run.snapshot()), /secret-value/);
  const bad = setup(z.number(), async ctx => {
    for await (const p of ctx.inputs.in) await ctx.send('out', { ...p, value: 'secret-output' });
  });
  const reading = bad.outputs.out[Symbol.asyncIterator]().next(); const refusal = assert.rejects(reading, { code: 'RUN_TERMINATED' });
  await bad.send('in', packet(1));
  assert.deepEqual(await bad.done, { status: 'failed', code: 'OUTPUT_CONTRACT', nodeId: 'node' }); await refusal;
  const snapshot = bad.snapshot(); assert.equal(snapshot.channels[1].sent, 0);
  const detail = snapshot.diagnostics.find(d => d.validation).validation;
  assert.equal(detail.direction, 'output'); assert.equal(detail.runId, bad.runId);
  assert.doesNotMatch(JSON.stringify(snapshot), /secret-output/);
});
test('issue reports have bounded issue counts and property path segments', async () => {
  const long = 'a'.repeat(200), shape = { [long]: z.number() };
  for (let i = 0; i < 20; i++) shape['p' + i] = z.number();
  const run = setup(z.strictObject(shape));
  const value = Object.fromEntries(Object.keys(shape).map(key => [key, 'wrong']));
  await assert.rejects(run.send('in', packet(value)), error => {
    assert.equal(error.validation.issues.length, 16); assert.equal(error.validation.truncated, true);
    assert.equal(error.validation.issues[0].path[0].length, 128); return true;
  });
  run.cancel(); await run.done;
});
test('numeric schema paths and defensive report bounds remain serializable', async t => {
  const array = setup(z.array(z.number()));
  await assert.rejects(array.send('in', packet(['wrong'])), error => {
    assert.deepEqual(error.validation.issues[0].path, [0]); return true;
  }); array.cancel();
  const schema = z.number(), run = setup(schema);
  // Fault injection verifies truncation even if a trusted parser violates its supported profile.
  t.mock.method(schema._zod, 'run', () => ({ value: 1, issues: [{ code: 'x'.repeat(100), path: Array(70).fill('p'), input: 1 }] }));
  await assert.rejects(run.send('in', packet(1)), error => {
    assert.equal(error.validation.issues[0].path.length, 64);
    assert.equal(error.validation.issues[0].code.length, 64); assert.equal(error.validation.truncated, true); return true;
  }); run.cancel();
});
test('invalid internal output reaches no downstream process effect', async () => {
  let effects = 0;
  const numeric = contract('edge@1', z.number());
  const producer = defineComponent({ id: 'producer', version: 1, title: 'Producer', description: '',
    in: { in: numeric }, out: { out: numeric }, create: () => async ctx => {
      for await (const p of ctx.inputs.in) await ctx.send('out', { ...p, value: 'invalid' });
    } });
  const consumer = defineComponent({ id: 'consumer', version: 1, title: 'Consumer', description: '',
    in: { in: numeric }, out: {}, create: () => async ctx => { for await (const p of ctx.inputs.in) { void p; effects++; } } });
  const graph = createGraph(), a = graph.add('producer', producer), b = graph.add('consumer', consumer);
  graph.exposeInput('in', a, 'in'); graph.connect(a, 'out', b, 'in');
  const run = startNetwork(compileGraph(graph.toSpec(), { 'producer@1': producer, 'consumer@1': consumer }).graph);
  await run.send('in', packet(1));
  assert.deepEqual(await run.done, { status: 'failed', code: 'OUTPUT_CONTRACT', nodeId: 'producer' });
  assert.equal(effects, 0); assert.equal(run.snapshot().channels[0].sent, 0);
});
