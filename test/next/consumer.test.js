const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { readFileSync, readdirSync, writeFileSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');

const app = process.env.FBP_NEXT_APP, evidence = process.env.FBP_NEXT_EVIDENCE;
assert(app && evidence, 'Use npm run test:next to prepare the packed consumer.');
const requireApp = createRequire(join(app, 'package.json'));
const canary = 'FBP_PRIVATE_PROVIDER_8f705a91d3c64b4c';
let serverModule, browser;
const serverCoverage = join(evidence, 'v8-server'); mkdirSync(serverCoverage, { recursive: true });
async function start(mode = 'success', badCatalog = false) {
  return serverModule.startServer(app, { mode, badCatalog, coverage: serverCoverage, log: join(evidence, `server-${mode}-${badCatalog}.log`) });
}
async function post(server, value) {
  return globalThis.fetch(server.url + '/api/demo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: value });
}
const delay = ms => new Promise(resolve => globalThis.setTimeout(resolve, ms));
async function until(check) {
  for (let i = 0; i < 200; i++) { if (check()) return; await delay(25); }
  assert.fail('Expected server lifecycle observation missing.');
}
function assertAssets() {
  for (const file of walk(join(app, '.next/static')).filter(file => /\.(js|map)$/.test(file))) {
    const text = readFileSync(file, 'utf8');
    for (const forbidden of [canary, 'node:crypto', 'node:async_hooks', 'event-driven-design/dist/esm/runtime', 'event-driven-design/dist/esm/testing']) assert(!text.includes(forbidden), `${file} leaks ${forbidden}`);
  }
}
function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
}
before(async () => {
  serverModule = await import('../../scripts/next/server.mjs');
  browser = await requireApp('playwright').chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); });

async function pageFor(server) {
  const context = await browser.newContext();
  await context.route('**/*', route => {
    if (new globalThis.URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  await page.coverage.startJSCoverage({ resetOnNavigation: false });
  await page.goto(server.url); await page.getByRole('heading', { name: 'NodeDispatcher in Next.js' }).waitFor();
  return { page, async close() {
    const coverage = await page.coverage.stopJSCoverage();
    const entries = coverage.filter(item => item.url.includes('/_next/static/')).map(item => ({ ...item,
      url: pathToFileURL(join(app, '.next', item.url.split('/_next/')[1])).href }));
    writeFileSync(join(evidence, `browser-${Date.now()}.json`), JSON.stringify({ result: entries }));
    await context.close();
  } };
}

test('Next server executes fixed flow: strict input, bounded success and request attribution', async () => {
  const server = await start();
  try {
    for (const body of ['{', 'null', '[]', '2', '{}', '{"other":2}', '{"value":2,"extra":1}', '{"value":"two"}', '{"value":null}', '{"value":1e309}']) {
      const response = await post(server, body);
      assert.equal(response.status, 400); assert.deepEqual(await response.json(), { code: 'INVALID_INPUT' });
      const id = response.headers.get('x-flow-request-id'); assert.match(id, /^[0-9a-f-]{36}$/);
      await until(() => server.logs().includes('FBP_DEMO_REPLY ' + id + ' 400'));
      assert.equal(response.headers.get('x-flow-run-id'), null);
      assert(!server.logs().includes('FBP_DEMO_EFFECT ' + id));
    }
    const response = await post(server, '{"value":2}');
    assert.equal(response.status, 200); assert.deepEqual(await response.json(), { status: 'completed', value: 4 });
    assert.equal(response.headers.get('x-graph-revision'), 'demo@1');
    assert.match(response.headers.get('x-flow-run-id'), /^[0-9a-f-]{36}$/);
    await until(() => server.logs().includes('FBP_DEMO_REPLY ' + response.headers.get('x-flow-request-id') + ' 200'));
    assert.equal(server.logs().split('FBP_DEMO_EFFECT ' + response.headers.get('x-flow-request-id')).length - 1, 1);
    const view = await pageFor(server);
    try {
      const model = await import(pathToFileURL(join(app, 'node_modules/event-driven-design/dist/esm/model/index.js')));
      const metadata = JSON.parse(await view.page.getByTestId('graph-metadata').textContent());
      assert(model.validateGraph(metadata.spec, metadata.catalog).ok);
      const changed = JSON.parse(JSON.stringify(metadata.catalog));
      for (const side of ['in', 'out']) for (const port of Object.values(changed.components[0][side])) port.schema = { type: 'string' };
      assert(model.validateGraph(metadata.spec, changed).ok);
      const tampered = await post(server, '{"value":"accepted-by-fake-catalog"}');
      assert.equal(tampered.status, 400);
      await until(() => server.logs().includes('FBP_DEMO_REPLY ' + tampered.headers.get('x-flow-request-id') + ' 400'));
      assert(!server.logs().includes('FBP_DEMO_EFFECT ' + tampered.headers.get('x-flow-request-id')));
      assert.equal(await view.page.getByRole('button', { name: 'Run flow' }).isEnabled(), true);
      await view.page.getByRole('button', { name: 'Run flow' }).click();
      await view.page.getByText('Result: 4', { exact: true }).waitFor();
      await view.page.screenshot({ path: join(evidence, 'demo.png'), fullPage: true });
      assert((await view.page.getByRole('status').innerText()).includes('Graph: demo@1'));
      await view.page.getByLabel('Number').fill('3');
      await view.page.getByRole('button', { name: 'Run flow' }).click();
      await view.page.getByText('Result: 6', { exact: true }).waitFor();
      await view.page.getByLabel('Number').fill('2.5');
      await view.page.getByRole('button', { name: 'Run flow' }).click();
      await view.page.getByText('Result: 5', { exact: true }).waitFor();
      await view.page.route('**/api/demo', route => route.continue({ postData: '{"value":"wrong"}' }));
      await view.page.getByRole('button', { name: 'Run flow' }).click();
      await view.page.getByText('Backend: INVALID_INPUT', { exact: true }).waitFor();
      assert((await view.page.getByRole('status').innerText()).includes('Run: not started'));
      await view.page.unroute('**/api/demo');
      const overflow = await post(server, JSON.stringify({ value: Number.MAX_VALUE }));
      assert.equal(overflow.status, 500); const body = await overflow.json();
      assert.equal(body.code, 'FLOW_FAILED'); assert.equal(body.validation.direction, 'output');
      assert.equal(body.validation.componentId, 'double'); assert.equal(body.validation.nodeId, 'node');
      assert(metadata.spec.nodes.some(node => node.id === body.validation.nodeId));
      assert.equal(body.validation.port, 'out'); assert.equal(body.validation.runId, overflow.headers.get('x-flow-run-id'));
      assert(body.validation.issues.length > 0 && body.validation.issues.length <= 16);
      assert(!JSON.stringify(body).includes(canary));
      await view.page.getByLabel('Number').fill(String(Number.MAX_VALUE));
      await view.page.getByRole('button', { name: 'Run flow' }).click();
      await view.page.getByText('Backend: FLOW_FAILED', { exact: true }).waitFor();
      await view.page.getByText(/Validation:/).first().waitFor();
      await view.page.route('**/api/demo', route => route.abort());
      await view.page.getByRole('button', { name: 'Run flow' }).click();
      await view.page.getByText('Request unavailable', { exact: true }).waitFor();
      await view.page.unroute('**/api/demo');
    } finally { await view.close(); }
  } finally { await server.stop(); }
});

for (const [mode, status, code] of [['throw', 500, 'FLOW_FAILED'], ['timeout', 504, 'TIMEOUT']]) {
  test(`Next server executes fixed flow: ${mode} maps to ${status} without private details`, async () => {
    const server = await start(mode);
    try {
      const response = await post(server, '{"value":2}');
      assert.equal(response.status, status); assert.deepEqual(await response.json(), { code });
      const view = await pageFor(server);
      try {
        await view.page.getByRole('button', { name: 'Run flow' }).click();
        await view.page.getByText('Backend: ' + code, { exact: true }).waitFor();
        if (mode === 'timeout') {
          const before = (server.logs().match(/FBP_DEMO_EFFECT/g) ?? []).length;
          await view.page.getByRole('button', { name: 'Run flow' }).click();
          await until(() => (server.logs().match(/FBP_DEMO_EFFECT/g) ?? []).length > before);
          await view.page.getByRole('link', { name: 'Leave demo' }).click();
          await view.page.getByRole('heading', { name: 'Demo closed' }).waitFor();
          await until(() => server.logs().includes('cancelled'));
          await view.page.getByRole('link', { name: 'Back to demo' }).click();
          await view.page.getByRole('button', { name: 'Run flow' }).waitFor();
        }
      }
      finally { await view.close(); }
      if (mode === 'timeout') {
        const before = (server.logs().match(/FBP_DEMO_EFFECT/g) ?? []).length;
        const cancelled = (server.logs().match(/ cancelled/g) ?? []).length;
        const controller = new globalThis.AbortController();
        const pending = globalThis.fetch(server.url + '/api/demo', { method: 'POST', body: '{"value":2}', signal: controller.signal });
        const rejected = assert.rejects(pending, { name: 'AbortError' });
        await until(() => (server.logs().match(/FBP_DEMO_EFFECT/g) ?? []).length > before);
        controller.abort(); await rejected;
        await until(() => (server.logs().match(/ cancelled/g) ?? []).length > cancelled);
      }
    } finally { await server.stop(); }
  });
}

test('browser model isolated: invalid descriptors disable interaction; compiled client contains no server capability', async () => {
  const server = await start('success', true);
  try {
    const view = await pageFor(server);
    try { await view.page.getByText('Graph: Invalid graph metadata', { exact: true }).waitFor(); assert(await view.page.getByRole('button', { name: 'Run flow' }).isDisabled()); }
    finally { await view.close(); }
    const html = await (await globalThis.fetch(server.url)).text(); assert(!html.includes(canary));
    assertAssets();
    const chunk = walk(join(app, '.next/static')).find(file => file.endsWith('.js'));
    const original = readFileSync(chunk, 'utf8');
    try { writeFileSync(chunk, original + '\n/* ' + canary + ' */'); assert.throws(assertAssets, /leaks/); }
    finally { writeFileSync(chunk, original); }
    assertAssets();

  } finally { await server.stop(); }
});

test('current request wins even if a transport ignores cancellation', async () => {
  const { createLatestRequest } = await import(pathToFileURL(join(app, 'lib/latest-request.ts')));
  const pending = [], updates = [];
  const request = createLatestRequest(value => updates.push(value), (_, options) => new Promise((resolve, reject) => pending.push({ resolve, reject, options })));
  const first = request.run(2), second = request.run(3);
  assert(pending[0].options.signal.aborted);
  pending[1].resolve(new globalThis.Response(JSON.stringify({ status: 'completed', value: 6 })));
  await second;
  pending[0].resolve(new globalThis.Response(JSON.stringify({ status: 'completed', value: 4 })));
  await first;
  assert.deepEqual(updates, ['loading', 'loading', { reply: { status: 'completed', value: 6 }, requestId: '', graphRevision: '', runId: '' }]);
  request.cancel(); assert(pending[1].options.signal.aborted);
  const ignored = request.run(8); request.cancel(); pending[2].reject(Error('obsolete')); await ignored;
  assert.equal(updates.at(-1), 'loading');
  createLatestRequest(() => assert.fail('cancel should not publish')).cancel();
  const failed = createLatestRequest(value => updates.push(value), async () => { throw Error('private'); });
  await failed.run(1); assert.equal(updates.at(-1), 'unavailable'); failed.cancel();
});
