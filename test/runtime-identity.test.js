const { test } = require('node:test');
const { assert, number, deferred, component, single, echo, packet, createGraph, compileGraph, startNetwork } = require('./runtime-fixture.cjs');

test('bounded ledger covers queued, concurrent inputs, completed work and capacity', async () => {
  const gate = deferred(); let exposures = 0;
  const n = component('two', () => async ctx => { await gate.promise;
    for (const input of [ctx.inputs.a, ctx.inputs.b]) for await (const p of input) { exposures++; assert.equal(p.value, 1); }
  }, { a: number, b: number }, {});
  const run = startNetwork(single(n), { executionRecordLimit: 1 }), p = packet(1);
  await run.send('a', p);
  await assert.rejects(run.send('b', p), { code: 'DUPLICATE_PACKET' });
  await assert.rejects(run.send('b', packet(1)), { code: 'EXECUTION_CAPACITY' });
  run.finish(); gate.resolve(); assert.equal((await run.done).status, 'completed'); assert.equal(exposures, 1);
  const live = startNetwork(single(component('echo', echo)), { executionRecordLimit: 1 });
  const reader = live.outputs.out[Symbol.asyncIterator](); await live.send('in', p); await reader.next();
  await assert.rejects(live.send('in', p), { code: 'DUPLICATE_PACKET' });
  const finish = live.finish(); await reader.next(); assert.equal((await finish).status, 'completed');
});
test('parked reservations are atomic across inputs and overlap precedes validation', async () => {
  const gate = deferred();
  const node = component('blocked', () => async () => { await gate.promise; }, { a: number, b: number }, {});
  const run = startNetwork(single(node), { executionRecordLimit: 17 });
  for (let i = 0; i < 16; i++) await run.send('a', packet(i));
  const p = packet(17), pending = run.send('a', p);
  const rejected = assert.rejects(pending, { code: 'RUN_TERMINATED' });
  await assert.rejects(run.send('a', {}), { code: 'CONCURRENT_SEND' });
  await assert.rejects(run.send('b', p), { code: 'DUPLICATE_PACKET' });
  await assert.rejects(run.send('b', packet(18)), { code: 'EXECUTION_CAPACITY' });
  assert.equal(run.snapshot().channels[0].pendingSend, true);
  run.cancel(); gate.resolve(); await rejected;
  assert.equal(run.snapshot().channels[0].queued, 0); assert.equal(run.snapshot().channels[0].discarded, 16);
});
test('internal duplicate and ledger exhaustion fail before downstream exposure', async () => {
  for (const limit of [1, 10]) {
    let delivered = 0;
    const source = component('source', () => async ctx => {
      const p = packet(1); await ctx.send('out', p); await ctx.send('out', p);
    }, {}, { out: number });
    const sink = component('sink', () => async ctx => { for await (const p of ctx.inputs.in) { void p; delivered++; } }, { in: number }, {});
    const graph = createGraph(), a = graph.add('source', source), b = graph.add('sink', sink);
    graph.connect(a, 'out', b, 'in');
    const run = startNetwork(compileGraph(graph.toSpec(), { 'source@1': source, 'sink@1': sink }).graph, { executionRecordLimit: limit });
    assert.deepEqual(await run.done, { status: 'failed', code: 'DUPLICATE_PACKET', nodeId: 'source' });
    assert(delivered <= 1);
  }
  const source = component('capacity-source', () => async ctx => {
    for await (const p of ctx.inputs.in) await ctx.send('out', p);
  });
  const sink = component('capacity-sink', () => async ctx => { for await (const p of ctx.inputs.in) { void p; assert.fail('must not expose'); } }, { in: number }, {});
  const g = createGraph(), a = g.add('source', source), b = g.add('sink', sink);
  g.exposeInput('in', a, 'in'); g.connect(a, 'out', b, 'in');
  const run = startNetwork(compileGraph(g.toSpec(), { 'capacity-source@1': source, 'capacity-sink@1': sink }).graph, { executionRecordLimit: 1 });
  await run.send('in', packet(1)); assert.deepEqual(await run.done, { status: 'failed', code: 'EXECUTION_CAPACITY', nodeId: 'source' });
});
test('closing ingress drains its parked send and refuses new work as closed', async () => {
  const gate = deferred(); let count = 0;
  const node = component('drain', () => async ctx => {
    await gate.promise; for await (const p of ctx.inputs.in) { void p; count++; }
  }, { in: number }, {});
  const run = startNetwork(single(node));
  for (let i = 0; i < 16; i++) await run.send('in', packet(i));
  const pending = run.send('in', packet(17)); run.closeInput('in');
  await assert.rejects(run.send('in', packet(18)), { code: 'CHANNEL_CLOSED' });
  gate.resolve(); await pending; assert.equal((await run.done).status, 'completed'); assert.equal(count, 17);
});
test('invalid ingress cannot consume a protection record', async () => {
  const node = component('echo', () => async ctx => { for await (const p of ctx.inputs.in) await ctx.send('out', p); });
  const run = startNetwork(single(node), { executionRecordLimit: 1 }), p = packet(1);
  const output = run.outputs.out[Symbol.asyncIterator]();
  await assert.rejects(run.send('in', { ...p, value: 'wrong' }), { code: 'INPUT_CONTRACT' });
  await assert.rejects(run.send('in', { ...p, packetId: 'bad' }), { code: 'INVALID_PACKET' });
  await run.send('in', p); assert.equal((await output.next()).value.packetId, p.packetId);
  const finish = run.finish(); await output.next(); assert.equal((await finish).status, 'completed');
});
