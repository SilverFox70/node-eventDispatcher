const { test } = require('node:test');
const { assert, component, graphFor, startNetwork, packet, collect, number, deferred, flush, clock } = require('./node-task-fixture.cjs');
const { NodeTimeoutError } = require('../dist/cjs');

test('local timeout routes outside the revoked operation and releases its timer', async t => {
  const time = clock(t), entered = deferred(), work = deferred(); let signal;
  const node = component('route', () => async ctx => {
    try { await ctx.task(context => { signal = context.signal; entered.resolve(); return work.promise; }); }
    catch (error) { assert(error instanceof NodeTimeoutError); assert.equal(error.timeoutMs, 5); await ctx.send('out', packet(9)); }
  }, {}, { out: number });
  const run = startNetwork(graphFor(node, { taskTimeoutMs: 5 }), { timeoutMs: 20 });
  const output = collect(run.outputs.out); await entered.promise;
  const local = [...time.timers].find(timer => timer.delay === 5);
  time.fire(5, local);
  assert.equal((await run.done).status, 'completed');
  assert.deepEqual((await output).map(p => p.value), [9]);
  work.resolve(); await flush(); assert.equal(time.timers.size, 0);
  assert.equal(signal.aborted, true);
});
test('successful operations, scopes and expired descendants', async () => {
  const late = deferred(); let child;
  const node = component('scope', () => async ctx => {
    await assert.rejects(ctx.task(null), { code: 'INVALID_ARGUMENT' });
    const value = await ctx.task(async () => {
      await assert.rejects(ctx.task(() => 0), { code: 'TASK_ACTIVE' });
      await assert.rejects(ctx.send('out', packet(0)), { code: 'TASK_IO_ACCESS' });
      child = (async () => { await late.promise;
        await assert.rejects(ctx.send('out', packet(8)), { code: 'TASK_TERMINATED' });
        await assert.rejects(ctx.task(() => 8), { code: 'TASK_TERMINATED' });
      })();
      return 4;
    });
    late.resolve(); await child; await ctx.send('out', packet(value));
  }, {}, { out: number });
  const run = startNetwork(graphFor(node)), output = collect(run.outputs.out);
  assert.equal((await run.done).status, 'completed'); assert.deepEqual((await output).map(p => p.value), [4]);
});
test('whole flow wins even when a delayed task callback fires first', async t => {
  const time = clock(t), entered = deferred(), work = deferred();
  const node = component('tie', () => async ctx => { entered.resolve(); await ctx.task(() => work.promise); }, {}, {});
  const run = startNetwork(graphFor(node, { taskTimeoutMs: 10 }), { timeoutMs: 10 });
  await entered.promise; await flush();
  time.fire(10, [...time.timers][1]); assert.deepEqual(await run.done, { status: 'failed', code: 'TIMEOUT' });
  work.resolve(); await flush(); assert.equal(time.timers.size, 0);
});
test('remaining flow ceiling and uncaught local timeout have distinct outcomes', async t => {
  const time = clock(t), start = deferred(), entered = deferred(), work = deferred();
  const node = component('remaining', () => async ctx => { await start.promise; await ctx.task(() => { entered.resolve(); return work.promise; }); }, {}, {});
  const run = startNetwork(graphFor(node, { taskTimeoutMs: 3 }), { timeoutMs: 10 });
  time.advance(8); start.resolve(); await entered.promise;
  time.fire(2, [...time.timers].find(timer => timer.delay === 10));
  assert.deepEqual(await run.done, { status: 'failed', code: 'TIMEOUT' }); work.resolve(); await flush();
  const localStart = deferred(), stalled = deferred();
  const local = startNetwork(graphFor(component('fatal', () => async ctx => {
    await ctx.task(() => { localStart.resolve(); return stalled.promise; });
  }, {}, {}), { taskTimeoutMs: 2 }));
  await localStart.promise; time.fire(2);
  assert.deepEqual(await local.done, { status: 'failed', code: 'NODE_TIMEOUT', nodeId: 'node' }); stalled.resolve(); await flush();
});
test('task IO guards cover stream reads, return and public run mutation', async () => {
  let run; const late = deferred(), entered = deferred(); let child;
  const node = component('read-guard', () => async ctx => {
    for await (const p of ctx.inputs.in) {
      const value = await ctx.task(async () => {
        const input = ctx.inputs.in[Symbol.asyncIterator]();
        await assert.rejects(input.next(), { code: 'TASK_IO_ACCESS' });
        await assert.rejects(input.return(), { code: 'TASK_IO_ACCESS' });
        assert.throws(() => run.finish(), { code: 'TASK_IO_ACCESS' });
        assert.throws(() => run.cancel(), { code: 'TASK_IO_ACCESS' });
        await assert.rejects(run.send('in', p), { code: 'TASK_IO_ACCESS' });
        child = (async () => { await late.promise; await assert.rejects(input.next(), { code: 'TASK_TERMINATED' }); await assert.rejects(input.return(), { code: 'TASK_TERMINATED' }); })();
        return p.value;
      });
      entered.resolve(); late.resolve(); await child; await ctx.send('out', packet(value));
    }
  });
  run = startNetwork(graphFor(node)); const output = collect(run.outputs.out); await run.send('in', packet(2)); await entered.promise;
  await run.finish(); assert.deepEqual((await output).map(p => p.value), [2]);
});
test('idle and downstream backpressure do not consume operation budgets', async t => {
  const time = clock(t), idle = deferred(), full = deferred();
  const node = component('idle', () => async ctx => {
    await idle.promise;
    for (let i = 0; i < 17; i++) {
      const value = await ctx.task(() => i); const sent = ctx.send('out', packet(value));
      if (i === 16) full.resolve(); await sent;
    }
  }, {}, { out: number });
  const run = startNetwork(graphFor(node, { taskTimeoutMs: 1 })); time.advance(100); idle.resolve(); await full.promise;
  assert.equal(time.timers.size, 0); time.advance(100); assert.equal(run.snapshot().status, 'running');
  const result = await collect(run.outputs.out); assert.equal(result.length, 17); assert.equal((await run.done).status, 'completed');
});
test('cancellation before task invocation starts no handler and clears ownership', async t => {
  const time = clock(t); let calls = 0, run;
  const node = component('cancel-now', () => async ctx => { const pending = ctx.task(() => { calls++; return 1; }); run.cancel(); await pending; }, {}, {});
  run = startNetwork(graphFor(node, { taskTimeoutMs: 10 })); assert.equal((await run.done).status, 'cancelled');
  await flush(); assert.equal(calls, 0); assert.equal(time.timers.size, 0);
});
test('late local completion checks the monotonic budget before accepting a value', async t => {
  const time = clock(t);
  const node = component('late-value', () => async ctx => {
    await assert.rejects(ctx.task(() => { time.advance(3); return 4; }), { code: 'NODE_TIMEOUT' });
    assert.equal(await ctx.task(() => 5), 5);
  }, {}, {});
  const run = startNetwork(graphFor(node, { taskTimeoutMs: 2 })); assert.equal((await run.done).status, 'completed'); assert.equal(time.timers.size, 0);
});
test('active operation has one owner and a new run has independent task state', async () => {
  const entered = deferred(), work = deferred();
  const node = component('busy', () => async ctx => {
    const pending = ctx.task(() => { entered.resolve(); return work.promise; });
    await assert.rejects(ctx.task(() => 2), { code: 'TASK_ACTIVE' }); await pending;
  }, {}, {});
  const graph = graphFor(node), a = startNetwork(graph), b = startNetwork(graph); await entered.promise; work.resolve();
  assert.equal((await a.done).status, 'completed'); assert.equal((await b.done).status, 'completed');
  assert.notEqual(a.runId, b.runId);
});
test('unawaited operations cannot falsely complete the flow', async () => {
  const work = deferred();
  const node = component('unawaited', () => async ctx => { void ctx.task(() => work.promise); }, {}, {});
  const run = startNetwork(graphFor(node));
  assert.deepEqual(await run.done, { status: 'failed', code: 'UNAWAITED_TASK', nodeId: 'node' });
  work.resolve(); await flush();
});
test('outer task calls after termination and late handler results cannot revive a flow', async t => {
  const time = clock(t); let context;
  const entered = deferred(), work = deferred();
  const node = component('terminated', () => async ctx => { context = ctx; entered.resolve(); await work.promise; }, {}, {});
  const run = startNetwork(graphFor(node)); await entered.promise; run.cancel();
  await assert.rejects(context.task(() => 1), { code: 'RUN_TERMINATED' }); work.resolve(); await flush();
  const slow = component('late-flow-result', () => async ctx => { await ctx.task(() => { time.advance(3); return 1; }); }, {}, {});
  const expired = startNetwork(graphFor(slow), { timeoutMs: 2 });
  assert.deepEqual(await expired.done, { status: 'failed', code: 'TIMEOUT' }); assert.equal(time.timers.size, 0);
});
