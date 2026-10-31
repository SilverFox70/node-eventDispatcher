const { test } = require('node:test');
const { assert, component, single, collect, echo, packet, startNetwork, deferred, number, createGraph, compileGraph } = require('./runtime-fixture.cjs');
const { clock } = require('./lifecycle-clock.cjs');

test('bounded immutable metadata has exact counters and no packet history', async () => {
  const run = startNetwork(single(component('echo', echo)), { diagnosticLimit: 2 });
  const before = run.snapshot(), output = collect(run.outputs.out);
  const input = packet(7, { jobId: 'private-job' }); await run.send('in', input); await run.finish(); await output;
  const after = run.snapshot();
  assert.equal(before.status, 'running'); assert.equal(before.channels[0].sent, 0);
  assert.deepEqual(after.channels, [
    { id: 'input:in', capacity: 16, queued: 0, pendingSend: false, sent: 1, received: 1, discarded: 0 },
    { id: 'output:out', capacity: 16, queued: 0, pendingSend: false, sent: 1, received: 1, discarded: 0 },
  ]);
  assert.deepEqual(after.diagnostics.map(d => d.code), ['PROCESS_COMPLETED', 'COMPLETED']);
  assert.deepEqual(after.diagnostics.map(d => d.sequence), [3, 4]);
  assert.deepEqual(after.nodes, [{ id: 'node', status: 'completed' }]);
  assert.throws(() => after.channels.push({}), TypeError); assert(Object.isFrozen(after.diagnostics[0]));
  assert.doesNotMatch(JSON.stringify(after), new RegExp(input.packetId + '|private-job|parentPacketIds|create|value'));
});
test('node states distinguish completed, failed and cancelled siblings', async () => {
  const completed = deferred(), fail = deferred();
  const done = component('done', () => async () => { completed.resolve(); }, {}, {});
  const bad = component('bad', () => async () => { await fail.promise; throw Error('private'); }, {}, {});
  const waiting = component('waiting', () => async ctx => { for await (const p of ctx.inputs.in) { void p; } }, { in: number }, {});
  const graph = createGraph(); graph.add('done', done); graph.add('bad', bad); const w = graph.add('waiting', waiting); graph.exposeInput('in', w, 'in');
  const run = startNetwork(compileGraph(graph.toSpec(), { 'done@1': done, 'bad@1': bad, 'waiting@1': waiting }).graph);
  await completed.promise; await new Promise(globalThis.setImmediate); fail.resolve();
  assert.deepEqual(await run.done, { status: 'failed', code: 'COMPONENT_FAILED', nodeId: 'bad' });
  assert.deepEqual(run.snapshot().nodes, [{ id: 'done', status: 'completed' }, { id: 'bad', status: 'failed' }, { id: 'waiting', status: 'cancelled' }]);
});
test('timeout snapshot preserves immutable first terminal and bounded late diagnostics', async t => {
  const time = clock(t), entered = deferred(), work = deferred(); let context;
  const node = component('late', () => async ctx => { context = ctx; entered.resolve(); await work.promise; await ctx.send('out', packet(2)); }, {}, { out: number });
  const run = startNetwork(single(node), { timeoutMs: 1, diagnosticLimit: 1 }); await entered.promise;
  time.fire(); const terminal = await run.done, snapshot = run.snapshot();
  assert(Object.isFrozen(terminal)); assert.equal(snapshot.status, 'failed'); assert.equal(snapshot.diagnostics[0].code, 'TIMEOUT');
  assert.deepEqual(snapshot.nodes, [{ id: 'node', status: 'cancelled' }]); assert.equal(context.signal.aborted, true);
  work.resolve(); await new Promise(globalThis.setImmediate);
  assert.equal(await run.done, terminal); assert.equal(run.snapshot().diagnostics.length, 1);
  assert.equal(snapshot.diagnostics[0].code, 'TIMEOUT'); assert(run.snapshot().diagnostics[0].sequence > snapshot.diagnostics[0].sequence);
});
test('diagnostic limit boundaries preserve the same terminal contract', async () => {
  const graph = single(component('limits', () => async () => {}, {}, {}));
  for (const diagnosticLimit of [0, 1000]) {
    const run = startNetwork(graph, { diagnosticLimit });
    assert.deepEqual(await run.done, { status: 'completed' });
    assert.equal(run.snapshot().diagnostics.length, diagnosticLimit === 0 ? 0 : 3);
  }
});
