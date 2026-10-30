const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createChannel } = require('../dist/cjs/channel.js');

test('backpressure and close drain', async () => {
  const c = createChannel(1);
  await c.send('A');
  let admitted = false;
  const pending = c.send('B').then(() => { admitted = true; });
  await Promise.resolve();
  assert.equal(admitted, false);
  assert.equal(c.stats().queued, 1);
  assert.equal(c.stats().pendingSend, true);
  c.close(); c.close();
  await assert.rejects(c.send('C'), { code: 'CHANNEL_CLOSED' });
  assert.deepEqual(await c.receive(), { done: false, value: 'A' });
  await pending;
  assert.deepEqual(await c.receive(), { done: false, value: 'B' });
  assert.deepEqual(await c.receive(), { done: true, value: undefined });
  assert.deepEqual(await c.receive(), { done: true, value: undefined });
  assert.equal(c.stats().sent, 2);
  assert.equal(c.stats().received, 2);
  assert.equal(c.stats().discarded, 0);
  assert.equal(c.stats().pendingSend, false);
});

test('overlap and abort', async () => {
  const c = createChannel(1);
  await c.send('A');
  const pending = c.send('B');
  const rejected = assert.rejects(pending, { code: 'RUN_TERMINATED' });
  await assert.rejects(c.send('C'), { code: 'CONCURRENT_SEND' });
  assert.equal(c.stats().queued, 1);
  assert.equal(c.stats().sent, 1);
  c.abort(); c.abort(); c.close();
  await rejected;
  assert.equal(c.stats().pendingSend, false);
  assert.equal(c.stats().queued, 0);
  assert.equal(c.stats().discarded, 1);
  await assert.rejects(c.send('D'), { code: 'RUN_TERMINATED' });
  await assert.rejects(c.receive(), { code: 'RUN_TERMINATED' });
  const r = createChannel(1);
  const read = r.receive();
  const readRejected = assert.rejects(read, { code: 'RUN_TERMINATED' });
  await assert.rejects(r.receive(), { code: 'CONCURRENT_READ' });
  r.abort();
  await readRejected;
  assert.equal(r.stats().pendingRead, false);
  assert.equal(r.stats().discarded, 0);
});

test('direct handoff and pending-reader close distinguish null from EOF', async () => {
  const c = createChannel(1);
  const pending = c.receive();
  assert.equal(c.stats().pendingRead, true);
  await c.send(null);
  assert.deepEqual(await pending, { done: false, value: null });
  assert.equal(c.stats().queued, 0);
  assert.equal(c.stats().sent, 1);
  assert.equal(c.stats().received, 1);
  const eof = c.receive();
  c.close();
  assert.deepEqual(await eof, { done: true, value: undefined });
  assert.equal(c.stats().pendingRead, false);
  await assert.rejects(c.send(1), { code: 'CHANNEL_CLOSED' });
});

test('abort overrides draining and statistics do not expose values', async () => {
  const c = createChannel(2);
  await c.send({ secret: 'a' });
  await c.send({ secret: 'b' });
  const pending = c.send({ secret: 'c' });
  const refused = assert.rejects(pending, { code: 'RUN_TERMINATED' });
  const before = c.stats();
  assert.equal(Object.isFrozen(before), true);
  c.close(); c.abort();
  await refused;
  assert.equal(before.queued, 2);
  assert.equal(c.stats().discarded, 2);
  assert.equal(c.stats().sent, 2);
  assert.equal(c.stats().received, 0);
  assert.equal(c.stats().aborted, true);
  assert.doesNotMatch(JSON.stringify(c.stats()), /secret/);
  await assert.rejects(c.receive(), { code: 'RUN_TERMINATED' });
});

test('transport independent of representation', async () => {
  class Custom { constructor(value) { this.value = value; } double() { return this.value * 2; } }
  const value = new Custom(3);
  const { packet } = require('../dist/cjs/index.js');
  const p = Object.freeze({ ...packet(0), value });
  const c = createChannel(1);
  await c.send(p);
  const received = await c.receive();
  assert.equal(received.value, p);
  assert.equal(received.value.value, value);
  assert.equal(value.double(), 6);
  assert.equal(Object.isFrozen(value), false);
  assert.throws(() => packet(value), { code: 'INVALID_PACKET' });
  await c.send(undefined);
  assert.deepEqual(await c.receive(), { done: false, value: undefined });
});

test('admission refuses malformed envelopes before queueing', async () => {
  const { packet } = require('../dist/cjs/index.js');
  const { admitPacket } = require('../dist/cjs/packet.js');
  const c = createChannel(1);
  const p = packet({ count: 1 });
  assert.throws(() => c.send(admitPacket({ ...p, packetId: 'bad' })), { code: 'INVALID_PACKET' });
  assert.equal(c.stats().sent, 0);
  await c.send(admitPacket(p));
  const received = await c.receive();
  assert.equal(received.value.packetId, p.packetId);
  assert.notEqual(received.value.value, p.value);
});

test('capacity validation and FIFO recovery after refused overlap', async () => {
  for (const capacity of [0, -1, 1.5, NaN, Infinity, '1', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => createChannel(capacity), { code: 'INVALID_ARGUMENT' });
  }
  const c = createChannel(1);
  await c.send(1);
  const pending = c.send(2);
  await assert.rejects(c.send(3), { code: 'CONCURRENT_SEND' });
  assert.equal((await c.receive()).value, 1);
  await pending;
  assert.equal((await c.receive()).value, 2);
  await c.send(3);
  assert.equal((await c.receive()).value, 3);
  assert.equal(c.stats().sent, 3);
  assert.equal(c.stats().received, 3);
});
