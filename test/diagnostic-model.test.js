const { test } = require('node:test');
const assert = require('node:assert/strict');
const { packet } = require('../dist/cjs');
const { validateDiagnostics } = require('../dist/cjs/model');
const { start, fn } = require('./diagnostic-fixture');
const runId = '11111111-1111-4111-8111-111111111111';
const operationId = '22222222-2222-4222-8222-222222222222';
const attemptId = '33333333-3333-4333-8333-333333333333';
const identity = { version: 1, packetId: '44444444-4444-4444-8444-444444444444', jobId: 'J', parentPacketIds: [] };
const base = { version: 1, runId, sequence: 1, timeMs: 0 };
const snapshot = event => ({ version: 1, runId, total: 1, dropped: 0, events: [{ ...base, ...event }] });
const received = () => ({ kind: 'received', nodeId: 'n', port: 'in', packet: globalThis.structuredClone(identity) });
const refuse = value => assert.deepEqual(validateDiagnostics(value), { ok: false, issues: [{ code: 'INVALID_DIAGNOSTIC', path: '$' }] });

test('diagnostic model admits every strict variant and refuses missing or extra fields', () => {
  const variants = [
    received(), { ...received(), kind: 'sent' }, { ...received(), kind: 'input-admitted', inputName: 'request' },
    { kind: 'operation-started', nodeId: 'n', operationId, inputs: [] },
    { kind: 'attempt-started', nodeId: 'n', operationId, attemptId, attempt: 1, inputs: [identity] },
    ...['succeeded', 'failed', 'timed-out', 'cancelled'].map(outcome => ({ kind: 'attempt-finished', nodeId: 'n', operationId,
      attemptId, attempt: 1, durationMs: 1, outcome, ...(outcome === 'succeeded' ? {} : { code: 'NODE_TIMEOUT' }) })),
    ...['succeeded', 'failed', 'cancelled'].map(outcome => ({ kind: 'operation-finished', nodeId: 'n', operationId,
      durationMs: 2, outcome, ...(outcome === 'succeeded' ? {} : { code: 'COMPONENT_FAILED' }) })),
    { kind: 'process-error', nodeId: 'n', code: 'OUTPUT_CONTRACT' }, { kind: 'run-terminal', status: 'completed' },
    { kind: 'run-terminal', status: 'cancelled', code: 'CANCELLED' },
    { kind: 'run-terminal', status: 'failed', code: 'TIMEOUT', nodeId: 'n' },
  ];
  for (const variant of variants) {
    assert.deepEqual(validateDiagnostics(snapshot(variant)), { ok: true }, variant.kind);
    const missing = globalThis.structuredClone(variant); delete missing[variant.kind === 'run-terminal' ? 'status' : Object.keys(variant).at(-1)]; refuse(snapshot(missing));
    refuse(snapshot({ ...variant, payload: 'secret' })); refuse(snapshot({ ...variant, error: { message: 'secret' } }));
  }
  const optional = received(); optional.packet.key = 'key'; assert.deepEqual(validateDiagnostics(snapshot(optional)), { ok: true });
});

test('diagnostic model checks bounds, sequence, correlation and safe error codes without executing accessors', () => {
  for (const mutate of [
    s => { s.version = 2; }, s => { s.runId = 'bad'; }, s => { s.total = -1; }, s => { s.total = 2; },
    s => { s.dropped = -1; }, s => { s.events = Array(1025).fill(s.events[0]); s.total = 1025; },
    s => { s.extra = 1; }, s => { s.events[0].runId = operationId; }, s => { s.events[0].sequence = 3; },
    s => { s.events[0].timeMs = -1; }, s => { s.events[0].kind = 'invented'; },
    s => { s.events[0].nodeId = ''; }, s => { s.events[0].nodeId = 'n'.repeat(129); }, s => { s.events[0].port = ''; },
    s => { s.events[0].packet.jobId = ''; }, s => { s.events[0].packet.packetId = 'bad'; },
    s => { s.events[0].packet.version = 2; }, s => { s.events[0].packet.parentPacketIds = [identity.packetId]; },
    s => { s.events[0].packet.parentPacketIds = [operationId, operationId]; },
    s => { s.events[0].packet.parentPacketIds = ['bad']; }, s => { s.events[0].packet.key = ''; },
    s => { s.events[0].packet.key = 'x'.repeat(129); },
    s => { s.events[0].packet.parentPacketIds = Array.from({ length: 257 }, () => packet(0).packetId); },
    s => { s.events[0].packet.value = 1; },
  ]) { const value = snapshot(received()); mutate(value); refuse(value); }
  for (const value of [null, [], {}, { ...snapshot(received()), runId: Infinity }]) refuse(value);
  const attempt = { kind: 'attempt-started', nodeId: 'n', operationId, attemptId, attempt: 1, inputs: [identity] };
  for (const update of [{ operationId: 'bad' }, { attemptId: 'bad' }, { attempt: 0 }, { attempt: 1.5 },
    { inputs: Array(257).fill(identity) }, { inputs: [identity, identity] },
    { inputs: [identity, { ...identity, packetId: operationId, jobId: 'other' }] }]) refuse(snapshot({ ...attempt, ...update }));
  for (const outcome of ['invented', 'timed-out']) refuse(snapshot({ kind: 'operation-finished', nodeId: 'n', operationId, durationMs: 0, outcome }));
  refuse(snapshot({ kind: 'process-error', nodeId: 'n', code: 'SECRET_ERROR_MESSAGE' }));
  refuse(snapshot({ kind: 'run-terminal', status: 'invented' }));
  refuse(snapshot({ kind: 'input-admitted', nodeId: 'n', port: 'in', inputName: '', packet: identity }));
  refuse(snapshot({ kind: 'operation-finished', nodeId: 'n', operationId, durationMs: -1, outcome: 'succeeded' }));
  const backwards = snapshot(received()); backwards.events[0].timeMs = 2; backwards.events.push({ ...backwards.events[0], sequence: 2, timeMs: 1 }); backwards.total = 2; refuse(backwards);
  const ordered = snapshot(received()); ordered.events.push({ ...ordered.events[0], sequence: 2, timeMs: -1 }); ordered.total = 2; refuse(ordered);
  let accessed = 0; const getter = snapshot(received()); Object.defineProperty(getter.events[0], 'payload', { enumerable: true, get() { accessed++; return 1; } });
  refuse(getter); assert.equal(accessed, 0);
});

test('real bounded runtime snapshots survive JSON transport into the browser model', async () => {
  const { run, output } = start(fn(x => x), { diagnostics: { limit: 3 } });
  await run.send('request', packet(1)); run.closeInput('request'); await run.done; await output;
  const transported = JSON.parse(JSON.stringify(run.diagnostics()));
  assert.deepEqual(validateDiagnostics(transported), { ok: true }); assert(transported.dropped > 0);
});
