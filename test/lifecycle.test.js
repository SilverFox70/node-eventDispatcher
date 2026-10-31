const { test } = require('node:test');
const { assert, component, single, deferred, startNetwork, packet, collect, echo } = require('./runtime-fixture.cjs');
const { clock } = require('./lifecycle-clock.cjs');

test('timeout and late completion', async t => {
  const entered = deferred(), work = deferred(); let send;
  const node = component('late', () => async ctx => {
    entered.resolve(); await work.promise; send = ctx.send('out', packet(1)); await send;
  }, {}, { out: require('./runtime-fixture.cjs').number });
  const time = clock(t);
  const run = startNetwork(single(node), { timeoutMs: 10 }); await entered.promise;
  assert.equal(time.timers.size, 1, 'one owned deadline must be scheduled');
  time.fire(); assert.equal(run.snapshot().status, 'failed');
  assert.deepEqual(await run.done, { status: 'failed', code: 'TIMEOUT' });
  work.resolve(); await new Promise(globalThis.setImmediate);
  await assert.rejects(send, { code: 'RUN_TERMINATED' });
  assert.equal(run.snapshot().channels[0].sent, 0); assert.equal(time.timers.size, 0);
  run.cancel(); assert.equal((await run.finish()).code, 'TIMEOUT');
});
test('cancel releases owned resources', async t => {
  const parent = new globalThis.AbortController(), time = clock(t, parent.signal);
  const run = startNetwork(single(component('echo', echo)), { signal: parent.signal, timeoutMs: 100 });
  const waiting = run.outputs.out[Symbol.asyncIterator]().next();
  const refused = assert.rejects(waiting, { code: 'RUN_TERMINATED' });
  assert.equal(time.listeners.size, 1); assert.equal(time.timers.size, 1);
  run.cancel(); run.cancel(); await refused;
  assert.deepEqual(await run.done, { status: 'cancelled', code: 'CANCELLED' });
  assert.equal(time.listeners.size, 0); assert.equal(time.timers.size, 0);
});
test('completed run releases deadline and cannot later fail', async t => {
  const parent = new globalThis.AbortController(), time = clock(t, parent.signal);
  const run = startNetwork(single(component('echo', echo)), { signal: parent.signal, timeoutMs: 10 });
  const output = collect(run.outputs.out); await run.send('in', packet(1)); await run.finish(); await output;
  assert.equal(time.timers.size, 0); assert.equal(time.listeners.size, 0);
  parent.abort(); run.cancel(); assert.deepEqual(await run.done, { status: 'completed' });
});
test('deadline releases blocked reads, sends and parent listeners', async t => {
  const parent = new globalThis.AbortController(), time = clock(t, parent.signal);
  const run = startNetwork(single(component('read', echo)), { signal: parent.signal, timeoutMs: 10 });
  const pending = run.outputs.out[Symbol.asyncIterator]().next(); const rejected = assert.rejects(pending, { code: 'RUN_TERMINATED' });
  await Promise.resolve(); time.fire(); await rejected; assert.equal((await run.done).code, 'TIMEOUT');
  assert.equal(time.timers.size, 0); assert.equal(time.listeners.size, 0);
  assert(run.snapshot().channels.every(c => !c.pendingSend && c.queued === 0));
  const filled = deferred();
  const source = component('write', () => async ctx => {
    for (let i = 0; i < 17; i++) { const sending = ctx.send('out', packet(i)); if (i === 16) filled.resolve(); await sending; }
  }, {}, { out: require('./runtime-fixture.cjs').number });
  const blocked = startNetwork(single(source), { timeoutMs: 20 }); await filled.promise;
  assert.equal(blocked.snapshot().channels[0].pendingSend, true); time.fire();
  assert.equal((await blocked.done).code, 'TIMEOUT');
  assert.equal(blocked.snapshot().channels[0].discarded, 16); assert.equal(blocked.snapshot().channels[0].pendingSend, false);
});
test('late rejection cannot replace timeout or become unhandled', async t => {
  let reject; const entered = deferred();
  const work = new Promise((_, fail) => { reject = fail; });
  const time = clock(t), run = startNetwork(single(component('reject', () => async () => { entered.resolve(); await work; }, {}, {})), { timeoutMs: 1 });
  await entered.promise; time.fire(); const terminal = await run.done;
  reject(Error('secret late error')); await new Promise(globalThis.setImmediate);
  assert.equal(await run.done, terminal); assert.equal(terminal.code, 'TIMEOUT');
  assert.doesNotMatch(JSON.stringify(run.snapshot()), /secret late error/);
});
test('long deadlines are chunked and cancellation disables stale callbacks', async t => {
  const time = clock(t), run = startNetwork(single(component('wait', echo)), { timeoutMs: 2147483650 });
  assert.equal(time.timers.values().next().value.delay, 2147483647);
  time.fire(); assert.equal(run.snapshot().status, 'running'); assert.equal(time.timers.values().next().value.delay, 3);
  time.fire(); assert.equal((await run.done).code, 'TIMEOUT'); assert.equal(time.timers.size, 0);
  const next = startNetwork(single(component('wait', echo)), { timeoutMs: Number.MAX_SAFE_INTEGER });
  const stale = time.timers.values().next().value; next.cancel(); stale.callback();
  assert.equal(time.timers.size, 0); assert.equal((await next.done).code, 'CANCELLED');
});
test('pre-abort and invalid deadline configuration create no owned timers', async t => {
  const parent = new globalThis.AbortController(); parent.abort(); const time = clock(t, parent.signal);
  let factories = 0;
  const graph = single(component('pre', () => { factories++; return async () => {}; }, {}, {}));
  for (const timeoutMs of [0, -1, 1.5, NaN, Infinity, null, undefined, '1', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => startNetwork(graph, { timeoutMs }), { code: 'INVALID_ARGUMENT' });
  }
  const run = startNetwork(graph, { signal: parent.signal, timeoutMs: 1 }); await run.done; await Promise.resolve();
  assert.equal(factories, 0); assert.equal(time.timers.size, 0); assert.equal(time.listeners.size, 0);
});
test('consumer participates in drain', async () => {
  const filled = deferred();
  const node = component('source', () => async ctx => {
    for (let i = 0; i < 17; i++) { const sending = ctx.send('out', packet(i)); if (i === 16) filled.resolve(); await sending; }
  }, {}, { out: require('./runtime-fixture.cjs').number });
  const run = startNetwork(single(node)); await filled.promise;
  assert.deepEqual(run.snapshot().channels[0], { id: 'output:out', queued: 16, capacity: 16, pendingSend: true, sent: 16, received: 0, discarded: 0 });
  const done = run.finish(); assert.equal(done, run.finish()); assert.equal(run.snapshot().status, 'draining');
  const output = await collect(run.outputs.out); assert.deepEqual(output.map(p => p.value), Array.from({ length: 17 }, (_, i) => i));
  assert.deepEqual(await done, { status: 'completed' });
});
test('component failure clears owned resources and first terminal wins', async t => {
  const parent = new globalThis.AbortController(), time = clock(t, parent.signal), gate = deferred();
  const run = startNetwork(single(component('failure', () => async () => { await gate.promise; throw Error('private'); }, {}, {})), { signal: parent.signal, timeoutMs: 10 });
  const stale = time.timers.values().next().value; gate.resolve();
  const terminal = await run.done; assert.equal(terminal.code, 'COMPONENT_FAILED');
  assert.equal(time.listeners.size, 0); assert.equal(time.timers.size, 0);
  parent.abort(); stale.callback(); assert.equal(await run.done, terminal);
});
test('real Node deadline expires an uncooperative asynchronous wait', async () => {
  const run = startNetwork(single(component('never', () => async () => { await new Promise(() => {}); }, {}, {})), { timeoutMs: 1 });
  assert.deepEqual(await run.done, { status: 'failed', code: 'TIMEOUT' });
});
test('early wake reschedules remaining time and delayed wake expires immediately', async t => {
  const time = clock(t), run = startNetwork(single(component('waiting', echo)), { timeoutMs: 10 });
  time.fire(1); assert.equal(time.timers.values().next().value.delay, 9); assert.equal(run.snapshot().status, 'running');
  time.fire(20); assert.equal((await run.done).code, 'TIMEOUT'); assert.equal(time.timers.size, 0);
});
