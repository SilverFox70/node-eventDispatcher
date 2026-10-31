const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { join } = require('node:path');
const { writeFileSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const app = process.env.FBP_NEXT_APP, evidence = process.env.FBP_NEXT_EVIDENCE;
const requireApp = createRequire(join(app, 'package.json'));
let browser, server;
const wait = ms => new Promise(resolve => globalThis.setTimeout(resolve, ms));
async function until(check) {
  for (let i = 0; i < 200; i++) { if (check()) return; await wait(25); }
  assert.fail('Inspection lifecycle observation missing');
}
before(async () => {
  const { startServer } = await import('../../scripts/next/server.mjs');
  server = await startServer(app, { coverage: join(evidence, 'v8-server'), log: join(evidence, 'server-inspector.log') });
  browser = await requireApp('playwright').chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); await server?.stop(); });
async function open() {
  const context = await browser.newContext();
  await context.route('**/*', route => new globalThis.URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.coverage.startJSCoverage({ resetOnNavigation: false });
  async function capture() {
    const entries = (await page.coverage.stopJSCoverage()).filter(item => item.url.includes('/_next/static/')).map(item => ({ ...item,
      url: pathToFileURL(join(app, '.next', item.url.split('/_next/')[1])).href }));
    writeFileSync(join(evidence, `browser-inspector-${Date.now()}.json`), JSON.stringify({ result: entries }));
  }
  return { context, page,
    async checkpoint() { await capture(); await page.coverage.startJSCoverage({ resetOnNavigation: false }); },
    async close() { await capture(); await context.close(); }
  };
}

test('graphs and event relationships visualized: SVG/text parity, selection, inert labels and automatic updates', async () => {
  const view = await open();
  try {
    await view.page.goto(server.url + '/inspector');
    await view.page.getByRole('heading', { name: 'Graph and event inspector' }).waitFor({ timeout: 5000 });
    await view.page.getByText('Inspection: Live', { exact: true }).waitFor();
    assert.equal(await view.page.locator('[data-vertex]').count(), 4);
    assert.equal(await view.page.locator('[data-relationship]').count(), 3);
    assert.equal(await view.page.locator('[data-text-relationship]').count(), 3);
    const node = view.page.getByRole('button', { name: 'Inspect Load account', exact: true });
    await node.focus(); await node.press('Enter');
    assert((await view.page.getByTestId('inspection-details').textContent()).includes('json@1'));
    await node.press('Escape'); await node.press(' ');
    await view.page.getByRole('button', { name: 'Load account', exact: true }).click();
    assert.equal(await node.getAttribute('aria-pressed'), 'true');
    await view.page.screenshot({ path: join(evidence, 'inspector-graph.png'), fullPage: true });
    assert.equal(await view.page.locator('svg script, svg img').count(), 0);
    await view.page.getByLabel('Inspected source').selectOption('idle-definition');
    assert.equal(await view.page.locator('[data-vertex]').count(), 3);
    assert.equal((await view.page.getByTestId('inspection-run').textContent()).trim(), 'null');
    assert.equal(await view.page.getByTestId('inspection-details').textContent(), 'Choose an entity to inspect its metadata.');
    await view.page.getByLabel('Inspected source').selectOption('account-flow');
    assert((await view.page.getByTestId('inspection-run').textContent()).includes('runId'));
    // Establish a new demonstration after inspecting graphs; no refresh is used during mutations.
    await view.checkpoint();
    await view.page.reload();
    await view.page.getByText('Inspection: Live', { exact: true }).waitFor();
    await view.page.getByLabel('Inspected source').selectOption('account-events');
    assert.equal(await view.page.locator('[data-relationship="active"]').count(), 2);
    assert.equal(await view.page.locator('[data-relationship="declared"]').count(), 1);
    await view.page.getByRole('button', { name: 'Inspect welcome-screen', exact: true }).click();
    assert((await view.page.getByTestId('inspection-details').textContent()).includes('"once": true'));
    await view.page.getByRole('button', { name: 'welcome-screen', exact: true }).waitFor({ state: 'detached' });
    assert.equal(await view.page.locator('[data-relationship="active"]').count(), 1);
    assert.equal(await view.page.locator('[data-text-relationship="active"]').count(), 1);
    assert.equal(await view.page.getByTestId('inspection-details').textContent(), 'Choose an entity to inspect its metadata.');
    await view.page.getByRole('button', { name: 'account-screen', exact: true }).waitFor({ state: 'detached' });
    assert.equal(await view.page.locator('[data-text-relationship="active"]').count(), 0);
    await view.page.getByRole('button', { name: 'account-service', exact: true }).waitFor({ state: 'detached' });
    assert.equal(await view.page.locator('[data-relationship="declared"]').count(), 0);
    await view.page.getByRole('button', { name: 'new-screen', exact: true }).waitFor();
    assert.equal(await view.page.locator('[data-relationship="active"]').count(), 1);
    assert.equal(await view.page.locator('[data-text-relationship="active"]').count(), 1);
    assert((await view.page.getByRole('table').textContent()).includes('<img src=x onerror=alert(1)>'));
    assert.equal(await view.page.locator('svg img, section img, section script').count(), 0);
    await view.page.screenshot({ path: join(evidence, 'inspector.png'), fullPage: true });
    await until(() => server.logs().includes('FBP_INSPECTION_REFRESH'));
    const closes = (server.logs().match(/FBP_INSPECTION_CLOSED/g) ?? []).length;
    await view.page.getByRole('link', { name: 'Back to flow demo' }).click();
    await view.page.getByRole('heading', { name: 'NodeDispatcher in Next.js' }).waitFor();
    await until(() => (server.logs().match(/FBP_INSPECTION_CLOSED/g) ?? []).length > closes);
  } finally { await view.close(); }
});

test('schema and current request state: actual stream reconnect, invalid snapshot and navigation cleanup', async () => {
  const controller = new globalThis.AbortController();
  const response = await globalThis.fetch(server.url + '/api/inspection', { signal: controller.signal });
  assert.match(response.headers.get('content-type'), /text\/event-stream/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const reader = response.body.getReader(), decoder = new globalThis.TextDecoder();
  const text = decoder.decode((await reader.read()).value);
  const first = JSON.parse(text.match(/data: (.+)/)[1]);
  assert.equal(first.snapshot.sources.length, 3); assert(first.sequence > 0);
  assert(!text.includes('callback()')); controller.abort(); await reader.cancel().catch(() => {});
  const { startServer } = await import('../../scripts/next/server.mjs');
  const reconnectServer = await startServer(app, { shortInspectionLease: true, coverage: join(evidence, 'v8-server'), log: join(evidence, 'server-inspector-reconnect.log') });
  const view = await open();
  try {
    await view.page.goto(reconnectServer.url + '/inspector');
    await view.page.getByText('Inspection: Live', { exact: true }).waitFor();
    await view.page.getByText('Inspection: Disconnected — showing stale data', { exact: true }).waitFor();
    const opens = (reconnectServer.logs().match(/FBP_INSPECTION_OPEN/g) ?? []).length;
    await view.page.getByText('Inspection: Live', { exact: true }).waitFor();
    await until(() => (reconnectServer.logs().match(/FBP_INSPECTION_OPEN/g) ?? []).length > opens);
    // The original shared model validator rejects this stream; no private/schema evaluator runs in the browser.
    await view.page.route('**/api/inspection', route => route.fulfill({ contentType: 'text/event-stream',
      body: 'data: {"sequence":1,"snapshot":{"version":99,"sources":[]}}\n\n' }));
    await view.checkpoint();
    await view.page.reload();
    await view.page.getByText('Inspection: Invalid inspection data', { exact: true }).waitFor();
    assert.equal(await view.page.locator('[data-vertex]').count(), 0);
  } finally { await view.close(); await reconnectServer.stop(); }
});


test('invalid server inspection definition refuses before opening a stream or starting a run', async () => {
  const { startServer } = await import('../../scripts/next/server.mjs');
  const invalid = await startServer(app, { badInspection: true, coverage: join(evidence, 'v8-server'), log: join(evidence, 'server-inspector-invalid.log') });
  try {
    const response = await globalThis.fetch(invalid.url + '/api/inspection', { signal: globalThis.AbortSignal.timeout(5000) });
    assert.equal(response.status, 500);
    await until(() => invalid.logs().includes('Invalid fixed inspection graph'));
    assert(!invalid.logs().includes('FBP_INSPECTION_OPEN'));
  } finally { await invalid.stop(); }
});
