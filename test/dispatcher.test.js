const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createDispatcher } = require('../dist/cjs/index.js');

test('once removal before invocation', () => {
  const d = createDispatcher();
  const counts = [0, 0, 0];
  d.once('x', () => counts[0]++);
  d.once('x', () => counts[1]++);
  d.on('x', () => counts[2]++);
  d.emit('x');
  d.emit('x');
  assert.deepEqual(counts, [1, 1, 2]);
  let recursive = 0;
  d.once('recursive', () => { if (++recursive < 3) d.emit('recursive'); });
  d.emit('recursive');
  assert.equal(recursive, 1);
});

test('snapshot membership', () => {
  const d = createDispatcher();
  const calls = [];
  const b = () => calls.push('B');
  const c = () => calls.push('C');
  d.on('x', () => { calls.push('A'); d.off('x', b); d.on('x', c); });
  d.on('x', b);
  d.emit('x');
  assert.deepEqual(calls, ['A', 'B']);
  calls.length = 0;
  d.emit('x');
  assert.deepEqual(calls, ['A', 'C']);
});

test('idempotent cleanup', () => {
  const d = createDispatcher();
  assert.equal(d.unsubscribeAll('absent'), false);
  assert.equal(d.unsubscribeAll('absent'), false);
  let count = 0;
  const callback = () => count++;
  d.once('x', callback);
  assert.equal(d.off('x', callback), undefined);
  d.emit('x');
  assert.equal(count, 0);
});

test('recursive once runs only once', () => {
  const d = createDispatcher();
  let count = 0;
  d.once('recursive', () => { if (++count < 3) d.emit('recursive'); });
  d.emit('recursive');
  assert.equal(count, 1);
});

test('legacy arguments and throw', () => {
  const d = createDispatcher();
  const context = { marker: true };
  const seen = [];
  d.on('x', function(a, b) { seen.push([a, b, this]); });
  assert.equal(d.emit('x', [2, 3], context), undefined);
  assert.deepEqual(seen, [[2, 3, context]]);
  d.emit('x', 4, context);
  assert.deepEqual(seen[1], [4, undefined, context]);
  d.emit('absent');
  const sentinel = new Error('sentinel');
  let later = 0;
  d.once('throws', () => { throw sentinel; });
  d.on('throws', () => later++);
  assert.throws(() => d.emit('throws'), error => error === sentinel);
  assert.equal(later, 0);
  d.emit('throws');
  assert.equal(later, 1);
  const promise = Promise.resolve('ignored');
  d.on('async', () => promise);
  assert.equal(d.emit('async'), undefined);
});

test('isolated bounded inspection', () => {
  const a = createDispatcher({ logLimit: 2 });
  const b = createDispatcher();
  let calls = 0;
  function callback() { calls++; }
  a.on('x', callback);
  b.emit('x');
  assert.equal(calls, 0);
  a.getSubscriberFunctionsByEventName('x').length = 0;
  a.getAllSubscribedFunctions().x.length = 0;
  a.getEventNames().length = 0;
  a.emit('x');
  assert.equal(calls, 1);
  assert.equal(a.getSubscriberFunctionsByEventName('missing'), undefined);
  assert.equal(a.eventLoggerIsOn(), false);
  assert.deepEqual(a.eventLog(), {});
  a.eventLoggerOn();
  const secret = { payload: 'never-log' };
  a.on('logged', callback);
  a.emit('logged', secret, secret);
  a.off('logged', callback);
  const records = a.eventLog();
  assert.deepEqual(Object.values(records).map(entry => entry.action), ['emit', 'off']);
  for (const entry of Object.values(records)) {
    assert.ok(Object.keys(entry).every(key => ['action', 'timestamp', 'event', 'callbackName'].includes(key)));
    assert.equal(typeof entry.timestamp, 'number');
    entry.event = 'changed';
  }
  delete records[Object.keys(records)[0]];
  assert.equal(Object.keys(a.eventLog()).length, 2);
  assert.ok(Object.values(a.eventLog()).every(entry => entry.event === 'logged'));
  assert.doesNotMatch(JSON.stringify(a.eventLog()), /never-log|function|=>/);
  a.eventLoggerOff();
  a.emit('logged');
  assert.equal(a.eventLoggerIsOn(), false);
  assert.equal(Object.keys(a.eventLog()).length, 2);
  const zero = createDispatcher({ logLimit: 0 });
  zero.eventLoggerOn();
  zero.on('x', callback);
  zero.emit('x');
  assert.deepEqual(zero.eventLog(), {});
  b.eventLoggerOn();
  for (let index = 0; index < 1001; index++) b.emit('capacity', index);
  assert.equal(Object.keys(b.eventLog()).length, 1000);
});

test('duplicate registrations and empty-event cleanup', () => {
  const d = createDispatcher();
  let calls = 0;
  const callback = () => calls++;
  assert.equal(d.once('x', callback), undefined);
  assert.equal(d.on('x', callback), undefined);
  d.off('x', callback);
  d.emit('x');
  assert.equal(calls, 1);
  d.off('x', callback);
  d.off('x', callback);
  d.off('absent', callback);
  assert.equal(d.hasListenersOnEvent('x'), false);
  assert.equal(d.hasListenersOnEvent('absent'), false);
  assert.equal(d.isValidEvent('x'), true);
  assert.equal(d.unsubscribeAll('x'), true);
  assert.equal(d.isValidEvent('x'), false);
  assert.equal(d.unsubscribeAll('x'), false);
  assert.deepEqual(d.getAllSubscribedFunctions(), {});
});

test('recursive snapshots do not repeat consumed once listeners', () => {
  const d = createDispatcher();
  const calls = [];
  d.once('x', () => { calls.push('A'); d.emit('x'); });
  d.once('x', () => calls.push('B'));
  d.emit('x');
  assert.deepEqual(calls, ['A', 'B']);
  d.on('removed', () => d.unsubscribeAll('removed'));
  d.once('removed', () => calls.push('C'));
  d.emit('removed');
  assert.deepEqual(calls, ['A', 'B', 'C']);
  const callback = () => calls.push('D');
  d.on('off', () => d.off('off', callback));
  d.once('off', callback);
  d.emit('off');
  assert.equal(calls.at(-1), 'D');
});

