const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const app = process.env.FBP_NEXT_APP, evidence = process.env.FBP_NEXT_EVIDENCE;
let server;
before(async () => { const { startServer } = await import('../../scripts/next/server.mjs'); server = await startServer(app,
  { coverage: join(evidence, 'v8-server'), log: join(evidence, 'server-diagnostic-api.log') }); });
after(async () => { await server?.stop(); });
async function opened() {
  const abort = new globalThis.AbortController();
  const response = await globalThis.fetch(server.url + '/api/diagnostics?example=account', { signal: abort.signal });
  assert.equal(response.status, 200);
  const reader = response.body.getReader(), decoder = new globalThis.TextDecoder(); let buffer = '';
  const connection = { view: null, async next(until = () => true) {
    for (;;) {
      let split;
      while ((split = buffer.indexOf('\n\n')) >= 0) {
        const frame = JSON.parse(buffer.slice(0, split).match(/data: (.+)/)[1]); buffer = buffer.slice(split + 2);
        connection.view = frame.diagnostics;
        if (until(connection.view)) return connection.view;
      }
      const item = await reader.read(); assert(!item.done); buffer += decoder.decode(item.value, { stream: true });
    }
  }, async close() { await reader.cancel(); abort.abort(); } };
  await connection.next(); return connection;
}
function body(connection, extra = {}) {
  const view = connection.view;
  return { action: 'load', token: view.token, sourceId: view.sourceId, runId: view.runId,
    sessionId: view.session.sessionId, expectedEpoch: view.session.epoch, ...extra };
}
const post = (value, headers = {}) => globalThis.fetch(server.url + '/api/diagnostics', { method: 'POST',
  headers: { 'content-type': 'application/json', origin: server.url, ...headers }, body: typeof value === 'string' ? value : JSON.stringify(value) });
async function closed(connection) {
  const token = connection.view.token; await connection.close();
  const deadline = Date.now() + 5000;
  while (!server.logs().includes('FBP_INSPECTION_CLOSED ' + token)) {
    assert(Date.now() < deadline, 'owned stream must dispose'); await new Promise(globalThis.setImmediate);
  }
}

test('real control route rejects malformed, foreign and stale requests before effects', async () => {
  assert.equal((await globalThis.fetch(server.url + '/api/diagnostics?example=other')).status, 400);
  const connection = await opened();
  try {
    const initial = body(connection);
    for (const invalid of [null, [], {}, '{', 'x'.repeat(4097), { ...initial, extra: true }, { ...initial, action: 'other' },
      { ...initial, token: 1 }, { ...initial, expectedEpoch: 0 }, { ...initial, action: 'capture', nodeId: 'lookup', inputs: 1, outputs: false },
      { ...initial, action: 'export', includeCaptures: 'yes' }]) assert.equal((await post(invalid)).status, 400);
    assert.equal((await post(initial, { origin: 'https://elsewhere.invalid' })).status, 403);
    assert.equal((await globalThis.fetch(server.url + '/api/diagnostics', { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify(initial) })).status, 403);
    assert.equal((await post(initial, { 'content-type': 'text/plain' })).status, 400);
    for (const patch of [{ token: 'missing' }, { sourceId: 'other' }, { runId: 'other' }, { sessionId: 'other' }]) assert.equal((await post({ ...initial, ...patch })).status, 403);
    assert.equal((await post({ ...initial, expectedEpoch: 2 })).status, 409);
    const invalidNode = { ...initial, action: 'capture', nodeId: 'other', inputs: true, outputs: false };
    assert.equal((await post(invalidNode)).status, 400);
    await connection.next(view => view.records.total === 0); assert.equal(connection.view.submitted, 0);
    const changed = await post({ ...initial, action: 'capture', nodeId: 'lookup', inputs: true, outputs: false });
    assert.equal(changed.status, 200); connection.view = await changed.json(); assert.equal(connection.view.session.epoch, 2);
    assert.deepEqual(connection.view.session.effectiveRules, [{ nodeId: 'lookup', inputs: true, outputs: false }]);
    assert.equal((await post(initial)).status, 409);
    const loaded = await post(body(connection)); assert.equal(loaded.status, 200);
    assert.equal((await post(body(connection))).status, 409);
    await connection.next(view => view.completed === 3);
    for (let batch = 2; batch <= 10; batch++) {
      const result = await post(body(connection)); assert.equal(result.status, 200);
      await connection.next(view => view.completed === batch * 3);
    }
    assert.equal((await post(body(connection))).status, 409);
    assert(connection.view.records.dropped > 0);
    const exported = await post(body(connection, { action: 'export', includeCaptures: false }));
    assert.equal(exported.status, 200); assert.equal(exported.headers.get('content-type'), 'application/x-ndjson');
    assert(!((await exported.text()).includes('"capture":')));
  } finally { await closed(connection); }
  assert.equal((await post(body(connection))).status, 403);
});

test('connection ceiling releases on cancel; new connection cannot use prior identities', async () => {
  const connections = [];
  try {
    for (let i = 0; i < 16; i++) connections.push(await opened());
    assert.equal((await globalThis.fetch(server.url + '/api/diagnostics?example=account')).status, 409);
    const prior = connections.shift(); await closed(prior);
    const next = await opened(); connections.push(next);
    assert.notEqual(next.view.runId, prior.view.runId); assert.equal((await post(body(prior))).status, 403);
    assert.equal(next.view.records.total, 0); assert.equal(next.view.session.effectiveRules.length, 0);
  } finally { await Promise.all(connections.map(closed)); }
});


test('real route handler safely normalizes body-stream TypeError and unexpected failures', async () => {
  const { pathToFileURL } = require('node:url');
  const { command } = await import('../../scripts/next/process.mjs');
  const url = pathToFileURL(join(app,'app/api/diagnostics/route.ts')).href;
  const result = await command(process.execPath,['--conditions=react-server','--input-type=module','-e', `
    import assert from 'node:assert/strict';
    const { POST } = await import(${JSON.stringify(url)});
    for(const [ErrorType,status,code] of [[TypeError,400,'INVALID_ARGUMENT'],[Error,500,'UNAVAILABLE']]) {
      const body=new ReadableStream({start(controller){controller.error(new ErrorType('PRIVATE_STREAM_FAILURE'));}});
      const request=new Request('http://localhost:1234/api/diagnostics',{method:'POST',duplex:'half',body,
        headers:{origin:'http://127.0.0.1:1234',host:'127.0.0.1:1234','content-type':'application/json'}});
      const response=await POST(request);assert.equal(response.status,status);
      assert.deepEqual(await response.json(),{code});
    }
  `],{cwd:app,env:{NODE_V8_COVERAGE:join(evidence,'v8-test')}});
  assert.equal(result.code,0,result.output);
});
