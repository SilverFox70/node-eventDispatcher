import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';

export async function startProvider() {
  const effects = [];
  const pending = new Map();
  const holds = new Set();
  const listeners = new Map();
  const server = createServer(async (request, response) => {
    const key = request.url.slice(1);
    if (request.method === 'GET') {
      const effect = effects.findLast(effect => effect.key === key);
      response.end(JSON.stringify(effect ? { found: true, result: effect.result } : { found: false }));
      return;
    }
    const body = [];
    try { for await (const chunk of request) body.push(chunk); }
    catch { return; }
    const result = JSON.parse(Buffer.concat(body).toString());
    const receipt = 'accept-' + (effects.length + 1);
    const effect = { key, receipt, result };
    effects.push(effect);
    if (holds.has(key)) pending.set(key, response);
    else response.end(JSON.stringify(result));
    listeners.get(key)?.(effect);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    url: 'http://127.0.0.1:' + server.address().port,
    effects,
    hold(key) { holds.add(key); },
    accepted(key) {
      const previous = effects.find(effect => effect.key === key);
      if (previous) return Promise.resolve(previous);
      return new Promise(resolve => listeners.set(key, resolve));
    },
    replyHeld(key) { return pending.has(key) && !pending.get(key).writableEnded; },
    async close() {
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      assert.equal(server.listening, false);
    },
  };
}
