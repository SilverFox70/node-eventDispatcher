const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDispatcher } = require('../dist/cjs/index.js');

test('subscription topology stays current', () => {
  const d = createDispatcher();
  function named() {}
  d.on('z', named, { ownerId: 'node-z' });
  d.on('a', named);
  d.once('z', () => {
    assert.equal(d.inspect().subscribers.some(item => item.once), false);
  }, { ownerId: 'once-owner' });
  const dispose = d.declarePublisher('producer', 'published');
  const before = d.inspect();
  assert.deepEqual(before.events.map(item => item.name), ['a', 'published', 'z']);
  assert.deepEqual(before.subscribers.map(item => [item.event, item.ownerId, item.once]), [
    ['z', 'node-z', false], ['a', null, false], ['z', 'once-owner', true]
  ]);
  assert.equal(before.publishers[0].provenance, 'declared');
  d.emit('z', { secret: 'never-capture' });
  assert.equal(d.inspect().subscribers.length, 2);
  d.off('z', named);
  d.unsubscribeAll('a');
  assert.deepEqual(d.inspect().events, [{ name: 'published' }]);
  dispose(); dispose();
  assert.deepEqual(d.inspect(), { version: 1, events: [], subscribers: [], publishers: [] });
  assert.equal(before.subscribers.length, 3);
});

test('topology snapshots are immutable JSON without callback execution or source', () => {
  const d = createDispatcher();
  const metadata = { ownerId: 'original', secret: 'hidden' };
  function secretCallback() { throw new Error('must not execute during inspection'); }
  secretCallback.toString = () => { throw new Error('must not read function source'); };
  d.on('event', secretCallback, metadata);
  d.on('event', () => {});
  metadata.ownerId = 'changed';
  const dispose = d.declarePublisher('publisher', 'published');
  const snapshot = d.inspect();
  assert.equal(snapshot.subscribers[0].ownerId, 'original');
  assert.equal(snapshot.subscribers[0].callbackName, 'secretCallback');
  assert.equal(snapshot.subscribers[1].callbackName, 'anonymous');
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), snapshot);
  assert.doesNotMatch(JSON.stringify(snapshot), /hidden|must not|fired|timestamp/);
  for (const value of [snapshot, snapshot.events, snapshot.subscribers, snapshot.publishers,
    ...snapshot.events, ...snapshot.subscribers, ...snapshot.publishers]) {
    assert.equal(Object.isFrozen(value), true);
  }
  assert.equal(Reflect.set(snapshot.subscribers[0], 'ownerId', 'overwrite'), false);
  assert.equal(Reflect.set(snapshot.events[0], 'name', 'overwrite'), false);
  assert.equal(Reflect.set(snapshot.publishers[0], 'ownerId', 'overwrite'), false);
  assert.throws(() => snapshot.subscribers.push({}), TypeError);
  assert.deepEqual(d.inspect(), snapshot);
  d.eventLoggerOn();
  assert.deepEqual(d.inspect(), snapshot);
  d.eventLoggerOff();
  d.unsubscribeAll('event'); dispose();
  assert.equal(snapshot.subscribers.length, 2);
  assert.deepEqual(d.inspect().events, []);
});

test('registration identities and publisher disposers are local and independent', () => {
  const d = createDispatcher();
  function callback() {}
  assert.equal(d.on('x', callback, { ownerId: 'a' }), undefined);
  assert.equal(d.once('x', callback, { ownerId: 'b' }), undefined);
  const initial = d.inspect().subscribers;
  assert.ok(initial[1].id > initial[0].id);
  d.off('x', callback);
  assert.equal(d.inspect().subscribers[0].id, initial[1].id);
  d.emit('x');
  assert.deepEqual(d.inspect().events, []);
  d.on('y', callback);
  assert.ok(d.inspect().subscribers[0].id > initial[1].id);
  const first = d.declarePublisher('same-owner', 'x');
  const second = d.declarePublisher('same-owner', 'x');
  const declarations = d.inspect().publishers;
  assert.ok(declarations[1].id > declarations[0].id);
  first(); first();
  assert.deepEqual(d.inspect().publishers, [declarations[1]]);
  d.unsubscribeAll('x');
  assert.equal(d.inspect().publishers.length, 1);
  const third = d.declarePublisher('other-owner', 'x');
  assert.ok(d.inspect().publishers[1].id > declarations[1].id);
  second(); third();
  const isolated = createDispatcher();
  isolated.on('x', callback);
  assert.equal(isolated.inspect().subscribers[0].id, initial[0].id);
  assert.deepEqual(isolated.inspect().publishers, []);
  d.unsubscribeAll('y');
  const empty = d.inspect();
  for (let index = 0; index < 1000; index++) d.emit('never-declared', { value: index });
  assert.deepEqual(d.inspect(), empty);
});

test('invalid owner metadata and publishers refuse without registrations', () => {
  const d = createDispatcher();
  d.eventLoggerOn();
  for (const metadata of [null, [], 'owner', 1, {}, { ownerId: null },
    { ownerId: '' }, { ownerId: 'x'.repeat(129) }]) {
    for (const method of ['on', 'once']) assert.throws(() => d[method]('x', () => {}, metadata), TypeError);
  }
  for (const owner of [null, undefined, 42, '', 'x'.repeat(129)]) {
    assert.throws(() => d.declarePublisher(owner, 'x'), TypeError);
  }
  for (const event of ['', null, 42]) assert.throws(() => d.declarePublisher('owner', event), TypeError);
  assert.deepEqual(d.inspect(), { version: 1, events: [], subscribers: [], publishers: [] });
  assert.deepEqual(d.getEventNames(), []);
  assert.deepEqual(d.eventLog(), {});
  d.once('x', () => {}, { ownerId: 'x'.repeat(128) });
  assert.equal(d.inspect().subscribers[0].id, 1);
  const dispose = d.declarePublisher('x'.repeat(128), 'x');
  assert.equal(d.inspect().publishers[0].id, 1);
  dispose();
  const disguised = () => {};
  Object.defineProperty(disguised, 'name', { value: { secret: 'not-a-name' } });
  d.eventLoggerOff();
  d.on('disguised', disguised);
  assert.equal(d.inspect().subscribers[1].callbackName, 'anonymous');
});
