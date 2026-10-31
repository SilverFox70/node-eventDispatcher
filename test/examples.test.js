const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { once } = require('node:events');
const { join } = require('node:path');
const { installedPackage } = require('./package-fixture.cjs');
const { wwwHandler } = require('../examples/legacy/wwwPromise.cjs');

test('offline examples and HTTP boundary: every installed cookbook script runs without checkout tooling', () => {
  const c = installedPackage();
  try {
    const expected = {
      '01-map-filter.cjs': ['6', '8', 'completed'],
      '02-async-branches.cjs': ['Saved Ada', 'Saved dark', 'completed'],
      '03-keyed-collation.cjs': ['Immediate parents: 2', 'Results received: 1', 'completed'],
      '04-inspection.cjs': ['flowchart LR', 'subgraph s0', 'subgraph s2'],
      '05-node-authoring.cjs': ['"label":"Ada"', '"kind":"missing"', 'Calls: 2 Run: completed', 'Dependencies: lookup'],
      '06-testing.cjs': ['Node: [ 4, 6 ] completed', 'Graph: [ 5, 7 ] completed', 'Invalid input: INPUT_CONTRACT'],
      '07-external-feed.cjs': ['External feed: completed packets: 50 edge capacity: 1', 'External feed: cancelled packets: 0 edge capacity: 1'],
    };
    for (const [file, lines] of Object.entries(expected)) {
      const stdout = c.run(process.execPath, [join(c.installed, 'examples', file)]);
      for (const line of lines) assert(stdout.includes(line), `${file}: ${stdout}`);
    }
  } finally { c.dispose(); }
});

test('offline examples and HTTP boundary: localhost200/500 and controlled abort', async () => {
  const entered = Promise.withResolvers();
  const server = createServer((request, response) => {
    if (request.url === '/wait') { entered.resolve(); return; }
    response.writeHead(request.url === '/error' ? 500 : 200).end('body');
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal(await wwwHandler.get(base), 'body');
    await assert.rejects(wwwHandler.get(base + '/error'), { code: 'HTTP_ERROR', status: 500 });
    await assert.rejects(wwwHandler.post(base + '/error', {}), { code: 'HTTP_ERROR', status: 500 });
    for (const method of ['get', 'post']) {
      const controller = new globalThis.AbortController(); controller.abort();
      const pending = method === 'get' ? wwwHandler.get(base, { signal: controller.signal }) : wwwHandler.post(base, {}, { signal: controller.signal });
      await assert.rejects(pending, { name: 'AbortError' });
    }
    const controller = new globalThis.AbortController();
    const pending = wwwHandler.get(base + '/wait', { signal: controller.signal });
    await entered.promise; controller.abort(); await assert.rejects(pending, { name: 'AbortError' });
  } finally { const closed = once(server, 'close'); server.close(); server.closeAllConnections(); await closed; }
});

test('HTTP status without a response body still reports the status', async t => {
  t.mock.method(globalThis, 'fetch', async () => new globalThis.Response(null, { status: 500 }));
  await assert.rejects(wwwHandler.get('http://unused.invalid'), { code: 'HTTP_ERROR', status: 500 });
});
