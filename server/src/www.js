'use strict';

const { eventDispatcher: events } = require('./eventDispatcher');
const { wwwHandler } = require('./wwwPromise');

// Preserve completion events; report transport failures as Error values.
events.on('get', url => {
  wwwHandler.get(url).then(
    body => events.emit('getComplete', body),
    error => events.emit('getComplete', error)
  );
});

events.on('post', (url, form) => {
  wwwHandler.post(url, form).then(
    body => events.emit('postComplete', body),
    error => events.emit('postComplete', error)
  );
});

module.exports = { www: undefined };
