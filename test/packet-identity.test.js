const { test } = require('node:test');
const assert = require('node:assert/strict');
const { packet, FlowError } = require('../dist/cjs/index.js');
const { admitPacket } = require('../dist/cjs/packet.js');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('root identity and raw envelope validation', () => {
  const p = packet({ count: 2 }, { jobId: 'job-42', key: 'person-a@r7' });
  assert.match(p.packetId, uuid);
  assert.equal(p.jobId, 'job-42');
  assert.equal(p.key, 'person-a@r7');
  assert.equal(p.version, 1);
  assert.deepEqual(p.parentPacketIds, []);
  const generated = packet(1);
  assert.match(generated.jobId, uuid);
  assert.notEqual(generated.packetId, generated.jobId);
  assert.notEqual(generated.packetId, packet(1).packetId);
  assert.equal(Object.hasOwn(generated, 'key'), false);
  const raw = JSON.parse(JSON.stringify(p));
  const copied = admitPacket(raw);
  raw.value.count = 99;
  raw.parentPacketIds.push(generated.packetId);
  assert.equal(copied.value.count, 2);
  assert.deepEqual(copied.parentPacketIds, []);
  assert.equal(copied.packetId, p.packetId);
  assert.equal(copied.jobId, p.jobId);
  assert.equal(Object.isFrozen(copied.value), true);
  assert.equal(packet(1, { key: '😀'.repeat(128) }).key.length, 256);
  assert.equal(packet(1, { jobId: 'a'.repeat(128) }).jobId.length, 128);
  assert.ok(new FlowError('EXAMPLE') instanceof Error);
  assert.equal(new FlowError('EXAMPLE').name, 'FlowError');
});

test('invalid options refuse before payload validation', () => {
  for (const options of [null, [], 1, new Date(), { extra: true }, { packetId: 'override' },
    { jobId: undefined }, { jobId: null }, { jobId: '' }, { jobId: ' ' }, { jobId: 'é' },
    { jobId: 'a'.repeat(129) }, { key: undefined }, { key: null }, { key: '' },
    { key: '😀'.repeat(129) }, { [Symbol('x')]: 1 }]) {
    assert.throws(() => packet(undefined, options), { code: 'INVALID_ARGUMENT' });
  }
  const options = Object.defineProperty({}, 'key', { get() { throw new Error('getter ran'); } });
  assert.throws(() => packet(1, options), { code: 'INVALID_ARGUMENT' });
});

test('raw metadata is structural, bounded and accessor-free', () => {
  const base = packet(1);
  for (const changed of [
    { packetId: 42 }, { key: null }, { version: 2 }, { version: '1' }, { packetId: 'bad' }, { packetId: base.packetId.toUpperCase() },
    { jobId: undefined }, { jobId: '' }, { jobId: 'bad job' }, { key: undefined }, { key: '' },
    { key: 'x'.repeat(129) }, { extra: 1 }, { parentPacketIds: null }, { parentPacketIds: ['bad'] },
    { parentPacketIds: [base.packetId] }
  ]) assert.throws(() => admitPacket({ ...base, ...changed }), { code: 'INVALID_PACKET' });
  for (const field of ['version', 'packetId', 'jobId', 'parentPacketIds', 'value']) {
    const raw = { ...base }; delete raw[field];
    assert.throws(() => admitPacket(raw), { code: 'INVALID_PACKET' });
  }
  for (const raw of [null, [], new Date(), new Proxy({}, {}), { ...base, [Symbol('x')]: 1 }]) {
    assert.throws(() => admitPacket(raw), { code: 'INVALID_PACKET' });
  }
  const getter = { ...base };
  Object.defineProperty(getter, 'value', { get() { throw new Error('getter ran'); } });
  assert.throws(() => admitPacket(getter), { code: 'INVALID_PACKET' });
  const parent = packet(1);
  assert.throws(() => admitPacket({ ...base, parentPacketIds: [parent.packetId, parent.packetId] }), { code: 'INVALID_PACKET' });
  const parents = Array.from({ length: 256 }, () => packet(0).packetId);
  assert.equal(admitPacket({ ...base, parentPacketIds: parents }).parentPacketIds.length, 256);
  assert.throws(() => admitPacket({ ...base, parentPacketIds: [...parents, parent.packetId] }), { code: 'INVALID_PACKET' });
});
