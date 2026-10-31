const { test } = require('node:test');
const { assert, graphFor, startNetwork, packet, collect } = require('./node-task-fixture.cjs');
const { defineFunction, contract } = require('../dist/cjs');
const { z } = require('zod');
const numeric = contract('function-number@1', z.number());
function node(handler) { return defineFunction({ id: 'function', version: 1, title: 'Function', description: '', input: numeric, output: numeric, handler }); }

test('wrong function output preserves attributed backend validation detail', async () => {
  const run = startNetwork(graphFor(node(() => 'wrong')));
  const output = assert.rejects(collect(run.outputs.out), { code: 'RUN_TERMINATED' });
  await run.send('in', packet(1)); await run.finish(); await output;
  assert.deepEqual(await run.done, { status: 'failed', code: 'OUTPUT_CONTRACT', nodeId: 'node' });
  const report = run.snapshot().diagnostics.find(item => item.validation)?.validation;
  assert(report, 'function output refusal must preserve authoritative backend report');
  assert.equal(report.runId, run.runId); assert.equal(report.nodeId, 'node'); assert.equal(report.port, 'out');
});
test('automatic operation scope preserves metadata, lineage and serial handler order', async () => {
  const { deferred, flush } = require('./node-task-fixture.cjs');
  const gate = deferred(), entered = deferred(); const calls = [], contexts = [];
  const double = node(async (value, ctx) => { calls.push(value); contexts.push(ctx); if (value === 1) { entered.resolve(); await gate.promise; } return value * 2; });
  const run = startNetwork(graphFor(double)), output = collect(run.outputs.out);
  const first = packet(1, { jobId: 'job-42', key: 'x' }), second = packet(2, { jobId: 'job-42', key: 'y' });
  await run.send('in', first); await run.send('in', second); await entered.promise; await flush(); assert.deepEqual(calls, [1]);
  const finish = run.finish(); gate.resolve(); assert.equal((await finish).status, 'completed');
  const values = await output; assert.deepEqual(values.map(p => p.value), [2, 4]);
  assert.deepEqual(values.map(p => p.parentPacketIds), [[first.packetId], [second.packetId]]);
  assert.deepEqual(values.map(p => [p.jobId, p.key]), [['job-42', 'x'], ['job-42', 'y']]);
  assert.notEqual(values[0].packetId, first.packetId); assert.notEqual(contexts[0].attemptId, contexts[1].attemptId);
  assert(contexts.every(ctx => ctx.attempt === 1 && Object.isFrozen(ctx) && Object.isFrozen(ctx.packet.parentPacketIds)));
  assert.deepEqual(Object.keys(contexts[0].packet).sort(), ['version', 'packetId', 'jobId', 'parentPacketIds', 'key'].sort());
  assert.equal(contexts[0].packet.packetId, first.packetId); assert.equal(contexts[0].signal.aborted, true);
});
test('configured retry invokes only the handler and produces one derived result', async () => {
  const { FlowError } = require('../dist/cjs'); const ids = [], signals = []; let calls = 0;
  const retrying = node((value, ctx) => { calls++; ids.push(ctx.attemptId); signals.push(ctx.signal);
    assert.equal(ctx.packet.jobId, 'retry-job'); if (ctx.attempt === 1) throw new FlowError('TEMPORARY'); return value + 1; });
  const run = startNetwork(graphFor(retrying, { retry: { maxRetries: 1, codes: ['TEMPORARY'], delayMs: 0, idempotent: true } }));
  const output = collect(run.outputs.out), input = packet(2, { jobId: 'retry-job' });
  await run.send('in', input); await run.finish(); const values = await output;
  assert.equal(calls, 2); assert.equal(new Set(ids).size, 2); assert.notEqual(signals[0], signals[1]);
  assert.equal(values.length, 1); assert.equal(values[0].value, 3); assert.deepEqual(values[0].parentPacketIds, [input.packetId]);
});
test('function deadlines distinguish local timeout from remaining flow budget', async t => {
  const { clock, deferred, flush } = require('./node-task-fixture.cjs');
  const time = clock(t), entered = deferred(), work = deferred(); let calls = 0;
  const run = startNetwork(graphFor(node(() => { calls++; entered.resolve(); return work.promise; }), { taskTimeoutMs: 5 }), { timeoutMs: 20 });
  const refused = assert.rejects(collect(run.outputs.out), { code: 'RUN_TERMINATED' });
  await run.send('in', packet(1)); await entered.promise;
  time.fire(5, [...time.timers].find(timer => timer.delay === 5));
  assert.deepEqual(await run.done, { status: 'failed', code: 'NODE_TIMEOUT', nodeId: 'node' }); await refused;
  work.resolve(9); await flush(); assert.equal(calls, 1); assert.equal(run.snapshot().channels[1].sent, 0); assert.equal(time.timers.size, 0);
  const started = deferred(), late = deferred();
  const overall = startNetwork(graphFor(node(() => { started.resolve(); return late.promise; }), { taskTimeoutMs: 10 }), { timeoutMs: 10 });
  const output = assert.rejects(collect(overall.outputs.out), { code: 'RUN_TERMINATED' });
  time.advance(8); await overall.send('in', packet(1)); await started.promise; time.fire(2, [...time.timers].find(timer => timer.delay === 10));
  assert.equal((await overall.done).code, 'TIMEOUT'); await output; late.resolve(1); await flush();
});
test('output validation happens after the task, without retrying invalid results', async () => {
  let calls = 0;
  for (const result of ['wrong', undefined, new Date()]) {
    const run = startNetwork(graphFor(node(() => { calls++; return result; }), { retry: { maxRetries: 5, codes: ['TEMPORARY'], delayMs: 0, idempotent: true } }));
    const output = assert.rejects(collect(run.outputs.out), { code: 'RUN_TERMINATED' }); await run.send('in', packet(1)); await run.finish(); await output;
    assert.equal((await run.done).code, 'OUTPUT_CONTRACT'); assert.equal(run.snapshot().channels[1].sent, 0);
    assert(run.snapshot().diagnostics.some(d => d.validation?.direction === 'output'));
  }
  assert.equal(calls, 3);
});
test('plain handler rejection fails once and expected business data remains normal output', async () => {
  let calls = 0; const failed = startNetwork(graphFor(node(() => { calls++; throw Error('private'); })));
  const rejected = assert.rejects(collect(failed.outputs.out), { code: 'RUN_TERMINATED' }); await failed.send('in', packet(1)); await failed.finish(); await rejected;
  assert.equal((await failed.done).code, 'COMPONENT_FAILED'); assert.equal(calls, 1); assert.doesNotMatch(JSON.stringify(failed.snapshot()), /private/);
  const outcome = contract('business@1', z.strictObject({ kind: z.enum(['ok', 'unavailable']) }));
  const business = defineFunction({ id: 'business', version: 1, title: 'Business', description: '', input: numeric, output: outcome,
    handler: () => ({ kind: 'unavailable' }) });
  const run = startNetwork(graphFor(business)), output = collect(run.outputs.out); await run.send('in', packet(1)); await run.finish();
  assert.deepEqual((await output).map(p => p.value), [{ kind: 'unavailable' }]); assert.equal((await run.done).status, 'completed');
});
test('function authoring rejects invalid definitions and captures handler references', async () => {
  const spec = { id: 'capture', version: 1, title: 'Capture', description: '', input: numeric, output: numeric, handler: value => value * 2 };
  const captured = defineFunction(spec); spec.handler = () => 99;
  const run = startNetwork(graphFor(captured)), output = collect(run.outputs.out); await run.send('in', packet(2)); await run.finish();
  assert.equal((await output)[0].value, 4);
  for (const change of [{ handler: null }, { retry: {} }, { input: {} }, { output: {} }]) {
    assert.throws(() => defineFunction({ ...spec, ...change }), { code: 'INVALID_ARGUMENT' });
  }
  let getters = 0;
  assert.throws(() => defineFunction(Object.defineProperty({}, 'handler', { get() { getters++; return () => 1; } })), { code: 'INVALID_ARGUMENT' });
  assert.equal(getters, 0);
});
test('function output validation precedes any downstream effect', async () => {
  const { component, createGraph, compileGraph } = require('./node-task-fixture.cjs'); let effects = 0;
  const bad = node(() => 'wrong');
  const sink = component('sink', () => async ctx => { for await (const p of ctx.inputs.in) { void p; effects++; } }, { in: numeric }, {});
  const graph = createGraph(), a = graph.add('function', bad), b = graph.add('sink', sink); graph.connect(a, 'out', b, 'in'); graph.exposeInput('in', a, 'in');
  const run = startNetwork(compileGraph(graph.toSpec(), { 'function@1': bad, 'sink@1': sink }).graph); await run.send('in', packet(1)); await run.finish();
  assert.equal((await run.done).code, 'OUTPUT_CONTRACT'); assert.equal(effects, 0); assert.equal(run.snapshot().channels[0].sent, 0);
});
test('function input is frozen and send backpressure stops the next handler', async () => {
  const { deferred, flush } = require('./node-task-fixture.cjs'); const full = deferred(); let calls = 0;
  const transform = node(value => { calls++; if (calls === 17) full.resolve(); return value; });
  const run = startNetwork(graphFor(transform));
  for (let i = 0; i < 18; i++) await run.send('in', packet(i));
  await full.promise; await flush(); assert.equal(calls, 17); assert.equal(run.snapshot().channels[1].pendingSend, true);
  const output = collect(run.outputs.out); await run.finish(); assert.equal((await output).length, 18); assert.equal(calls, 18);
  const object = contract('object@1', z.strictObject({ count: z.number() }));
  const immutable = defineFunction({ id: 'immutable', version: 1, title: 'Immutable', description: '', input: object, output: numeric,
    handler: value => { assert(Object.isFrozen(value)); return value.count; } });
  const objRun = startNetwork(graphFor(immutable)), values = collect(objRun.outputs.out); await objRun.send('in', packet({ count: 2 })); await objRun.finish(); assert.equal((await values)[0].value, 2);
});
test('adapter validation uses only owned process attribution and known ports', async () => {
  const { validateProcessOutput } = require('../dist/cjs/runtime/context-validation');
  const { component, deferred } = require('./node-task-fixture.cjs'); const entered = deferred(); let context;
  assert.throws(() => validateProcessOutput({}, 'out', 1), { code: 'INVALID_ARGUMENT' });
  const owner = component('owner', () => async ctx => { context = ctx; entered.resolve(); for await (const p of ctx.inputs.in) { void p; } });
  const run = startNetwork(graphFor(owner)); await entered.promise;
  assert.throws(() => validateProcessOutput(context, 'missing', 1), { code: 'UNKNOWN_PORT' });
  assert.doesNotThrow(() => validateProcessOutput(context, 'out', 1)); run.cancel(); await run.done;
});
test('invalid function input never invokes a handler and valid follow-up succeeds', async () => {
  let calls = 0; const run = startNetwork(graphFor(node(value => { calls++; return value * 2; })));
  const output = collect(run.outputs.out);
  await assert.rejects(run.send('in', packet('wrong')), { code: 'INPUT_CONTRACT' }); assert.equal(calls, 0);
  await run.send('in', packet(2)); await run.finish(); assert.equal((await output)[0].value, 4); assert.equal(calls, 1);
});
test('shared function definition keeps run contexts and validation attribution independent', async () => {
  const seen = [];
  const fn = node((value, context) => { seen.push(context); return value === 1 ? 'wrong' : value * 2; });
  const graph = graphFor(fn), a = startNetwork(graph), b = startNetwork(graph);
  const failed = assert.rejects(collect(a.outputs.out), { code: 'RUN_TERMINATED' }), good = collect(b.outputs.out);
  await Promise.all([a.send('in', packet(1, { jobId: 'job-a' })), b.send('in', packet(2, { jobId: 'job-b' }))]);
  await Promise.all([a.finish(), b.finish()]); await failed;
  assert.equal((await a.done).code, 'OUTPUT_CONTRACT'); assert.equal((await b.done).status, 'completed');
  assert.deepEqual((await good).map(p => [p.value, p.jobId]), [[4, 'job-b']]);
  assert.equal(new Set(seen.map(ctx => ctx.signal)).size, 2);
  assert.deepEqual(seen.map(ctx => ctx.packet.jobId).sort(), ['job-a', 'job-b']);
  assert.equal(a.snapshot().diagnostics.find(d => d.validation).validation.runId, a.runId);
  assert.equal(b.snapshot().diagnostics.some(d => d.validation), false);
});
