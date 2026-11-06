const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const { writeFileSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { join } = require('node:path');

test('visual editor places and selects registered nodes without starting factories', async () => {
  const app = process.env.FBP_NEXT_APP;
  const evidence = process.env.FBP_NEXT_EVIDENCE;
  const requireApp = createRequire(join(app, 'package.json'));
  const nodeRun = spawnSync(process.execPath, ['--conditions=react-server', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { paletteEntries } from 'event-driven-design-editor/model';
    import { catalog, inventory } from './lib/editor-catalog.ts';
    import { packet } from 'event-driven-design';
    import { runNode } from 'event-driven-design/testing';
    assert.equal(paletteEntries(catalog)[0].identity, 'inventory-alert@1');
    const result = await runNode(inventory, { config: { threshold: 5 }, inputs: { stock: [packet({ quantity: 4 })] } });
    assert.equal(result.terminal.status, 'completed');
    assert.deepEqual(result.outputs.alert[0].value, { low: true });
  `], { cwd: app, encoding: 'utf8', timeout: 20000 });
  assert.equal(nodeRun.status, 0, nodeRun.stderr);
  assert.match(nodeRun.stdout, /FBP_EDITOR_FACTORY_CALLED/);
  const { startServer } = await import('../../scripts/next/server.mjs');
  const server = await startServer(app, {
    nextPath: process.env.FBP_NEXT_PATH,
    coverage: join(evidence, 'v8-server'),
    log: join(evidence, 'server-editor.log'),
  });
  let browser;
  try {
    browser = await requireApp('playwright').chromium.launch();
    const page = await browser.newPage();
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    assert.equal((await page.goto(server.url + '/editor')).status(), 200);
    await page.getByRole('button', { name: 'Add Inventory Alert', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: /Add <script>/ }).count(), 0);
    await page.getByText('Select a node to inspect its ports.').waitFor();
    assert.equal((await page.goto(server.url + '/editor?specimens=1')).status(), 200);
    await page.getByRole('button', { name: 'Add Inventory Alert', exact: true }).click();
    await page.getByRole('button', { name: 'Add Inventory Alert', exact: true }).press('Enter');
    assert.equal(await page.getByRole('button', { name: /Select Inventory Alert/ }).count(), 2);
    await page.getByRole('button', { name: 'Select Inventory Alert · node-3', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Select Inventory Alert · node-4', exact: true }).waitFor();
    const canvas = page.getByRole('region', { name: 'Graph canvas' });
    await canvas.locator('.nodeflow-card').filter({ hasText: 'Inventory Alert' }).first().click();
    assert.equal(await page.getByRole('button', { name: /Select Inventory Alert/ }).first().getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: /Select Inventory Alert/ }).last().press('Enter');
    await page.getByRole('region', { name: 'Selected node' }).getByText('stock · object').waitFor();
    await page.getByRole('region', { name: 'Selected node' }).getByText('alert · object').waitFor();
    await page.getByText('Unavailable · retired-alert@1').first().waitFor();
    await page.screenshot({ path: join(evidence, 'editor-canvas.png'), fullPage: true });
    await page.getByRole('button', { name: /Select Unavailable/ }).press('Enter');
    await page.getByRole('heading', { name: 'Unavailable component' }).waitFor();
    assert.equal(await page.getByText('<script>alert(1)</script>', { exact: true }).count(), 1);
    assert.equal(await page.locator('script').filter({ hasText: /^alert\(1\)$/ }).count(), 0);
    await page.getByRole('button', { name: 'Add <script>alert(1)</script>', exact: true }).press('Enter');
    const details = page.getByRole('region', { name: 'Selected node' });
    await details.getByText('None', { exact: true }).waitFor();
    await details.getByText('raw · JSON', { exact: true }).waitFor();
    await details.getByText('sample · number | null', { exact: true }).waitFor();
    assert(!server.logs().includes('FBP_EDITOR_FACTORY_CALLED'));
    assert.deepEqual(errors, []);
    const coverage = await page.coverage.stopJSCoverage();
    const result = coverage.filter(item => item.url.includes('/_next/static/')).map(item => ({
      ...item, url: pathToFileURL(join(app, '.next', item.url.split('/_next/')[1])).href,
    }));
    writeFileSync(join(evidence, 'browser-editor.json'), JSON.stringify({ result }));
  } finally {
    await browser?.close();
    await server.stop();
  }
});
