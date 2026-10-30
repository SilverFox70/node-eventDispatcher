const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { packet, derivePacket } = require('../dist/cjs/index.js');

const { admitPacket } = require('../dist/cjs/packet.js');

test('bounded derivation and refusal precedence', () => {
  const a = packet(1, { jobId: 'job-42', key: 'person-a@r7' });
  const b = packet(2, { jobId: 'job-42', key: 'person-a@r7' });
  const value = { total: 3 };
  const result = derivePacket(value, [b, a]);
  value.total = 4;
  assert.equal(result.value.total, 3);
  assert.equal(result.jobId, 'job-42');
  assert.equal(result.key, 'person-a@r7');
  assert.deepEqual(result.parentPacketIds, [b.packetId, a.packetId]);
  assert.notEqual(result.packetId, a.packetId);
  assert.equal(Object.isFrozen(result.parentPacketIds), true);
  assert.deepEqual(admitPacket(result), result);
  const otherJob = packet(2, { jobId: 'job-43', key: 'other' });
  const otherKey = packet(2, { jobId: 'job-42', key: 'other' });
  const missingKey = packet(2, { jobId: 'job-42' });
  for (const parents of [null, [], {}, new Array(1), [a, a], Array(257).fill(a)]) {
    assert.throws(() => derivePacket(1, parents), { code: 'INVALID_LINEAGE' });
  }
  assert.throws(() => derivePacket(undefined, [], { jobId: 'override' }), { code: 'INVALID_ARGUMENT' });
  assert.throws(() => derivePacket(undefined, [a, a, {}]), { code: 'INVALID_PACKET' });
  assert.throws(() => derivePacket(undefined, [a, a]), { code: 'INVALID_LINEAGE' });
  assert.throws(() => derivePacket(undefined, [a, otherJob]), { code: 'JOB_MISMATCH' });
  for (const parents of [[a, otherKey], [a, missingKey], [missingKey, a]]) {
    assert.throws(() => derivePacket(undefined, parents), { code: 'CORRELATION_MISMATCH' });
  }
  assert.equal(derivePacket(1, [a, otherKey], { key: 'new' }).key, 'new');
  assert.equal(Object.hasOwn(derivePacket(1, [missingKey]), 'key'), false);
  const parents = Array.from({ length: 256 }, () => packet(1, { jobId: 'job-42' }));
  assert.equal(derivePacket(1, parents).parentPacketIds.length, 256);
  assert.throws(() => derivePacket(1, [a], { key: undefined }), { code: 'INVALID_ARGUMENT' });
});

test('refusals allocate no child; generated self-parent is refused', t => {
  const parent = packet(1, { jobId: 'job-42' });
  let allocations = 0;
  t.mock.method(crypto, 'randomUUID', () => { allocations++; return parent.packetId; });
  assert.throws(() => derivePacket(undefined, [parent]), { code: 'INVALID_PACKET' });
  assert.throws(() => packet(undefined), { code: 'INVALID_PACKET' });
  assert.equal(allocations, 0);
  assert.throws(() => derivePacket(2, [parent]), { code: 'INVALID_LINEAGE' });
  assert.equal(allocations, 1);
});
