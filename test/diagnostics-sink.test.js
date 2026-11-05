const { test } = require('node:test');
const assert = require('node:assert/strict');
const { attachDiagnosticsSink, packet } = require('../dist/cjs');
const { start, fn, deferred } = require('./diagnostic-fixture');

test('blocked sink keeps aggregate memory bounded and does not block the real flow', async () => {
  const held = deferred(), entered = deferred(), batches = [];
  let calls = 0;
  const { run, output } = start(fn(x => { calls++; return x; }));
  const controller = attachDiagnosticsSink(run, { write: async batch => { batches.push(batch); entered.resolve(); await held.promise; } }, { recordLimit: 4, byteLimit: 65536, batchSize: 2 });
  await run.send('request', packet(1)); await entered.promise;
  for (let i = 2; i <= 5; i++) await run.send('request', packet(i));
  await run.finish(); await output;
  assert.equal(calls, 5); assert.equal((await run.done).status, 'completed');
  const snapshot = controller.snapshot();
  assert.equal(snapshot.queuedRecords + snapshot.inFlightRecords, 4);
  assert.equal(snapshot.pendingWrites, 1); assert(snapshot.droppedRecords > 0);
  held.resolve(); assert.deepEqual(await controller.flush({ timeoutMs: 1000 }), { complete: true });
  assert.equal(controller.snapshot().writtenRecords, 4);
  assert.equal(controller.snapshot().droppedRecords, run.diagnostics().total - 4);
  assert(batches.every(b => b.events.length <= 2));
  await controller.dispose();
});

test('sink failure disables logging without retrying or failing business work', async () => {
  for (const write of [() => { throw Error('PRIVATE'); }, async () => { throw Error('PRIVATE'); }, () => undefined]) {
    let calls = 0, writes = 0;
    const { run, output } = start(fn(x => { calls++; return x; }));
    const controller = attachDiagnosticsSink(run, { write(batch, signal) { writes++; return write(batch, signal); } });
    await run.send('request', packet(1)); await run.finish(); await output;
    assert.equal(calls, 1); assert.equal((await run.done).status, 'completed'); assert.equal(writes, 1);
    assert.equal(controller.snapshot().status, 'disabled'); assert.equal(controller.snapshot().sinkErrors, 1);
    assert(controller.snapshot().droppedRecords > 0);
    assert(!JSON.stringify(controller.snapshot()).includes('PRIVATE'));
    assert.deepEqual(await controller.flush({ timeoutMs: 10 }), { complete: false });
    await controller.dispose(); await controller.dispose(); assert.equal(controller.snapshot().status, 'disposed');
    const replacement = attachDiagnosticsSink(run, { write: async () => {} }); await replacement.dispose();
  }
});

test('dispose releases waiters, aborts and refuses replacement while foreign write remains pending', async () => {
  const held = deferred(), entered = deferred(); let signal, writes = 0;
  const { run, output } = start(fn(x => x));
  const controller = attachDiagnosticsSink(run, { write: async (batch, supplied) => { writes++; signal = supplied; entered.resolve(); await held.promise; } });
  assert.throws(() => attachDiagnosticsSink(run, { write: async () => {} }), { code: 'SINK_ACTIVE' });
  await run.send('request', packet(1)); await entered.promise;
  const flushing = controller.flush({ timeoutMs: 1000 });
  await controller.dispose(); await controller.dispose(); assert(signal.aborted);
  assert.deepEqual(await flushing, { complete: false }); assert.equal(controller.snapshot().pendingWrites, 1);
  assert.throws(() => attachDiagnosticsSink(run, { write: async () => {} }), { code: 'SINK_ACTIVE' });
  const dropped = controller.snapshot().droppedRecords;
  held.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  assert.equal(controller.snapshot().pendingWrites, 0); assert.equal(controller.snapshot().writtenRecords, 0);
  assert.equal(controller.snapshot().droppedRecords, dropped);
  await run.finish(); await output; assert.equal(writes, 1);
  const next = attachDiagnosticsSink(run, { write: async () => {} }); await next.dispose();
});

test('timeout and bounded flush waiters never abort an active write', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const held = deferred(), entered = deferred(); let signal;
  const { run, output } = start(fn(x => x));
  const controller = attachDiagnosticsSink(run, { write: async (batch, supplied) => { signal = supplied; entered.resolve(); await held.promise; } });
  assert.deepEqual(await controller.flush({ timeoutMs: 1 }), { complete: true });
  await run.send('request', packet(1)); await entered.promise;
  for (const value of [null, {}, { timeoutMs: 0 }, { timeoutMs: 60001 }, { timeoutMs: 1, extra: true }, { timeoutMs: Infinity }]) {
    assert.throws(() => controller.flush(value), { code: 'INVALID_ARGUMENT' });
  }
  const pending = Array.from({ length: 64 }, () => controller.flush({ timeoutMs: 10 }));
  assert.throws(() => controller.flush({ timeoutMs: 1 }), { code: 'INVALID_ARGUMENT' });
  t.mock.timers.tick(10); assert((await Promise.all(pending)).every(r => r.complete === false)); assert(!signal.aborted);
  const final = controller.flush({ timeoutMs: 10 }); await controller.dispose(); assert.deepEqual(await final, { complete: false });
  held.resolve(); await run.finish(); await output;
});

test('invalid sink options refuse before subscribing and single-write byte budget includes flight', async () => {
  const { run, output } = start(fn(x => x)); let writes = 0, getters = 0;
  const sink = { write: async () => { writes++; } };
  for (const options of [null, { extra: true }, { recordLimit: 0 }, { recordLimit: 1025 }, { recordLimit: undefined },
    { byteLimit: -1 }, { byteLimit: 1048577 }, { batchSize: 0 }, { batchSize: 33 }, { batchSize: 1.5 },
    { includeCaptures: 1 }, { get byteLimit() { getters++; return 1; } }]) {
    assert.throws(() => attachDiagnosticsSink(run, sink, options), { code: 'INVALID_ARGUMENT' });
  }
  for (const sink of [null, {}, { write: 1 }, { write: async () => {}, extra: true },
    { get write() { getters++; return async () => {}; } }]) assert.throws(() => attachDiagnosticsSink(run, sink), { code: 'INVALID_ARGUMENT' });
  assert.throws(() => attachDiagnosticsSink({}, sink), { code: 'INVALID_ARGUMENT' });
  const controller = attachDiagnosticsSink(run, sink, { byteLimit: 1 });
  await run.send('request', packet(1)); await run.finish(); await output;
  assert.equal(writes, 0); assert.equal(getters, 0); assert.equal(controller.snapshot().queuedBytes, 0);
  assert.equal(controller.snapshot().droppedRecords, run.diagnostics().total); assert(controller.snapshot().droppedBytes > 0);
  await controller.dispose();
});

test('disposed before scheduled delivery causes zero writes; late rejection stays observed', async () => {
  const { run, output } = start(fn(x => x)); let writes = 0;
  const controller = attachDiagnosticsSink(run, { write: async () => { writes++; } });
  const sending = run.send('request', packet(1)); await controller.dispose(); await sending;
  await run.finish(); await output; assert.equal(writes, 0);
  const held = deferred(), entered = deferred();
  const second = start(fn(x => x));
  const rejecting = attachDiagnosticsSink(second.run, { write: async () => { entered.resolve(); await held.promise; throw Error('late'); } });
  await second.run.send('request', packet(1)); await entered.promise; await rejecting.dispose(); held.resolve();
  await second.run.finish(); await second.output;
  assert.equal(rejecting.snapshot().status, 'disposed'); assert.equal(rejecting.snapshot().sinkErrors, 1);
});

test('byte overflow counts serialized records exactly, including the held batch', async () => {
  const held = deferred(), entered = deferred(), batches = [];
  const { run, output } = start(fn(x => x), { diagnostics: { limit: 128 } });
  const controller = attachDiagnosticsSink(run, { write: async batch => { batches.push(batch); entered.resolve(); await held.promise; } },
    { recordLimit: 128, byteLimit: 1024, batchSize: 1 });
  await run.send('request', packet(1)); await entered.promise;
  for (let i = 2; i <= 4; i++) await run.send('request', packet(i));
  await run.finish(); await output;
  const blocked = controller.snapshot();
  assert(blocked.inFlightBytes > 0); assert(blocked.queuedBytes + blocked.inFlightBytes <= 1024);
  assert(blocked.droppedRecords > 0); assert(blocked.queuedRecords + blocked.inFlightRecords < 128);
  held.resolve(); assert.deepEqual(await controller.flush({ timeoutMs: 1000 }), { complete: true });
  const allBytes = run.diagnostics().events.reduce((sum, event) => sum + Buffer.byteLength(JSON.stringify(event) + '\n'), 0);
  assert.equal(controller.snapshot().droppedBytes + controller.snapshot().writtenBytes, allBytes);
  assert.deepEqual(batches.flatMap(b => b.events.map(e => e.sequence)), [...batches.flatMap(b => b.events.map(e => e.sequence))].sort((a, b) => a - b));
  await controller.dispose();
});

test('private recorder subscriptions are bounded and isolate throwing observers', async () => {
  const { observeDiagnosticRecords } = require('../dist/cjs/runtime/diagnostics/records');
  const { run, output } = start(fn(x => x));
  assert.throws(() => observeDiagnosticRecords(() => run.diagnostics(), () => {}), { code: 'INVALID_ARGUMENT' });
  assert.throws(() => observeDiagnosticRecords(run.diagnostics, null), { code: 'INVALID_ARGUMENT' });
  let throws = 0, removedCalls = 0;
  let stopRemoved;
  const first = observeDiagnosticRecords(run.diagnostics, () => { stopRemoved(); throws++; throw Error('observer'); });
  stopRemoved = observeDiagnosticRecords(run.diagnostics, () => removedCalls++);
  const offs = Array.from({ length: 62 }, () => observeDiagnosticRecords(run.diagnostics, () => {}));
  assert.throws(() => observeDiagnosticRecords(run.diagnostics, () => {}), RangeError);
  assert.throws(() => attachDiagnosticsSink(run, { write: async () => {} }), RangeError);
  await run.send('request', packet(1)); await run.finish(); await output;
  assert.equal(throws, 1); assert.equal(removedCalls, 0);
  first(); first(); stopRemoved(); offs.forEach(off => off());
  const sink = attachDiagnosticsSink(run, { write: async () => {} }); await sink.dispose();
});

test('a retired delivery callback cannot enqueue or call its sink again', async () => {
  const { createDelivery } = require('../dist/cjs/diagnostics/delivery');
  const { run, output } = start(fn(x => x));
  await run.send('request', packet(1)); await run.finish(); await output;
  let writes = 0;
  const delivery = createDelivery(run.runId, { write: async () => { writes++; } },
    { recordLimit: 128, byteLimit: 262144, batchSize: 32, includeCaptures: false }, () => {});
  await delivery.controller.dispose(); delivery.record(run.diagnostics().events[0]);
  await Promise.resolve(); assert.equal(writes, 0); assert.equal(delivery.controller.snapshot().queuedRecords, 0);
});
