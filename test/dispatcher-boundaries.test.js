const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDispatcher, eventDispatcher } = require('../dist/cjs/index.js');

test('invalid calls refuse before changing state', () => {
  const d = createDispatcher();
  d.eventLoggerOn();
  for (const name of ['', null, undefined, 1, {}, Symbol('event')]) {
    for (const method of ['on', 'once', 'off']) assert.throws(() => d[method](name, () => {}), TypeError);
    for (const method of ['emit', 'unsubscribeAll', 'getSubscriberFunctionsByEventName', 'isValidEvent', 'hasListenersOnEvent']) {
      assert.throws(() => d[method](name), TypeError);
    }
  }
  for (const callback of [null, undefined, 1, {}]) {
    for (const method of ['on', 'once', 'off']) assert.throws(() => d[method]('x', callback), TypeError);
  }
  assert.deepEqual(d.getEventNames(), []);
  assert.deepEqual(d.eventLog(), {});
  for (const logLimit of [-1, 10001, 1.5, NaN, Infinity, null, '2']) {
    assert.throws(() => createDispatcher({ logLimit }), TypeError);
  }
  for (const options of [null, 1, [], 'invalid']) assert.throws(() => createDispatcher(options), TypeError);
  assert.ok(createDispatcher({ logLimit: 10000 }));
  assert.ok(createDispatcher({ logLimit: undefined }));
});

test('prototype-like event names are ordinary isolated keys', () => {
  const d = createDispatcher();
  for (const name of ['__proto__', 'constructor', 'toString']) {
    let count = 0;
    d.on(name, () => count++);
    d.emit(name);
    assert.equal(count, 1);
    assert.ok(Object.hasOwn(d.getAllSubscribedFunctions(), name));
    d.unsubscribeAll(name);
  }
});

test('legacy shim and package root share the CommonJS singleton', () => {
  const shim = require('../server/src/eventDispatcher');
  const subpath = require('event-driven-design/server/src/eventDispatcher.js');
  assert.equal(shim.createDispatcher, createDispatcher);
  assert.equal(shim.eventDispatcher, eventDispatcher);
  assert.equal(subpath.eventDispatcher, eventDispatcher);
  assert.notEqual(createDispatcher(), eventDispatcher);
});
