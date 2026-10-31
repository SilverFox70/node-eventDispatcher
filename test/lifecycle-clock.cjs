const { performance } = require('node:perf_hooks');
/** Test-local monotonic clock and owned timer/listener inventory; no sleeps or global handle counts. */
function clock(t, signal) {
  let now = 0;
  const timers = new Set(), listeners = new Set();
  t.mock.method(performance, 'now', () => now);
  t.mock.method(globalThis, 'setTimeout', (callback, delay) => {
    const timer = { callback, delay }; timers.add(timer); return timer;
  });
  t.mock.method(globalThis, 'clearTimeout', timer => { timers.delete(timer); });
  if (signal) {
    const add = signal.addEventListener.bind(signal), remove = signal.removeEventListener.bind(signal);
    t.mock.method(signal, 'addEventListener', (name, handler, options) => {
      if (name === 'abort') listeners.add(handler); return add(name, handler, options);
    });
    t.mock.method(signal, 'removeEventListener', (name, handler, options) => {
      if (name === 'abort') listeners.delete(handler); return remove(name, handler, options);
    });
  }
  return { timers, listeners, advance(elapsed) { now += elapsed; }, fire(elapsed, selected) {
    const timer = selected ?? timers.values().next().value;
    if (!timer) throw Error('No deadline scheduled');
    timers.delete(timer); now += elapsed ?? timer.delay; timer.callback();
  } };
}
module.exports = { clock };
