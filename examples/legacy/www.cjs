const { wwwHandler } = require('./wwwPromise.cjs');

/** Explicit installation replaces import-time subscriptions; dispose only these listeners. */
function registerHttpEvents(events) {
  const get = (url, options) => { void wwwHandler.get(url, options).then(
    body => events.emit('getComplete', [body]), error => events.emit('getComplete', [error])); };
  const post = (url, form, options) => { void wwwHandler.post(url, form, options).then(
    body => events.emit('postComplete', [body]), error => events.emit('postComplete', [error])); };
  events.on('get', get); events.on('post', post);
  return () => { events.off('get', get); events.off('post', post); };
}
module.exports = { registerHttpEvents };
