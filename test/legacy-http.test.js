const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { once } = require('node:events');
const { wwwHandler } = require('../server/src/wwwPromise');
const { eventDispatcher: events } = require('../server/src/eventDispatcher');
require('../server/src/www');

test('legacy HTTP examples use native fetch and preserve completion events', async () => {
  const server = createServer(async (request, response) => {
    if (request.url === '/fail') {
      request.socket.destroy();
      return;
    }
    if (request.url === '/redirect') {
      response.writeHead(302, { location: '/ok' }).end();
      return;
    }
    if (request.url === '/status') {
      response.writeHead(503).end('unavailable');
      return;
    }
    if (request.method === 'POST') {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      assert.match(request.headers['content-type'], /application\/x-www-form-urlencoded/);
      response.end(Buffer.concat(chunks).toString());
      return;
    }
    response.end('hello');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const completion = (action, suffix, form) => new Promise(resolve => {
    const eventName = `${action}Complete`;
    const listener = value => {
      events.off(eventName, listener);
      resolve(value);
    };
    events.on(eventName, listener);
    events.emit(action, [base + suffix, form]);
  });
  try {
    assert.equal(await wwwHandler.get(base + '/ok'), 'hello');
    assert.equal(await wwwHandler.get(base + '/status'), 'unavailable');
    assert.equal(await wwwHandler.post(base + '/ok', { name: 'a & b' }), 'name=a+%26+b');
    for (const action of ['get', 'post']) {
      await assert.rejects(wwwHandler[action](base + '/fail', {}), TypeError);
      await assert.rejects(wwwHandler[action](base + '/redirect', {}), TypeError);
      assert.equal(await completion(action, '/ok', { name: 'a & b' }), action === 'get' ? 'hello' : 'name=a+%26+b');
      assert.ok(await completion(action, '/fail', {}) instanceof Error);
    }
  } finally {
    const closed = once(server, 'close');
    server.close();
    server.closeAllConnections();
    await closed;
  }
});
