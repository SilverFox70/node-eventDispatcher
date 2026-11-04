const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { packet } = require('../dist/cjs');
const { validateDiagnostics } = require('../dist/cjs/model');
const { start, fn } = require('./diagnostic-fixture');

test('captured and truncated transfers strictly validate sizes, correlation and kind', async () => {
  const { run, output } = start(fn(x => x), { capturePolicy: { allowedNodes: ['worker'], denyInputs: [], denyOutputs: [], maxPayloadBytes: 4, maxSessionMs: 1000 } });
  run.openDiagnosticsSession({ rules: [{ nodeId: 'worker', inputs: true, outputs: true }], expiresInMs: 1000 });
  const snapshots = []; run.onDiagnostics(() => snapshots.push(run.diagnostics()));
  await run.send('request', packet('😃😃')); await run.send('request', packet(1)); await run.finish(); await output;
  assert.deepEqual(validateDiagnostics(run.diagnostics()), { ok: true });
  const events = run.diagnostics().events;
  const truncated = events.find(e => e.capture?.state === 'truncated');
  assert.equal(truncated.capture.preview, '"'); assert.equal(truncated.capture.bytes, 10);
  assert.equal(Buffer.byteLength(truncated.capture.preview), 1);
  const captured = events.find(e => e.capture?.state === 'captured'); assert.equal(captured.capture.value, 1);
  assert(snapshots.every(s => validateDiagnostics(s).ok));
  function verdict(patch, base = captured) {
    return validateDiagnostics({ version: 1, runId: base.runId, total: 1, dropped: 0, events: [{ ...base, sequence: 1, ...patch }] });
  }
  const bad = [ { captureSessionId: undefined }, { captureEpoch: 0 }, { captureEpoch: 1.5 }, { captureSessionId: 'bad' },
    { capture: undefined }, { capture: { state: 'captured', value: 1, bytes: 2 } },
    { capture: { state: 'captured', value: 'x'.repeat(2048), bytes: 2050 } },
    { capture: { state: 'captured', value: 1, bytes: 0 } }, { capture: { state: 'captured', value: 1, bytes: 1048577 } },
    { capture: { state: 'captured', value: 1, bytes: 1, extra: true } },
    { capture: { state: 'truncated', preview: 'a'.repeat(2049), bytes: 2050 } },
    { capture: { state: 'truncated', preview: '1234', bytes: 4 } },
    { capture: { state: 'unknown', preview: '', bytes: 1 } }, { capture: { state: 'truncated', preview: 1, bytes: 10 } } ];
  for (const patch of bad) assert.equal(verdict(patch).ok, false);
  assert.equal(verdict({ capture: { state: 'truncated', preview: '', bytes: 1 } }).ok, true);
  for (const kind of ['operation-started', 'process-error', 'run-terminal']) {
    assert.equal(verdict({ kind, operationId: randomUUID(), inputs: [], code: 'COMPONENT_FAILED', status: 'completed' }).ok, false);
  }
  let invoked = 0;
  assert.equal(verdict({ capture: { state: 'captured', get value() { invoked++; return 1; }, bytes: 1 } }).ok, false);
  assert.equal(invoked, 0);
  const missingCapture = { ...captured }; delete missingCapture.capture;
  assert.equal(verdict(missingCapture).ok, false);
});
