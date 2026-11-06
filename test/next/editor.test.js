const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const { writeFileSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { join } = require('node:path');
const { verifyConfigurationMarkup, verifyConfigurationModel, verifyRoute, verifySettings, verifySpecimens } = require('./editor-configuration.cjs');
const { verifyRunProtocol, verifyRunAdmission, verifyEditorRun } = require('./editor-run.cjs');
const { verifyLiveEditor, verifyLiveMarkupAndHost, verifyLiveModel } = require('./editor-live.cjs');
const { verifyWalkthrough } = require('./editor-walkthrough.cjs');
const proveDocument = require('./editor-document.cjs');

async function captureEditorCoverage(page, app, evidence, scenario) {
  const coverage = await page.coverage.stopJSCoverage();
  const result = coverage.filter(item => item.url.includes('/_next/static/')).map(item => ({
    ...item, url: pathToFileURL(join(app, '.next', item.url.split('/_next/')[1])).href,
  }));
  writeFileSync(join(evidence, `browser-editor-${scenario}.json`), JSON.stringify({ result }));
}

async function editTwoAlerts(page) {
  const add = page.getByRole('button', { name: 'Add Inventory Alert', exact: true });
  await add.click();
  await add.press('Enter');
  const first = page.locator('.react-flow__node[data-id="node-1"]');
  const second = page.locator('.react-flow__node[data-id="node-2"]');
  const bounds = await first.boundingBox();
  const other = await second.boundingBox();
  const position = card => card.evaluate(node => node.style.transform);
  const otherPosition = await position(second);
  await page.mouse.move(bounds.x + 55, bounds.y + 18);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 105, bounds.y + 68, { steps: 6 });
  await page.mouse.up();
  const moved = await first.boundingBox();
  assert(moved.x > bounds.x + 30 && moved.y > bounds.y + 30);
  const after = await second.boundingBox();
  assert(Math.abs(after.x - other.x) < 2 && Math.abs(after.y - other.y) < 2);
  assert.equal(await position(second), otherPosition);
  const movedPosition = await position(first);

  const wire = page.getByRole('form', { name: 'Connect ports' });
  await wire.getByLabel('From output').selectOption({ label: 'node-1 · alert' });
  await wire.getByLabel('To input').selectOption({ label: 'node-2 · stock' });
  await wire.getByLabel('Capacity').fill('257');
  await wire.getByRole('button', { name: 'Connect' }).click();
  await page.getByRole('alert').filter({ hasText: 'INVALID_CAPACITY' }).waitFor();
  await wire.getByLabel('Capacity').fill('16');
  await wire.getByRole('button', { name: 'Connect' }).click();
  const edge = page.getByRole('list', { name: 'Connections' }).getByText('node-1.alert → node-2.stock');
  await edge.waitFor();
  const expose = page.getByRole('form', { name: 'Expose port' });
  await expose.getByRole('combobox').selectOption({ label: 'in · node-1 · stock' });
  await expose.getByLabel('Graph port name').fill('incoming');
  await expose.getByRole('button', { name: 'Expose', exact: true }).click();
  const exposed = page.getByRole('list', { name: 'Exposed ports' });
  const incoming = exposed.getByText('incoming · node-1.stock');
  await incoming.waitFor();
  await page.getByRole('button', { name: 'Select Inventory Alert · node-1', exact: true }).click();
  await page.getByRole('button', { name: 'Delete selected node' }).click();
  await first.waitFor({ state: 'detached' });
  await incoming.waitFor({ state: 'detached' });
  await edge.waitFor({ state: 'detached' });
  assert.equal(await position(second), otherPosition);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await edge.waitFor();
  await incoming.waitFor();
  await page.locator('.react-flow__edge').waitFor();
  assert.equal(await position(first), movedPosition);
  assert.equal(await position(second), otherPosition);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await edge.waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await edge.waitFor();
  await page.getByRole('button', { name: 'Select Inventory Alert · node-1', exact: true }).click();
  await page.getByRole('group', { name: 'Move selected node' }).getByRole('button', { name: 'Left' }).press('Enter');
  assert.notEqual(await position(first), movedPosition);
  assert.equal(await position(second), otherPosition);
  await page.getByRole('button', { name: 'Disconnect node-1.alert → node-2.stock' }).click();
  await edge.waitFor({ state: 'detached' });
  const firstOutput = first.locator('[data-handleid="alert"]');
  const secondInput = second.locator('[data-handleid="stock"]');
  await firstOutput.dragTo(secondInput);
  await edge.waitFor();

  await exposed.getByRole('button', { name: 'Unexpose inputs incoming' }).click();
  await wire.getByLabel('From output').selectOption({ label: 'node-2 · alert' });
  await wire.getByLabel('To input').selectOption({ label: 'node-1 · stock' });
  await wire.getByRole('button', { name: 'Connect' }).click();
  await page.getByRole('alert').filter({ hasText: 'CYCLE' }).waitFor();
  const connections = page.getByRole('list', { name: 'Connections' });
  assert.equal(await connections.getByRole('listitem').count(), 1);
  await edge.waitFor();
  await expose.getByRole('combobox').selectOption({ label: 'out · node-2 · alert' });
  await expose.getByLabel('Graph port name').fill('outgoing');
  await expose.getByRole('button', { name: 'Expose', exact: true }).click();
  await exposed.getByText('outgoing · node-2.alert').waitFor();
  await exposed.getByRole('button', { name: 'Unexpose outputs outgoing' }).click();

  await page.getByRole('checkbox', { name: 'Mark node-1 for group or copy' }).check();
  await page.getByRole('checkbox', { name: 'Mark node-2 for group or copy' }).check();
  const grouping = page.getByRole('form', { name: 'Group nodes' });
  await grouping.getByLabel('Group name').fill('Inventory pair');
  await grouping.getByRole('button', { name: 'Group marked nodes' }).click();
  await page.getByRole('list', { name: 'Node groups' }).getByText('Inventory pair · node-1, node-2').waitFor();
  await page.getByRole('button', { name: 'Ungroup Inventory pair' }).click();
  await page.getByRole('checkbox', { name: 'Mark node-1 for group or copy' }).uncheck();
  await page.getByRole('checkbox', { name: 'Mark node-1 for group or copy' }).check();
  await page.getByRole('button', { name: 'Copy marked nodes' }).click();
  await page.getByRole('button', { name: 'Paste nodes' }).click();
  await page.getByRole('list', { name: 'Connections' }).getByText('node-3.alert → node-4.stock').waitFor();
}

test('two Alert cards move independently and undo restores removed wiring without starting factories', async () => {
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
    const result = await runNode(inventory, { config: { threshold: 5 }, inputs: { stock: [packet({ quantity: 4, low: false })] } });
    assert.equal(result.terminal.status, 'completed');
    assert.deepEqual(result.outputs.alert[0].value, { quantity: 4, low: true });
  `], { cwd: app, encoding: 'utf8', timeout: 20000 });
  assert.equal(nodeRun.status, 0, nodeRun.stderr);
  assert.match(nodeRun.stdout, /FBP_EDITOR_FACTORY_CALLED/);
  proveDocument(app);
  verifyLiveModel(app);
  verifyLiveMarkupAndHost(app);
  verifyRunProtocol(app);
  verifyConfigurationModel(app);
  verifyConfigurationMarkup(app);
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
    await page.coverage.startJSCoverage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    assert.equal((await page.goto(server.url + '/editor')).status(), 200);
    await page.getByRole('button', { name: 'Add Inventory Alert', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: /Add <script>/ }).count(), 0);
    await page.getByText('Select a node to inspect its ports.').waitFor();
    await editTwoAlerts(page);
    // Both routes load the same chunks. Keep captures separate so one navigation cannot replace the other.
    await captureEditorCoverage(page, app, evidence, 'commands');
    await page.coverage.startJSCoverage();
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
    await captureEditorCoverage(page, app, evidence, 'specimens');
    await verifyRoute(page, server.url);
    await page.coverage.startJSCoverage();
    await verifySettings(page, server.url);
    await captureEditorCoverage(page, app, evidence, 'configuration');
    await page.coverage.startJSCoverage();
    await verifySpecimens(page, server.url);
    await captureEditorCoverage(page, app, evidence, 'configuration-specimens');
    await verifyRunAdmission(page, server, app);
    await page.coverage.startJSCoverage();
    await verifyEditorRun(page, server);
    await captureEditorCoverage(page, app, evidence, 'test-run');
    await page.coverage.startJSCoverage();
    await verifyLiveEditor(page, server);
    await captureEditorCoverage(page, app, evidence, 'live-run');
    assert(!server.logs().includes('FBP_EDITOR_FACTORY_CALLED'));
    await verifyWalkthrough(page, server);
  } finally {
    await browser?.close();
    await server.stop();
  }
});
