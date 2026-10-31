const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDispatcher } = require('../dist/cjs');
const tick = () => new Promise(resolve => globalThis.queueMicrotask(resolve));

test('topology changes are coalesced and cannot change synchronous event behavior', async () => {
  const d = createDispatcher(), seen = [];
  assert.equal(typeof d.onTopologyChange, 'function', 'dispatcher must expose change notifications');
  const stop = d.onTopologyChange(() => seen.push(d.inspect()));
  const listener = () => {};
  d.on('ready', listener); d.once('ready', listener);
  const dispose = d.declarePublisher('service', 'ready');
  assert.equal(seen.length, 0);
  await tick(); assert.equal(seen.length, 1); assert.equal(seen[0].subscribers.length, 2);
  d.emit('ready'); await tick(); assert.equal(seen.at(-1).subscribers.length, 1);
  d.off('ready', listener); await tick(); assert.equal(seen.at(-1).subscribers.length, 0);
  dispose(); await tick(); assert.equal(seen.at(-1).publishers.length, 0);
  const count = seen.length;
  dispose(); d.off('ready', listener); d.unsubscribeAll('ready'); d.unsubscribeAll('missing'); d.emit('missing');
  assert.throws(() => d.on('', listener), TypeError);
  assert.throws(() => d.declarePublisher('', 'ready'), TypeError);
  await tick(); assert.equal(seen.length, count);
  d.on('next', listener); d.unsubscribeAll('next'); await tick(); assert.equal(seen.length, count + 1);
  d.on('removed', listener); stop(); stop(); await tick(); assert.equal(seen.length, count + 1);
});

test('observer failures, reentrant changes and removal are isolated and bounded', async () => {
  const d = createDispatcher();
  assert.equal(typeof d.onTopologyChange, 'function', 'dispatcher must expose change notifications');
  for (const invalid of [null, undefined, 1, {}]) assert.throws(() => d.onTopologyChange(invalid), TypeError);
  let failures = 0, calls = 0;
  d.onTopologyChange(() => { failures++; throw Error('observer only'); });
  let remove;
  d.onTopologyChange(() => { remove(); if (++calls === 1) d.on('reentrant', () => {}); });
  remove = d.onTopologyChange(() => assert.fail('removed before its turn'));
  const callbackError = Error('application');
  d.once('once', () => { throw callbackError; });
  assert.throws(() => d.emit('once'), error => error === callbackError);
  await tick(); await tick();
  assert.equal(failures, 1); assert.equal(calls, 2); assert.equal(d.inspect().subscribers.some(s => s.once), false);
  const stops = Array.from({ length: 63 }, () => d.onTopologyChange(() => {}));
  assert.throws(() => d.onTopologyChange(() => {}), RangeError);
  stops[0](); const replacement = d.onTopologyChange(() => {}); replacement();
  stops.forEach(stop => stop());
  const other = createDispatcher(); let count = 0;
  other.onTopologyChange(() => count++); d.on('isolated', () => {}); await tick(); assert.equal(count, 0);
});
