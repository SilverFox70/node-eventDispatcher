const { test } = require('node:test');
const assert = require('node:assert/strict');
const { packet } = require('../dist/cjs');
const { start, fn, processNode, deferred } = require('./diagnostic-fixture');
const events = run => run.diagnostics().events;
test('default diagnostics explain failed handler without disclosing its error or payload', async () => {
  const { run, output } = start(fn(() => { throw Error('PRIVATE_PAYLOAD'); }));
  const input = packet({ credential: 'PRIVATE_PAYLOAD' }, { jobId: 'job-A' });
  await run.send('request', input); run.closeInput('request');
  assert.equal((await run.done).status, 'failed'); await output;
  const records = events(run), failure = records.find(e => e.kind === 'attempt-finished');
  assert(failure, 'failed handler must leave a correlated attempt record');
  assert.equal(failure.code, 'COMPONENT_FAILED'); assert.equal(failure.outcome, 'failed');
  const begun = records.find(e => e.kind === 'attempt-started');
  assert.equal(begun.inputs[0].packetId, input.packetId); assert.equal(begun.inputs[0].jobId, 'job-A');
  assert.equal(begun.operationId, failure.operationId); assert.equal(begun.attemptId, failure.attemptId);
  assert(!JSON.stringify(records).includes('PRIVATE_PAYLOAD'));
  assert.equal(records.filter(e => e.kind === 'process-error').length, 0);
});

test('normal flow has ordered immutable actual transfers, no payloads and EX1 unchanged', async () => {
  const { validateDiagnostics } = require('../dist/cjs/model');
  const { run, output } = start(fn(x => x), { trace: { payloads: true }, diagnosticLimit: 0 });
  const input = packet({ secret: 'NOT_IN_METADATA' }, { jobId: 'job-B' });
  let observed = 0, failed = 0;
  const stop = run.onDiagnostics(() => observed++);
  run.onDiagnostics(() => { failed++; throw Error('observer'); });
  await run.send('request', input); run.closeInput('request');
  assert.equal((await run.done).status, 'completed'); const [result] = await output;
  await Promise.resolve(); stop(); stop();
  const snapshot = run.diagnostics(); assert.deepEqual(validateDiagnostics(snapshot), { ok: true });
  assert(Object.isFrozen(snapshot)); assert(Object.isFrozen(snapshot.events));
  assert(observed > 0); assert.equal(failed, 1);
  assert.deepEqual(snapshot.events.map(e => e.kind), ['input-admitted', 'received', 'operation-started', 'attempt-started',
    'attempt-finished', 'operation-finished', 'sent', 'run-terminal']);
  assert.deepEqual(snapshot.events.map(e => e.sequence), Array.from({ length: 8 }, (_, i) => i + 1));
  assert(snapshot.events.every(e => e.runId === run.runId && e.timeMs >= 0 && Object.isFrozen(e)));
  assert(Object.isFrozen(snapshot.events[2].inputs[0]));
  assert.equal(snapshot.events[0].inputName, 'request');
  assert.equal(snapshot.events[6].packet.packetId, result.packetId);
  assert.deepEqual(result.parentPacketIds, [input.packetId]);
  assert(!JSON.stringify(snapshot).includes('NOT_IN_METADATA'));
  assert.equal(run.trace().events.length, 4); assert(run.trace().events.every(e => e.payloadState === 'captured'));
  assert.equal(run.snapshot().diagnostics.length, 0);
});

test('ring defaults, option refusal, retention and observer ownership are independent', async () => {
  let calls = 0;
  const node = fn(x => { calls++; return x; });
  for (const options of [null, { extra: 1 }, { limit: 0 }, { limit: 1025 }, { limit: NaN }, { limit: 1.5 }, { limit: undefined }]) {
    assert.throws(() => start(node, { diagnostics: options }), { code: 'INVALID_ARGUMENT' });
  }
  assert.equal(calls, 0);
  const { run, output } = start(node, { diagnostics: { limit: 2 }, executionRecordLimit: 1 });
  assert.throws(() => run.onDiagnostics(null), TypeError);
  const stops = Array.from({ length: 64 }, () => run.onDiagnostics(() => {}));
  assert.throws(() => run.onDiagnostics(() => {}), RangeError); stops.forEach(stop => stop());
  const input = packet(2); await run.send('request', input);
  await assert.rejects(run.send('request', input), { code: 'DUPLICATE_PACKET' });
  const previous = run.diagnostics(); run.closeInput('request'); await run.done; await output;
  const end = run.diagnostics(); assert.equal(end.events.length, 2); assert.equal(end.total, end.dropped + 2);
  assert(end.events[0].sequence > previous.events[0].sequence); assert.equal(previous.total, previous.dropped + previous.events.length);
  const { run: defaults, output: all } = start(node);
  for (let i = 0; i < 20; i++) await defaults.send('request', packet(i));
  defaults.closeInput('request'); await defaults.done; await all;
  assert.equal(defaults.diagnostics().events.length, 128); assert(defaults.diagnostics().dropped > 0);
});

test('legacy tasks remain node-scoped and process failures are separate from task failures', async () => {
  const { run, output } = start(processNode(() => async ctx => {
    for await (const p of ctx.inputs.in) { await ctx.task(() => {}); await ctx.send('out', p); }
  }));
  await run.send('request', packet(1)); run.closeInput('request'); await run.done; await output;
  assert.deepEqual(events(run).find(e => e.kind === 'operation-started').inputs, []);
  const other = start(processNode(() => { throw Error('hidden factory secret'); }));
  await other.run.done; await other.output;
  assert.deepEqual(events(other.run).map(e => e.kind), ['process-error', 'run-terminal']);
  assert(!JSON.stringify(events(other.run)).includes('hidden factory secret'));
});

test('different jobs have distinct operation correlation and failing input keeps its parents', async () => {
  const { derivePacket } = require('../dist/cjs');
  const root = packet(1, { jobId: 'failing-job' }), child = derivePacket(2, [root]);
  const { run, output } = start(fn(x => { if (x === 2) throw 'secret primitive'; return x; }));
  await run.send('request', packet(0, { jobId: 'good-job' })); await run.send('request', child);
  run.closeInput('request'); await run.done; const values = await output; assert.equal(values.length, 1);
  const starts = events(run).filter(e => e.kind === 'operation-started');
  assert.deepEqual(starts.map(e => e.inputs[0].jobId), ['good-job', 'failing-job']);
  assert.notEqual(starts[0].operationId, starts[1].operationId);
  assert.deepEqual(starts[1].inputs[0].parentPacketIds, [root.packetId]);
  const errors = events(run).filter(e => e.kind === 'attempt-finished' && e.outcome === 'failed');
  assert.equal(errors.length, 1); assert.equal(errors[0].operationId, starts[1].operationId);
  assert(!JSON.stringify(events(run)).includes('secret primitive'));
});

test('cancellation observes each finish once and ignores late handler or process settlement', async () => {
  const entered = deferred(), release = deferred();
  const { run, output } = start(fn(async () => { entered.resolve(); await release.promise; throw Error('late'); }));
  await run.send('request', packet(1)); await entered.promise;
  run.cancel(); await run.done; await output; await Promise.resolve();
  const snapshot = run.diagnostics();
  assert.equal(snapshot.events.filter(e => e.kind === 'attempt-finished').length, 1);
  assert.equal(snapshot.events.find(e => e.kind === 'attempt-finished').outcome, 'cancelled');
  assert.equal(snapshot.events.find(e => e.kind === 'operation-finished').outcome, 'cancelled');
  assert.equal(snapshot.events.at(-1).kind, 'run-terminal');
  release.resolve(); await require('node:timers/promises').setImmediate();
  assert.deepEqual(run.diagnostics(), snapshot);
  const late = deferred(), started = deferred();
  const other = start(processNode(() => async () => { started.resolve(); await late.promise; throw Error('late process'); }));
  await started.promise; other.run.cancel(); await other.run.done; await other.output;
  const before = other.run.diagnostics(); late.resolve(); await require('node:timers/promises').setImmediate();
  assert.deepEqual(other.run.diagnostics(), before);
});
