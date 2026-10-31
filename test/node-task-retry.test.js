const { test } = require('node:test');
const { assert, component, graphFor, startNetwork, packet, collect, number, deferred, flush, clock } = require('./node-task-fixture.cjs');
const { FlowError } = require('../dist/cjs');
const retry = (maxRetries, extra = {}) => ({ maxRetries, codes: ['TEMPORARY'], delayMs: 0, idempotent: true, ...extra });

test('explicit retry limits keep distinct attempt identities and one packet execution', async () => {
  for (const retries of [1, 5]) {
    const attempts = [], identities = new Set();
    const node = component('retry', () => async ctx => {
      for await (const p of ctx.inputs.in) {
        const value = await ctx.task(attempt => {
          attempts.push(attempt.attempt); identities.add(attempt.attemptId);
          if (attempt.attempt <= retries) throw new FlowError('TEMPORARY');
          return p.value * 2;
        });
        await ctx.send('out', require('../dist/cjs').derivePacket(value, [p]));
      }
    });
    const run = startNetwork(graphFor(node, { retry: retry(retries) })), output = collect(run.outputs.out), p = packet(2, { jobId: 'job-42', key: 'x' });
    await run.send('in', p); await assert.rejects(run.send('in', p), { code: 'DUPLICATE_PACKET' });
    await run.finish(); const result = await output;
    assert.deepEqual(attempts, Array.from({ length: retries + 1 }, (_, i) => i + 1)); assert.equal(identities.size, retries + 1);
    assert.equal(result.length, 1); assert.equal(result[0].value, 4); assert.equal(result[0].jobId, p.jobId); assert.equal(result[0].key, 'x');
    assert.deepEqual(result[0].parentPacketIds, [p.packetId]);
  }
});
test('no policy, unmatched errors and exhausted retries preserve explicit failure', async () => {
  for (const [policy, expected] of [[{}, 1], [{ retry: retry(2, { codes: ['OTHER'] }) }, 1], [{ retry: retry(2) }, 3], [{ retry: retry(5) }, 6]]) {
    let calls = 0;
    const node = component('failure', () => async ctx => {
      await assert.rejects(ctx.task(() => { calls++; throw new FlowError('TEMPORARY'); }), { code: 'TEMPORARY' });
    }, {}, {});
    const run = startNetwork(graphFor(node, policy)); await run.done;
    assert.equal(calls, expected);
  }
});
test('cooperative timeout settles before retry and uses configured backoff', async t => {
  const time = clock(t), entered = deferred(); let calls = 0;
  const node = component('cooperate', () => async ctx => {
    const value = await ctx.task(({ signal, attempt }) => {
      calls++; if (attempt === 2) return 9;
      entered.resolve(); return new Promise((_, reject) => signal.addEventListener('abort', () => reject(Error('cancelled')), { once: true }));
    });
    await ctx.send('out', packet(value));
  }, {}, { out: number });
  const run = startNetwork(graphFor(node, { taskTimeoutMs: 5, retry: retry(1, { codes: ['NODE_TIMEOUT'], delayMs: 3, settleTimeoutMs: 10 }) })), output = collect(run.outputs.out);
  await entered.promise; time.fire(5); await flush(); assert.equal(calls, 1);
  assert.equal(time.timers.values().next().value.delay, 3); time.fire(3);
  assert.equal((await run.done).status, 'completed'); assert.deepEqual((await output).map(p => p.value), [9]); assert.equal(calls, 2); assert.equal(time.timers.size, 0);
});
test('uncooperative timeout cannot overlap replacement work', async t => {
  const time = clock(t), entered = deferred(), work = deferred(); let calls = 0;
  const node = component('uncooperative', () => async ctx => {
    await assert.rejects(ctx.task(() => { calls++; entered.resolve(); return work.promise; }), { code: 'NODE_TIMEOUT' });
    await assert.rejects(ctx.task(() => 2), { code: 'TASK_ACTIVE' });
    work.resolve(); await flush(); assert.equal(await ctx.task(() => 3), 3);
  }, {}, {});
  const run = startNetwork(graphFor(node, { taskTimeoutMs: 5, retry: retry(1, { codes: ['NODE_TIMEOUT'], settleTimeoutMs: 4 }) }));
  await entered.promise; time.fire(5); await flush(); time.fire(4);
  assert.equal((await run.done).status, 'completed'); assert.equal(calls, 1); assert.equal(time.timers.size, 0);
});
test('whole flow interrupts backoff and cancellation settlement', async t => {
  const time = clock(t), entered = deferred(); let calls = 0;
  const node = component('backoff', () => async ctx => { await ctx.task(() => { calls++; entered.resolve(); throw new FlowError('TEMPORARY'); }); }, {}, {});
  const run = startNetwork(graphFor(node, { retry: retry(5, { delayMs: 10 }) }), { timeoutMs: 10 });
  await entered.promise; await flush(); time.fire(10);
  assert.deepEqual(await run.done, { status: 'failed', code: 'TIMEOUT' }); assert.equal(calls, 1); assert.equal(time.timers.size, 0);
  const pending = deferred(), started = deferred();
  const second = component('settle', () => async ctx => { await ctx.task(() => { started.resolve(); return pending.promise; }); }, {}, {});
  const stopped = startNetwork(graphFor(second, { taskTimeoutMs: 3, retry: retry(1, { codes: ['NODE_TIMEOUT'], settleTimeoutMs: 10 }) }), { timeoutMs: 10 });
  await started.promise; time.fire(3, [...time.timers].find(timer => timer.delay === 3)); await flush(); time.fire(7, [...time.timers].find(timer => timer.delay === 10));
  assert.deepEqual(await stopped.done, { status: 'failed', code: 'TIMEOUT' }); pending.resolve(); await flush(); assert.equal(time.timers.size, 0);
});
test('late settled timeout can retry within grace, but zero grace never waits', async t => {
  const time = clock(t);
  for (const grace of [0, 4]) {
    const entered = deferred(), work = deferred(); let calls = 0;
    const node = component('grace', () => async ctx => {
      const operation = ctx.task(() => { calls++; if (calls === 2) return 9; entered.resolve(); return work.promise; });
      if (grace === 0) {
        await assert.rejects(operation, { code: 'NODE_TIMEOUT' }); work.resolve();
      } else {
        assert.equal(await operation, 9);
      }
    }, {}, {});
    const run = startNetwork(graphFor(node, { taskTimeoutMs: 2, retry: retry(1, { codes: ['NODE_TIMEOUT'], ...(grace ? { settleTimeoutMs: grace } : {}) }) }));
    await entered.promise; time.fire(2); await flush();
    if (grace) { assert.equal(time.timers.size, 1); work.resolve(); }
    assert.equal((await run.done).status, 'completed'); assert.equal(calls, grace ? 2 : 1); assert.equal(time.timers.size, 0);
  }
});
test('retry classification never evaluates error code getters or proxies', async () => {
  let reads = 0;
  const errors = [null, new Proxy({}, { getOwnPropertyDescriptor() { reads++; throw Error('trap'); } }),
    Object.defineProperty({}, 'code', { get() { reads++; return 'TEMPORARY'; } })];
  for (const error of errors) {
    let calls = 0;
    const node = component('classify', () => async ctx => {
      try { await ctx.task(() => { calls++; throw error; }); assert.fail('must reject'); }
      catch (actual) { assert.equal(actual, error); }
    }, {}, {});
    const run = startNetwork(graphFor(node, { retry: retry(1) })); await run.done; assert.equal(calls, 1);
  }
  assert.equal(reads, 0);
});
test('elapsed backoff setup clears its timer without leaking or overlapping', async t => {
  const { performance } = require('node:perf_hooks'); const time = clock(t); let now = 0;
  t.mock.method(performance, 'now', () => ++now);
  let calls = 0;
  const node = component('elapsed-delay', () => async ctx => {
    await assert.rejects(ctx.task(() => { calls++; throw new FlowError('TEMPORARY'); }), { code: 'TEMPORARY' });
  }, {}, {});
  const run = startNetwork(graphFor(node, { retry: retry(1, { delayMs: 1 }) }));
  await run.done; assert.equal(calls, 2); assert.equal(time.timers.size, 0);
});
test('flow expiry between failure classification and retry prevents extra invocation', async t => {
  const { performance } = require('node:perf_hooks'); const time = clock(t); let advance = false, now = 0, calls = 0;
  t.mock.method(performance, 'now', () => advance ? ++now : 0);
  const node = component('edge', () => async ctx => { await ctx.task(() => { calls++; advance = true; throw new FlowError('TEMPORARY'); }); }, {}, {});
  const run = startNetwork(graphFor(node, { retry: retry(1) }), { timeoutMs: 3 });
  assert.deepEqual(await run.done, { status: 'failed', code: 'TIMEOUT' }); assert.equal(calls, 1); assert.equal(time.timers.size, 0);
});
