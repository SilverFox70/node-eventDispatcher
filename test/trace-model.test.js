const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateExecutionTrace } = require('../dist/cjs/model');
const base = () => ({ version: 1, runId: 'run', total: 1, dropped: 0, payloads: false, events: [{
  sequence: 1, timeMs: 0, kind: 'sent', channelId: 'input:accountId', from: null, to: { node: 'lookup', port: 'accountId' },
  packetId: 'packet', jobId: 'job', parentPacketIds: [], payloadState: 'omitted'
}] });
test('trace metadata admission rejects malformed bounds, order, routes and payload policy', () => {
  assert(validateExecutionTrace(base()).ok);
  const invalid = [null, [], {}, { ...base(), version: 2 }, { ...base(), extra: 1 }, { ...base(), total: -1 },
    { ...base(), dropped: 2 }, { ...base(), runId: '' }, { ...base(), payloads: 1 }, { ...base(), events: null },
    { ...base(), total: 1025, events: Array.from({ length: 1025 }, () => base().events[0]) }];
  for (const patch of [{ sequence: 2 }, { timeMs: -1 }, { timeMs: Infinity }, { kind: 'invented' }, { channelId: '' },
    { packetId: 1 }, { jobId: '' }, { parentPacketIds: null }, { parentPacketIds: [null] },
    { parentPacketIds: Array(257).fill('p') }, { payloadState: 'bad' }, { payload: 1 }, { payloadState: 'oversize' },
    { payloadState: 'captured', payload: 1 }, { from: null, to: null }, { to: {} }, { to: { node: 'n', port: 'p', extra: 1 } },
    { extra: 1 }]) { const value = base(); Object.assign(value.events[0], patch); invalid.push(value); }
  for (const value of invalid) assert.equal(validateExecutionTrace(value).ok, false, JSON.stringify(value));
  const captured = base(); captured.payloads = true; captured.events[0].payloadState = 'captured'; captured.events[0].payload = { safe: true };
  assert(validateExecutionTrace(captured).ok);
  captured.events[0].payload = 'x'.repeat(2049); assert.equal(validateExecutionTrace(captured).ok, false);
  delete captured.events[0].payload; assert.equal(validateExecutionTrace(captured).ok, false);
  captured.events[0].payloadState = 'oversize'; assert(validateExecutionTrace(captured).ok);
  const order = base(); order.total = 2; order.events.push({ ...order.events[0], sequence: 2, timeMs: -1 });
  assert.equal(validateExecutionTrace(order).ok, false);
});
