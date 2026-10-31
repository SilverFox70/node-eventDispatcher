const { test } = require('node:test');
const { assert, number, deferred, component, single, echo, packet, startNetwork } = require('./runtime-fixture.cjs');

test('fail process exactly once, cancel and suppress late sends', async () => {
  for (const factory of [() => { throw Error('secret'); }, () => () => { throw Error('secret'); }, () => async () => { throw Error('secret'); }, () => 42]) {
    let calls = 0; const n = component('fail', () => { calls++; return factory(); }, {}, {});
    const run = startNetwork(single(n)); assert.deepEqual(await run.done, { status: 'failed', code: 'COMPONENT_FAILED', nodeId: 'node' });
    assert.equal(calls, 1); assert.doesNotMatch(JSON.stringify(run.snapshot()), /secret/);
  }
  let calls = 0; const n = component('never', () => { calls++; return echo(); });
  const controller = new globalThis.AbortController(); controller.abort();
  const pre = startNetwork(single(n), { signal: controller.signal });
  assert.deepEqual(await pre.done, { status: 'cancelled', code: 'CANCELLED' }); await Promise.resolve(); assert.equal(calls, 0);
  const gate = deferred(), entered = deferred(); let late;
  const lateNode = component('late', () => async ctx => { entered.resolve(); await gate.promise; late = ctx.send('out', packet(1)); await late; }, {}, { out: number });
  const run = startNetwork(single(lateNode)); await entered.promise; run.cancel(); gate.resolve();
  assert.equal((await run.done).status, 'cancelled'); await Promise.resolve(); await Promise.resolve();
  await assert.rejects(late, { code: 'RUN_TERMINATED' });
});
test('returning early and parked sends cannot falsely complete', async () => {
  const early = startNetwork(single(component('early', () => async () => {})));
  assert.deepEqual(await early.done, { status: 'failed', code: 'INPUT_ABANDONED', nodeId: 'node' });
  const n = component('park', () => async ctx => { for (let i = 0; i < 17; i++) { const send = ctx.send('out', packet(i)); if (i < 16) await send; } }, {}, { out: number });
  const parked = startNetwork(single(n));
  assert.deepEqual(await parked.done, { status: 'failed', code: 'UNAWAITED_SEND', nodeId: 'node' });
  assert.equal(parked.snapshot().channels[0].queued, 0);
});
test('process body failure keeps its cause when async iteration closes', async () => {
  const run = startNetwork(single(component('body-fails', () => async ctx => {
    for await (const p of ctx.inputs.in) { void p; throw Error('private failure'); }
  })));
  await run.send('in', packet(1));
  assert.deepEqual(await run.done, { status: 'failed', code: 'COMPONENT_FAILED', nodeId: 'node' });
});
test('parent abort and consumer abandonment settle owned reads', async () => {
  const controller = new globalThis.AbortController();
  const run = startNetwork(single(component('echo', echo)), { signal: controller.signal });
  const reader = run.outputs.out[Symbol.asyncIterator](); const waiting = reader.next();
  const rejected = assert.rejects(waiting, { code: 'RUN_TERMINATED' });
  controller.abort(); await rejected; assert.equal((await run.done).status, 'cancelled');
  const abandoned = startNetwork(single(component('echo', echo)));
  const output = abandoned.outputs.out[Symbol.asyncIterator](); await output.return();
  assert.deepEqual(await abandoned.done, { status: 'failed', code: 'INPUT_ABANDONED' });
  assert.deepEqual(await output.return(), { done: true, value: undefined });
});
test('EOF, caught send refusals, normal loop breaks and draining status', async () => {
  const run = startNetwork(single(component('caught', () => async ctx => {
    await assert.rejects(ctx.send('missing', packet(1)), { code: 'UNKNOWN_PORT' });
    for await (const p of ctx.inputs.in) await ctx.send('out', p);
  })));
  const iterator = run.outputs.out[Symbol.asyncIterator]();
  await run.send('in', packet(1)); await iterator.next(); const done = run.finish(); await iterator.next(); await done;
  assert.deepEqual(await iterator.next(), { done: true, value: undefined });
  const breaking = startNetwork(single(component('break', () => async ctx => { for await (const p of ctx.inputs.in) { void p; break; } })));
  await breaking.send('in', packet(1)); assert.equal((await breaking.done).code, 'INPUT_ABANDONED');
  const gate = deferred(), slow = startNetwork(single(component('slow', () => async ctx => {
    for await (const p of ctx.inputs.in) { void p; } await gate.promise;
  }, { in: number }, {})));
  const finish = slow.finish(); assert.equal(slow.snapshot().status, 'draining'); gate.resolve(); await finish;
});
test('cancellation between handoff and exposure rejects the owned read', async () => {
  const gate = deferred(); let run;
  const source = component('handoff', () => async ctx => {
    await gate.promise; await assert.rejects(ctx.send('missing', packet(1)), { code: 'UNKNOWN_PORT' });
    const sent = ctx.send('out', packet(1)); run.cancel(); await sent;
  }, {}, { out: number });
  run = startNetwork(single(source)); const reader = run.outputs.out[Symbol.asyncIterator]();
  const rejected = assert.rejects(reader.next(), { code: 'RUN_TERMINATED' }); gate.resolve(); await rejected;
  await assert.rejects(reader.next(), { code: 'RUN_TERMINATED' }); assert.equal((await run.done).status, 'cancelled');
});
test('ignored pending reads settle without unhandled rejections on failure', async () => {
  const node = component('ignored-read', () => async ctx => { void ctx.inputs.in[Symbol.asyncIterator]().next(); });
  const run = startNetwork(single(node));
  assert.deepEqual(await run.done, { status: 'failed', code: 'INPUT_ABANDONED', nodeId: 'node' });
  await new Promise(globalThis.setImmediate);
});
test('failure preserves previously consumed output without replay', async () => {
  const gate = deferred(); let calls = 0;
  const node = component('partial', () => { calls++; return async ctx => {
    await ctx.send('out', packet(1)); await gate.promise; throw Error('failure after output');
  }; }, {}, { out: number });
  const run = startNetwork(single(node)), iterator = run.outputs.out[Symbol.asyncIterator]();
  assert.equal((await iterator.next()).value.value, 1); gate.resolve();
  assert.deepEqual(await run.done, { status: 'failed', code: 'COMPONENT_FAILED', nodeId: 'node' });
  await assert.rejects(iterator.next(), { code: 'RUN_TERMINATED' });
  assert.equal(calls, 1); assert.equal(run.snapshot().channels[0].received, 1);
});
