const { test } = require('node:test');
const assert = require('node:assert/strict');
const { packet } = require('../dist/cjs');
const { start, fn } = require('./diagnostic-fixture');
test('host policy captures only selected future input transfers without restarting', async () => {
  const { run, output } = start(fn(value => value), { capturePolicy: { allowedNodes: ['worker'], denyInputs: [], denyOutputs: ['worker'], maxPayloadBytes: 64, maxSessionMs: 1000 } });
  const session = run.openDiagnosticsSession({ rules: [{ nodeId: 'worker', inputs: true, outputs: true, jobIds: ['job-A'] }], expiresInMs: 1000 });
  await run.send('request', packet('hello', { jobId: 'job-A' }));
  await run.finish(); await output;
  const captures = run.diagnostics().events.filter(e => e.capture);
  assert(captures.some(e => e.kind === 'received'));
  assert(captures.every(e => e.kind !== 'sent'));
  assert.equal(session.snapshot().status, 'terminated');
});

test('capture sessions are prospective, selective, immutable and preserve EX1', async () => {
  const { validateDiagnostics } = require('../dist/cjs/model');
  const { deferred } = require('./diagnostic-fixture'); const beforeReceived = deferred();
  const { run, output } = start(fn(x => { if (x === 'before') beforeReceived.resolve(); return x; }), { capturePolicy: policy(), trace: { payloads: true } });
  await run.send('request', packet('before', { jobId: 'job-A' })); await beforeReceived.promise;
  const session = run.openDiagnosticsSession({ rules: [rule({ ports: ['in'], jobIds: ['job-A'] })], expiresInMs: 1000 });
  await run.send('request', packet({ amount: 12 }, { jobId: 'job-A' }));
  await run.send('request', packet('other-job', { jobId: 'job-B' }));
  await run.finish(); await output;
  const records = run.diagnostics().events, captured = records.filter(e => e.capture);
  assert(captured.some(e => e.kind === 'received' && e.capture.value.amount === 12));
  assert(captured.every(e => e.kind !== 'sent' && e.packet.jobId === 'job-A' && e.capture.value !== 'before'));
  assert.equal(run.trace().payloads, true);
  assert.deepEqual(validateDiagnostics(JSON.parse(JSON.stringify(run.diagnostics()))), { ok: true });
  assert(Object.isFrozen(session.snapshot().events)); assert(Object.isFrozen(captured[0].capture.value));
  assert.equal(session.snapshot().events.length, captured.length);
  assert.throws(() => run.openDiagnosticsSession({ rules: [], expiresInMs: 1 }), { code: 'RUN_TERMINATED' });
});

const policy = (extra = {}) => ({ allowedNodes: ['worker'], denyInputs: [], denyOutputs: [], maxPayloadBytes: 2048, maxSessionMs: 1000, ...extra });
const rule = (extra = {}) => ({ nodeId: 'worker', inputs: true, outputs: true, ...extra });

test('host absence, allowlist and direction denies override requested capture', async () => {
  for (const host of [undefined, policy({ allowedNodes: [] }), policy({ denyInputs: ['worker'], denyOutputs: ['worker'] })]) {
    const { run, output } = start(fn(x => x), host ? { capturePolicy: host } : {});
    const session = run.openDiagnosticsSession({ rules: [rule()], expiresInMs: 1 });
    assert.deepEqual(session.snapshot().effectiveRules, [rule({ inputs: false, outputs: false })]);
    await run.send('request', packet('secret')); await run.finish(); await output;
    assert(!run.diagnostics().events.some(e => e.capture));
  }
});

test('invalid host policy refuses before any factory starts', async () => {
  const { processNode } = require('./diagnostic-fixture'); let factories = 0, getters = 0;
  const node = processNode(() => { factories++; return async () => {}; });
  for (const host of [null, undefined, {}, policy({ surprise: true }), policy({ allowedNodes: ['missing'] }),
    policy({ denyInputs: ['missing'] }), policy({ denyOutputs: ['missing'] }), policy({ maxPayloadBytes: 0 }),
    policy({ maxPayloadBytes: 2049 }), policy({ maxSessionMs: 900001 }), policy({ maxSessionMs: 1.5 }),
    policy({ allowedNodes: ['worker', 'worker'] }), policy({ allowedNodes: new Proxy([], {}) }),
    { ...policy(), get maxPayloadBytes() { getters++; return 1; } }]) {
    assert.throws(() => start(node, { capturePolicy: host }), { code: 'INVALID_ARGUMENT' });
  }
  await Promise.resolve(); assert.equal(factories, 0); assert.equal(getters, 0);
});

test('session validation is atomic, bounded and protects epochs', async () => {
  const { run, output } = start(fn(x => x), { capturePolicy: policy() });
  const invalid = [null, {}, { nodeId: 'missing', inputs: true, outputs: false }, rule({ inputs: 1 }), rule({ ports: ['missing'] }),
    rule({ ports: ['in', 'in'] }), rule({ jobIds: ['bad job'] }), rule({ jobIds: ['A', 'A'] }), rule({ extra: true }), rule({ ports: undefined })];
  for (const value of invalid) assert.throws(() => run.openDiagnosticsSession({ rules: [value], expiresInMs: 1000 }), { code: 'INVALID_ARGUMENT' });
  for (const request of [null, {}, { rules: [], expiresInMs: 0 }, { rules: [], expiresInMs: 1001 },
    { rules: [], expiresInMs: 1, extra: true }, { rules: Array(33).fill(rule()), expiresInMs: 1 },
    { rules: [rule(), rule()], expiresInMs: 1 }, { rules: [rule({ jobIds: Array.from({ length: 257 }, (_, i) => `J${i}`) })], expiresInMs: 1 },
    { rules: [rule({ jobIds: Array.from({ length: 256 }, (_, i) => `J${i}`) }), rule({ jobIds: ['more'], outputs: false })], expiresInMs: 1 }]) {
    assert.throws(() => run.openDiagnosticsSession(request), { code: 'INVALID_ARGUMENT' });
  }
  const session = run.openDiagnosticsSession({ rules: [rule({ inputs: false })], expiresInMs: 1000 });
  const before = session.snapshot();
  assert.throws(() => run.openDiagnosticsSession({ rules: [], expiresInMs: 1 }), { code: 'SESSION_ACTIVE' });
  for (const update of [{ expectedEpoch: 2, rules: [] }, { expectedEpoch: 1, rules: [rule({ ports: ['missing'] })] },
    { expectedEpoch: 0, rules: [] }, { expectedEpoch: 1, rules: [], extra: 0 }]) {
    assert.throws(() => session.update(update)); assert.deepEqual(session.snapshot(), before);
  }
  const after = session.update({ expectedEpoch: 1, rules: [rule({ ports: [], jobIds: [] })] });
  assert.equal(after.epoch, 2); assert.equal(after.expiresAtMs, before.expiresAtMs);
  await run.send('request', packet('not-selected')); await run.finish(); await output;
  assert(!run.diagnostics().events.some(e => e.capture)); session.dispose(); session.dispose();
});

test('expiry is enforced by both monotonic checks and owned timer', async t => {
  const { performance } = require('node:perf_hooks'); let now = 100;
  t.mock.method(performance, 'now', () => now); t.mock.timers.enable({ apis: ['setTimeout'] });
  const { run, output } = start(fn(x => x), { capturePolicy: policy() });
  const session = run.openDiagnosticsSession({ rules: [rule()], expiresInMs: 10 });
  await run.send('request', packet('captured')); now = 111;
  const before = session.snapshot(); assert.equal(before.status, 'expired');
  assert.throws(() => session.update({ expectedEpoch: 1, rules: [] }), { code: 'SESSION_CLOSED' });
  assert.deepEqual(session.snapshot(), before);
  assert.throws(() => session.subscribe(() => {}), { code: 'SESSION_CLOSED' });
  await run.send('request', packet('expired'));
  const next = run.openDiagnosticsSession({ rules: [rule()], expiresInMs: 10 });
  t.mock.timers.tick(10); assert.equal(next.snapshot().status, 'expired');
  await run.send('request', packet('timer-expired')); await run.finish(); await output;
  assert(run.diagnostics().events.some(e => e.capture?.value === 'captured'));
  assert(!run.diagnostics().events.some(e => ['expired', 'timer-expired'].includes(e.capture?.value)));
});

test('replacement while operation awaits uses only new permission and retires old callbacks', async () => {
  const { deferred } = require('./diagnostic-fixture'); const entered = deferred(), release = deferred();
  const { run, output } = start(fn(async value => { entered.resolve(); await release.promise; return value; }), { capturePolicy: policy() });
  const old = run.openDiagnosticsSession({ rules: [rule({ outputs: false })], expiresInMs: 1000 });
  let oldCalls = 0; old.subscribe(() => oldCalls++);
  await run.send('request', packet('in-flight')); await entered.promise;
  const calls = oldCalls; old.dispose();
  const current = run.openDiagnosticsSession({ rules: [rule({ inputs: false })], expiresInMs: 1000 });
  let newCalls = 0; current.subscribe(() => newCalls++);
  release.resolve(); await run.finish(); await output;
  assert.equal(oldCalls, calls); assert(newCalls > 0);
  assert(current.snapshot().events.every(e => e.kind === 'sent' && e.captureSessionId === current.snapshot().sessionId));
  assert.equal(current.snapshot().events.length, 1); assert.notEqual(old.snapshot().sessionId, current.snapshot().sessionId);
});

test('epoch changes suppress queued callbacks; observer failures detach and limits release', async () => {
  const { run, output } = start(fn(x => x), { capturePolicy: policy() });
  const session = run.openDiagnosticsSession({ rules: [rule()], expiresInMs: 1000 }); let stale = 0;
  session.subscribe(() => stale++);
  const sending = run.send('request', packet('queued'));
  session.update({ expectedEpoch: 1, rules: [rule({ inputs: false })] });
  await sending; assert.equal(stale, 0);
  assert.throws(() => session.subscribe(null), TypeError);
  const offs = Array.from({ length: 64 }, () => session.subscribe(() => {}));
  assert.throws(() => session.subscribe(() => {}), RangeError); offs.forEach(off => { off(); off(); });
  let failures = 0; session.subscribe(() => { failures++; throw Error('observer'); });
  await run.send('request', packet('next')); await run.send('request', packet('last'));
  await run.finish(); await output; assert.equal(failures, 1);
  assert(session.snapshot().events.every(e => e.captureEpoch === 2));
});

test('UTF8 truncation is explicit and bounded, while eviction cannot permit duplicate execution', async () => {
  let calls = 0;
  const { run, output } = start(fn(x => { calls++; return x; }), { diagnostics: { limit: 2 }, capturePolicy: policy({ maxPayloadBytes: 4 }) });
  const session = run.openDiagnosticsSession({ rules: [rule()], expiresInMs: 1000 });
  const input = packet('😃😃'); await run.send('request', input);
  for (let i = 0; i < 4; i++) await run.send('request', packet(`v${i}`));
  await assert.rejects(run.send('request', input), { code: 'DUPLICATE_PACKET' });
  await run.finish(); await output; assert.equal(calls, 5);
  assert(run.diagnostics().dropped > 0); assert(run.diagnostics().events.length <= 2); assert(session.snapshot().events.length <= 2);
});

test('overlapping rules OR directions, respect output ports and accept selector bounds', async () => {
  const { run, output } = start(fn(x => x), { capturePolicy: policy({ maxSessionMs: 900000 }) });
  const rules = Array.from({ length: 32 }, (_, i) => rule({ ports: ['out'], inputs: false,
    jobIds: Array.from({ length: 8 }, (_, j) => `J${i * 8 + j}`) }));
  const session = run.openDiagnosticsSession({ rules, expiresInMs: 900000 });
  const id = session.snapshot().sessionId;
  await run.send('request', packet('selected', { jobId: 'J255' }));
  await run.finish(); await output;
  const events = session.snapshot().events;
  assert.equal(events.length, 1); assert.equal(events[0].kind, 'sent'); assert.equal(events[0].capture.value, 'selected');
  assert.equal(events[0].captureSessionId, id);
});

test('parked sends capture only on acceptance and cancellation closes permission', async () => {
  const { deferred } = require('./diagnostic-fixture'); const entered = deferred(), release = deferred();
  const { run, output } = start(fn(async x => { entered.resolve(); await release.promise; return x; }), { capturePolicy: policy(), diagnostics: { limit: 256 } });
  const session = run.openDiagnosticsSession({ rules: [rule()], expiresInMs: 1000 });
  await run.send('request', packet('first')); await entered.promise;
  for (let i = 0; i < 16; i++) await run.send('request', packet(i));
  const parked = packet('parked'), sending = run.send('request', parked);
  assert(!run.diagnostics().events.some(e => e.packet?.packetId === parked.packetId));
  run.cancel(); await assert.rejects(sending, { code: 'RUN_TERMINATED' });
  const final = run.diagnostics(); assert.equal(session.snapshot().status, 'terminated');
  release.resolve(); await run.done; await output; await Promise.resolve();
  assert.deepEqual(run.diagnostics(), final);
  assert.throws(() => session.update({ expectedEpoch: 1, rules: [] }), { code: 'SESSION_CLOSED' });
});

test('overlapping rules union directions and caller mutations cannot widen host authority', async () => {
  const host = policy({ denyOutputs: ['worker'] });
  const { run, output } = start(fn(x => x), { capturePolicy: host });
  host.denyOutputs.length = 0;
  const requested = [rule({ outputs: false }), rule({ inputs: false })];
  const session = run.openDiagnosticsSession({ rules: requested, expiresInMs: 1000 });
  requested[0].inputs = false;
  assert.deepEqual(session.snapshot().effectiveRules.map(r => [r.inputs, r.outputs]), [[true, false], [false, false]]);
  await run.send('request', packet('union')); await run.finish(); await output;
  assert(session.snapshot().events.some(e => e.kind === 'received'));
  assert(!session.snapshot().events.some(e => e.kind === 'sent'));
});
