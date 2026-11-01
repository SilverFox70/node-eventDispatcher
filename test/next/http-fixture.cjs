const { createServer } = require('node:http');
const { once } = require('node:events');
const { setImmediate } = require('node:timers/promises');

/** Real loopback HTTP with deliberately controlled provider failure modes. */
module.exports = async function httpFixture() {
  let mode = 'success', active = 0, peak = 0, calls = 0, cancelled = 0;
  const waiters = [], held = new Set();
  const notify = () => { for (const item of [...waiters]) if (item.condition()) { waiters.splice(waiters.indexOf(item), 1); item.resolve(); } };
  const server = createServer(async (request, response) => {
    calls++; active++; peak = Math.max(active, peak);
    let finished = false;
    response.once('finish', () => { finished = true; });
    response.once('close', () => { active--; if (!finished) cancelled++; held.delete(response); notify(); });
    const [, resource, name] = request.url.split('/');
    if (mode === 'hold') { held.add(response); notify(); return; }
    notify();
    await setImmediate();
    if (mode === 'disconnect') { response.destroy(); return; }
    if (mode === 'error') { response.writeHead(503).end('Unavailable'); return; }
    if (mode === 'malformed') { response.end('{'); return; }
    if (mode === 'oversize') { response.end(' '.repeat(524289)); return; }
    if (mode === 'schema') { response.end('{}'); return; }
    const resultName = mode === 'mismatch' ? 'other' : name;
    const result = resource === 'pokemon' ? { name: resultName, height: 4, weight: 60, types: [{ type: { name: 'electric' } }] }
      : { name: resultName, genera: [{ genus: 'Mouse Pokémon', language: { name: 'en' } }] };
    response.setHeader('content-type', 'application/json'); response.end(JSON.stringify(result));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const wait = condition => condition() ? Promise.resolve() : new Promise(resolve => waiters.push({ condition, resolve }));
  return {
    url: `http://127.0.0.1:${server.address().port}/`,
    mode(value) { mode = value; },
    stats: () => ({ active, peak, calls, cancelled }),
    entered: () => wait(() => held.size >= 2), idle: () => wait(() => active === 0),
    release() { for (const response of held) response.end('{}'); },
    async close() { server.closeAllConnections(); const closed = once(server, 'close'); server.close(); await closed; }
  };
};
