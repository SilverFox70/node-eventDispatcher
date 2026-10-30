const { test } = require('node:test');
const assert = require('node:assert/strict');
const { styleText } = require('node:util');

test('legacy dispatcher behavior and native log identities remain observable', () => {
  const { eventDispatcher: d } = require('../server/src/eventDispatcher');
  assert.equal(d.eventLoggerIsOn(), false);
  const seen = [];
  const context = { label: 'context' };
  function listener(value) { seen.push([this, value]); }
  function other() {}
  d.emit('absent', 0);
  d.on('plain', listener);
  d.on('plain', other);
  d.once('plain', other);
  d.emit('plain', [3], context);
  assert.deepEqual(seen, [[context, 3]]);
  d.off('absent', listener);
  d.off('plain', () => {});
  d.off('plain', listener);
  assert.equal(d.unsubscribeAll('plain'), true);
  d.eventLoggerOn();
  assert.equal(d.eventLoggerIsOn(), true);
  d.on('logged', listener);
  d.on('logged', other);
  d.once('logged', other);
  d.once('new-once', other);
  d.emit('absent', 1);
  d.emit('logged', 'text', context);
  assert.equal(d.hasListenersOnEvent('logged'), true);
  assert.equal(d.hasListenersOnEvent('absent'), false);
  assert.equal(d.isValidEvent('logged'), true);
  assert.equal(d.isValidEvent('absent'), false);
  d.once('inspect-once', other);
  assert.ok(d.getAllSubscribedFunctions()['inspect-once'].includes(other));
  assert.ok(d.getAllSubscribedFunctions().logged.includes(listener));
  assert.ok(d.getEventNames().includes('logged'));
  assert.ok(d.getSubscriberFunctionsByEventName('logged').includes(listener));
  d.off('logged', listener);
  d.off('logged', listener);
  d.off('absent', listener);
  d.emit('new-once', 1);
  assert.equal(d.hasListenersOnEvent('new-once'), false);
  assert.equal(d.unsubscribeAll('logged'), true);
  assert.equal(d.unsubscribeAll('absent'), false);
  const logs = d.eventLog();
  assert.ok(Object.keys(logs).length > 0);
  for (const id of Object.keys(logs)) {
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(typeof logs[id].timestamp, 'number');
  }
  d.eventLoggerOff();
  assert.equal(d.eventLoggerIsOn(), false);
  const colors = require('cli-color');
  for (const color of ['yellow', 'cyan', 'magenta', 'green', 'bold', 'blackBright', 'blueBright']) {
    assert.equal(typeof colors[color]('text'), 'string');
  }
  assert.equal(typeof styleText('green', 'text'), 'string');
});
