const { test } = require('node:test');
const assert = require('node:assert/strict');
const { packet, exportDiagnostics, attachDiagnosticsSink } = require('../dist/cjs');
const { validateDiagnosticBatch } = require('../dist/cjs/model');
const { start, fn } = require('./diagnostic-fixture');
const parse = text => text.trimEnd().split('\n').map(JSON.parse);

test('JSONL exports retained sequence gaps and removes captures unless explicitly requested', async () => {
  const { run, output } = start(fn(x => x), { diagnostics: { limit: 40 }, capturePolicy: {
    allowedNodes: ['worker'], denyInputs: [], denyOutputs: [], maxPayloadBytes: 2048, maxSessionMs: 60000 } });
  run.openDiagnosticsSession({ rules: [{ nodeId: 'worker', inputs: true, outputs: true }], expiresInMs: 60000 });
  const delivered = [];
  const sink = attachDiagnosticsSink(run, { write: async batch => { delivered.push(batch); } }, { includeCaptures: true });
  for (let i = 0; i < 8; i++) await run.send('request', packet({ secret: 'PRIVATE', i }));
  await run.finish(); await output; await sink.flush({ timeoutMs: 1000 });
  const snapshot = run.diagnostics(), omitted = parse(exportDiagnostics(snapshot)), retained = parse(exportDiagnostics(snapshot, { includeCaptures: true }));
  assert(snapshot.dropped > 0); assert.equal(omitted.length, 2);
  assert(!exportDiagnostics(snapshot).includes('PRIVATE')); assert(exportDiagnostics(snapshot, { includeCaptures: true }).includes('PRIVATE'));
  for (const batch of [...omitted, ...retained, ...delivered]) assert.deepEqual(validateDiagnosticBatch(batch), { ok: true });
  assert.deepEqual(omitted.flatMap(b => b.events.map(e => e.sequence)), snapshot.events.map(e => e.sequence));
  assert(omitted.every(b => b.loss.sourceRecords === snapshot.dropped && b.captureMode === 'omitted'));
  const withCapture = retained.flatMap(b => b.events).find(e => e.capture);
  assert.equal(validateDiagnosticBatch({ ...retained[0], captureMode: 'omitted', events: [withCapture] }).ok, false);
  assert(retained.some(b => b.events.some(e => e.capture))); assert(delivered.some(b => b.events.some(e => e.capture)));
  assert(Object.isFrozen(delivered[0])); assert(Object.isFrozen(delivered[0].events)); await sink.dispose();
});

test('empty export and strict model/export refusal preserve version, loss and identity', async () => {
  const { run, output } = start(fn(x => x));
  const snapshot = run.diagnostics(), [empty] = parse(exportDiagnostics(snapshot));
  assert.equal(empty.events.length, 0); assert.equal(empty.loss.sourceRecords, 0);
  const invalid = [null, {}, { ...empty, version: 2 }, { ...empty, extra: 1 }, { ...empty, runId: 'bad' },
    { ...empty, captureMode: 'all' }, { ...empty, loss: { sourceRecords: -1, droppedRecords: 0, droppedBytes: 0 } },
    { ...empty, loss: { ...empty.loss, droppedBytes: NaN } }, { ...empty, events: [1] }];
  for (const value of invalid) assert.equal(validateDiagnosticBatch(value).ok, false);
  for (const options of [null, { includeCaptures: undefined }, { other: true }]) assert.throws(() => exportDiagnostics(snapshot, options), { code: 'INVALID_ARGUMENT' });
  assert.throws(() => exportDiagnostics({ ...snapshot, version: 2 }), { code: 'INVALID_DIAGNOSTIC' });
  await run.send('request', packet(1)); await run.finish(); await output;
  const [batch] = parse(exportDiagnostics(run.diagnostics())), events = batch.events;
  for (const mutated of [[events[1], events[0]], [events[0], events[0]], Array(33).fill(events[0]), [{ ...events[0], sequence: 0 }], [{ ...events[0], timeMs: -1 }], [{ ...events[0], runId: 'bad' }]]) {
    assert.equal(validateDiagnosticBatch({ ...batch, events: mutated }).ok, false);
  }
  assert.equal(validateDiagnosticBatch({ ...batch, events: [events[0], events.at(-1)], loss: { ...batch.loss, droppedRecords: events.length - 2 } }).ok, true);
});
