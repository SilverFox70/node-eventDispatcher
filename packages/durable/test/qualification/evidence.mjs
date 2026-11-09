import assert from 'node:assert/strict';

function scenario(fault, effectCount, barriers, profile = 'domain') {
  return Object.freeze({ fault, effectCount, barriers: Object.freeze(barriers), profile });
}

export const matrix = Object.freeze({
  rollback: scenario('kill uncommitted submitter', 0, ['domain-staged', 'worker-killed', 'rollback-proved']),
  submission: scenario('kill after submit before wake', 1,
    ['domain-committed', 'worker-killed', 'prepared', 'provider-accepted', 'outcome-committed', 'projection-proved']),
  prepared: scenario('kill before invocation permit', 1,
    ['prepared', 'worker-killed', 'reclaimed', 'provider-accepted', 'projection-proved']),
  permit: scenario('expire lease before provider call', 1,
    ['permit-committed', 'uncertain', 'absence-held', 'provider-accepted', 'late-fenced', 'projection-proved']),
  accepted: scenario('kill after provider accepts without reply', 3,
    ['permit-committed', 'provider-accepted', 'worker-killed', 'uncertain', 'later-held',
      'independent-projected', 'outcome-committed', 'projection-proved', 'stale-projection-fenced']),
  outcome: scenario('kill after durable outcome before wake', 1,
    ['provider-accepted', 'outcome-committed', 'worker-killed', 'projection-proved']),
  unavailable: scenario('terminate transaction connection', 1,
    ['domain-committed', 'backend-terminated', 'connection-failed', 'rollback-proved', 'projection-proved']),
  pin: scenario('claim with mismatched binding', 1, ['domain-committed', 'wrong-pin-refused', 'projection-proved']),
  signal: scenario('kill after signal consumption', 0, ['signal-consumed', 'worker-killed', 'replay-proved'], 'wait'),
  join: scenario('kill after final slot commits', 0, ['join-completed', 'worker-killed', 'replay-proved'], 'join'),
});

export function validateEvidence(caseId, events, workers, effects, pin, expectedPin, seed, invariants) {
  assert.deepEqual(pin, expectedPin, 'Wrong pinned profile');
  assert(Number.isInteger(seed), 'Missing deterministic seed');
  assert.deepEqual(events.map(event => event.label), matrix[caseId].barriers, 'Missing or unordered qualification barrier');
  assert(invariants, 'Missing persisted invariants');
  for (const event of events) {
    assert(event.caseId === caseId && event.identity, 'Missing correlated run or operation');
    if (event.label === 'provider-accepted') {
      assert(effects.some(effect => effect.receipt === event.receipt && effect.key === event.identity),
        'Missing independent provider receipt');
    } else if (event.pid !== undefined) {
      assert(workers.some(worker => worker.pid === event.pid), 'Untracked worker');
    } else {
      assert.equal(event.source, 'sql', 'Unknown barrier source');
    }
  }
  assert.equal(effects.length, matrix[caseId].effectCount, 'Unexpected provider mutation count');
  assert.equal(new Set(effects.map(effect => effect.key)).size, effects.length, 'Duplicate provider mutation');
}

export function orderCases(seed, ids) {
  let state = seed >>> 0;
  const ordered = [...ids];
  for (let i = ordered.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const index = state % (i + 1);
    [ordered[index], ordered[i]] = [ordered[i], ordered[index]];
  }
  return ordered;
}
