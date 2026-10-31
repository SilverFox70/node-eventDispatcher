const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:net');
const app = process.env.FBP_NEXT_APP;

test('manual demo has a stable localhost address, explicit override and strict option refusal', async () => {
  const { demoOptions } = await import('../../scripts/next/demo-options.mjs');
  assert.deepEqual(demoOptions(['--serve']), { serve: true, host: 'localhost', port: 54545 });
  assert.deepEqual(demoOptions(['--serve', '--port', '54546']), { serve: true, host: 'localhost', port: 54546 });
  assert.deepEqual(demoOptions([]), { serve: false, host: '127.0.0.1', port: 0 });
  for (const args of [['--port', '1234'], ['--serve', '--bad'], ['--serve', '--port'],
    ...['0', '65536', '1.5', 'no', '-1'].map(port => ['--serve', '--port', port])]) assert.throws(() => demoOptions(args), /Usage:/);
});

test('localhost resolves to the owned Next listener and an occupied port refuses without fallback', async () => {
  const { startServer } = await import('../../scripts/next/server.mjs');
  const server = await startServer(app, { host: 'localhost' });
  let url;
  try {
    url = server.url; assert.match(url, /^http:\/\/localhost:\d+$/);
    assert.equal((await globalThis.fetch(url)).status, 200);
  } finally { await server.stop(); }
  await assert.rejects(globalThis.fetch(url));
  const blocker = createServer();
  await new Promise(resolve => blocker.listen(0, 'localhost', resolve));
  const port = blocker.address().port;
  try { await assert.rejects(startServer(app, { host: 'localhost', port }), /already in use/); }
  finally { await new Promise(resolve => blocker.close(resolve)); }
});
