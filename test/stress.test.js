const { test } = require('node:test');
const assert = require('node:assert/strict');
const { measure, observeChannels, loadGraph, startNetwork, yieldTurn } = require('../benchmark/flow-fixture.cjs');
const { deferred } = require('./runtime-fixture.cjs');
const { clock } = require('./lifecycle-clock.cjs');

for (const kind of ['pipeline', 'fork-join']) {
  for (const capacity of [1, 16]) {
    test(`bounded sustained pipeline: ${kind}, 100000 packets, capacity ${capacity}`, async t => {
      const result = await measure(kind, 100000, capacity);
      assert.equal(result.count, 100000);
      assert.equal(result.heapSamples.length, 11);
      t.diagnostic(JSON.stringify(result));
    });
  }
}

for (const cancel of [false, true]) {
  test(`bounded sustained pipeline: capacity2 controlled slow sink, ${cancel ? 'abort' : 'finish'}`, async t => {
    const controller = new globalThis.AbortController(), timer = clock(t, controller.signal);
    const monitor = observeChannels(), gate = deferred(), entered = deferred();
    t.after(() => monitor.restore());
    const { graph, totals } = loadGraph('pipeline', 100000, 2, { pause: () => { entered.resolve(); return gate.promise; } });
    const run = startNetwork(graph, { signal: controller.signal, timeoutMs: 60000, executionRecordLimit: 1048576 });
    t.after(() => { run.cancel(); gate.resolve(); });
    await entered.promise; await yieldTurn();
    assert(monitor.records.some(r => r.channel.stats().pendingSend));
    assert(monitor.records.some(r => r.highWater === 2));
    assert.equal(totals.count, 1);
    if (cancel) controller.abort();
    gate.resolve();
    assert.equal((await run.done).status, cancel ? 'cancelled' : 'completed'); await yieldTurn();
    assert.equal(totals.count, cancel ? 1 : 100000);
    if (!cancel) assert.equal(totals.sum, 5000250000);
    monitor.assertClean(); assert.equal(timer.timers.size, 0); assert.equal(timer.listeners.size, 0);
  });
}
