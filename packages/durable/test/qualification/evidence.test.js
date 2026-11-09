import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matrix, orderCases, validateEvidence } from './evidence.mjs';

test('qualification rejects missing provider acceptance, unknown workers and partial evidence', () => {
  const id = 'prepared';
  const events = matrix[id].barriers.map(label => ({
    caseId: id, label, identity: 'key', ...(label === 'provider-accepted' ? { receipt: 'accept-1' } : { pid: 7 }),
  }));
  const workers = [{ pid: 7 }];
  const effects = [{ key: 'key', receipt: 'accept-1' }];
  const verify = (observed = events, workerSet = workers, ledger = effects, complete = true) =>
    validateEvidence(id, observed, workerSet, ledger, 'pin', 'pin', 42, complete);
  verify();
  assert.throws(() => verify(events.filter(event => event.label !== 'provider-accepted')), /Missing or unordered/);
  assert.throws(() => verify(events, workers, []), /Missing independent provider receipt/);
  assert.throws(() => verify(events, []), /Untracked worker/);
  assert.throws(() => verify(events, workers, [...effects, ...effects]), /Unexpected provider mutation count/);
  assert.throws(() => verify(events, workers, effects, false), /Missing persisted invariants/);
  const ids = Object.keys(matrix);
  assert.deepEqual(orderCases(42, ids), orderCases(42, ids));
  assert.deepEqual(orderCases(42, ids).sort(), ids.sort());
});
