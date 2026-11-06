const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const browserFixture = require('./browser-fixture.cjs');
const createHTTP = require('./http-fixture.cjs');
let fixture, upstream;
before(async () => { upstream = await createHTTP(); fixture = await browserFixture('diagnostics', { pokemonBase: upstream.url }); });
after(async () => { await fixture?.close(); await upstream?.close(); });
const closeDialog = async page => { await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'detached' }); };
async function exported(page, button) {
  const waiting = page.waitForEvent('download', { timeout: 10000 }); await button.click();
  const download = await waiting; return readFileSync(await download.path(), 'utf8');
}

test('existing dialog links to keyboard-accessible prospective controls on the same run', async () => {
  const view = await fixture.open(), page = view.page, requests = [];
  page.on('request', request => { if (request.url().endsWith('/api/diagnostics') && request.method() === 'POST') requests.push(request.postDataJSON()); });
  try {
    await page.goto(fixture.server.url + '/inspector');
    await page.getByText('Connection: Live', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Inspect Load account', exact: true }).click();
    const link = page.getByRole('link', { name: 'Open live diagnostic controls', exact: true });
    assert.equal(await link.count(), 1, 'Node inspection must offer live capture controls, not only a read-only trace');
    await link.click(); await page.getByText('Connection: Live', { exact: true }).waitFor();
    const identity = await page.getByTestId('diagnostic-run').textContent();
    const node = page.getByRole('button', { name: 'Inspect Load account', exact: true });
    await node.focus(); await node.press('Enter');
    const modal = page.getByRole('dialog');
    await modal.getByText('Capture is off for this node. Only metadata is recorded.', { exact: true }).waitFor();
    const input = modal.getByLabel('Capture input data'); await input.focus(); await input.press(' ');
    await modal.getByText(/Epoch 2/).waitFor();
    assert.equal(await input.isChecked(), true); assert.equal(await modal.getByLabel('Capture output data').isChecked(), false);
    const request = requests.find(r => r.action === 'capture');
    assert.equal(request.nodeId, 'lookup'); assert.equal(request.sourceId, 'account-flow'); assert.equal(request.expectedEpoch, 1);
    assert.equal(request.inputs, true); assert.equal(request.outputs, false); assert(identity.includes(request.runId)); assert(request.sessionId && request.token);
    await closeDialog(page); await page.getByRole('button', { name: 'Send three test jobs', exact: true }).click();
    await page.getByText('Test jobs: 3/3 · Ready · Session active', { exact: true }).waitFor();
    assert.equal(await page.getByTestId('diagnostic-run').textContent(), identity);
    await node.click(); await modal.getByLabel('Diagnostic job').selectOption('demo-1-acct-101');
    assert((await modal.locator('pre').allTextContents()).some(text => text === '"acct-101"'));
    assert(!(await modal.textContent()).includes('Sample acct-101'));
    await modal.getByLabel('Capture output data').click(); await modal.getByText(/Epoch 3/).waitFor();
    const redacted = await exported(page, modal.getByRole('button', { name: 'Download run diagnostic JSONL' }));
    assert(!redacted.includes('"capture":')); assert(redacted.includes('"captureMode":"omitted"'));
    await modal.getByLabel('Include retained captures in download').check();
    const retained = await exported(page, modal.getByRole('button', { name: 'Download run diagnostic JSONL' }));
    assert(retained.includes('"capture":')); assert(retained.includes('"acct-101"'));
    assert(requests.filter(r => r.action === 'capture').every(r => r.nodeId === 'lookup'));
    await closeDialog(page); await page.getByRole('button', { name: 'Inspect Build summary', exact: true }).click();
    assert.equal(await modal.getByLabel('Capture input data').isChecked(), false);
    assert.equal(await modal.getByLabel('Capture output data').isChecked(), false);
    await closeDialog(page);
    for (let batch = 2; batch <= 10; batch++) {
      await page.getByRole('button', { name: 'Send three test jobs', exact: true }).click();
      await page.getByText(`Test jobs: ${batch * 3}/${batch * 3} · Ready · Session active`, { exact: true }).waitFor();
    }
    await node.click(); await modal.getByText(/older records were evicted/).waitFor();
    await closeDialog(page); await page.getByRole('button', { name: 'Send three test jobs', exact: true }).click();
    await page.getByRole('alert').waitFor();
    await page.getByLabel('Include retained captures in download').check();
    await page.getByRole('button', { name: 'Download diagnostic JSONL', exact: true }).click();
    await page.screenshot({ path: join(process.env.FBP_NEXT_EVIDENCE, 'diagnostic-controls.png'), fullPage: true });
  } finally { await view.close(); }
});

test('one HTTP branch captures real jobs while its sibling stays off; safe errors remain attributable', async () => {
  const view = await fixture.open(), page = view.page;
  try {
    await page.goto(fixture.server.url + '/diagnostics'); await page.getByText('Connection: Live', { exact: true }).waitFor();
    await page.getByLabel('Diagnostic example').selectOption('pokemon');
    await page.getByRole('button', { name: 'Inspect Fetch Pokémon stats', exact: true }).waitFor();
    await page.getByText('Connection: Live', { exact: true }).waitFor();
    const run = await page.getByTestId('diagnostic-run').textContent();
    await page.getByRole('button', { name: 'Inspect Fetch Pokémon stats', exact: true }).click();
    const modal = page.getByRole('dialog'); await modal.getByLabel('Capture input data').click(); await modal.getByText(/Epoch 2/).waitFor();
    await modal.getByLabel('Capture output data').click(); await modal.getByText(/Epoch 3/).waitFor();
    await closeDialog(page); await page.getByRole('button', { name: 'Send three test jobs' }).click();
    await page.getByText('Test jobs: 3/3 · Ready · Session active', { exact: true }).waitFor();
    assert.equal(await page.getByTestId('diagnostic-run').textContent(), run);
    await page.getByRole('button', { name: 'Inspect Fetch Pokémon stats', exact: true }).click();
    await modal.getByLabel('Diagnostic job').selectOption('demo-1-pikachu');
    const values = await modal.locator('pre').allTextContents();
    await page.screenshot({ path: join(process.env.FBP_NEXT_EVIDENCE, 'diagnostic-node-details.png') });
    assert(values.some(text => text === '"pikachu"')); assert(values.some(text => text.includes('"weight": 60')));
    assert(!(await modal.getByRole('region', { name: 'Retained diagnostic records' }).textContent()).includes('demo-1-charmander'));
    const region = modal.getByRole('region', { name: 'Retained diagnostic records' });
    assert.equal(await region.evaluate(element => globalThis.getComputedStyle(element).overflowY), 'auto');
    await modal.getByLabel('Include retained captures in download').check();
    const text = await exported(page, modal.getByRole('button', { name: 'Download run diagnostic JSONL' }));
    const events = text.trim().split('\n').flatMap(line => JSON.parse(line).events);
    assert(events.some(e => e.nodeId === 'species')); assert(events.filter(e => e.capture).every(e => e.nodeId === 'stats'));
    await closeDialog(page); await page.getByRole('button', { name: 'Inspect Fetch Pokémon species', exact: true }).click();
    await modal.getByText('Capture is off for this node. Only metadata is recorded.', { exact: true }).waitFor();
    assert((await modal.textContent()).includes('Payload was not captured at this transfer.'));
    await closeDialog(page);
    const causal = page.getByRole('region', { name: 'Causal explanation' });
    const subject = causal.getByLabel('Input or output');
    async function selectPacket(label) {
      const option = subject.getByRole('option', { name: label });
      await option.waitFor({ state: 'attached' });
      await subject.selectOption(await option.getAttribute('value'));
    }
    await selectPacket(/^Output · demo-1-pikachu/);
    const captured = causal.getByText('Captured payload', { exact: true });
    await captured.first().click();
    await causal.locator('pre:visible').first().waitFor();
    upstream.mode('large');
    await page.getByRole('button', { name: 'Send three test jobs' }).click();
    await page.getByText('Test jobs: 6/6 · Ready · Session active', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Inspect Fetch Pokémon stats', exact: true }).click();
    await modal.getByLabel('Diagnostic job').selectOption('demo-2-pikachu');
    await modal.getByText('Payload truncated; preview is not necessarily valid JSON.', { exact: true }).waitFor();
    await closeDialog(page);
    await selectPacket(/^Output · demo-2-pikachu/);
    await causal.getByText('Some captured payloads were truncated.', { exact: true }).waitFor();
    await causal.getByText('Truncated payload preview', { exact: true }).first().click();
    upstream.mode('stats-error'); await page.getByRole('button', { name: 'Start a new run' }).click();
    await page.waitForFunction(old => !globalThis.document.querySelector('[data-testid="diagnostic-run"]')?.textContent?.includes(old), run);
    await page.getByText('Connection: Live', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Send three test jobs' }).click();
    await page.getByRole('button', { name: 'Inspect Fetch Pokémon stats', exact: true }).click();
    await modal.getByText('Code: COMPONENT_FAILED', { exact: true }).first().waitFor();
    assert((await modal.textContent()).includes('Operation ')); assert((await modal.textContent()).includes('Attempt 1'));
    assert(!(await modal.textContent()).includes('HTTP 503')); assert(!(await modal.textContent()).includes('Unavailable'));
    await modal.getByLabel('Diagnostic job').selectOption('demo-1-pikachu');
    await modal.getByText('Code: COMPONENT_FAILED', { exact: true }).first().waitFor();
    await closeDialog(page);
    await selectPacket(/^Input · demo-1-pikachu/);
    await causal.getByText('Run failed', { exact: false }).waitFor();
    await causal.getByText(/stats · attempt-finished · failed.*COMPONENT_FAILED/).waitFor();
  } finally { upstream.mode('success'); await view.close(); }
});

test('changing source during held HTTP work cancels it and never merges old records into the new run', { timeout: 25000 }, async () => {
  const view = await fixture.open(), page = view.page;
  try {
    upstream.mode('hold'); await page.goto(fixture.server.url + '/diagnostics');
    await page.getByText('Connection: Live', { exact: true }).waitFor(); await page.getByLabel('Diagnostic example').selectOption('pokemon');
    await page.getByRole('button', { name: 'Inspect Fetch Pokémon stats', exact: true }).waitFor();
    await page.getByText('Connection: Live', { exact: true }).waitFor();
    const old = await page.getByTestId('diagnostic-run').textContent();
    await page.getByRole('button', { name: 'Send three test jobs' }).click(); await upstream.entered();
    await page.getByLabel('Diagnostic example').selectOption('account');
    await page.getByRole('button', { name: 'Inspect Load account', exact: true }).waitFor();
    await page.getByText('Connection: Live', { exact: true }).waitFor(); await upstream.idle();
    assert.notEqual(await page.getByTestId('diagnostic-run').textContent(), old);
    await page.getByRole('button', { name: 'Inspect Load account', exact: true }).click();
    assert(!(await page.getByRole('dialog').textContent()).includes('demo-1-pikachu'));
    await closeDialog(page); await page.getByRole('link', { name: 'Back to graph inspector' }).click();
    await page.getByRole('heading', { name: 'Graph and execution inspector' }).waitFor();
  } finally { upstream.mode('success'); await view.close(); }
});

test('causal inspector traces both join branches and distinguishes a declared drop from an output', async () => {
  const view = await fixture.open(), page = view.page;
  try {
    await page.addInitScript(() => {
      const NativeEventSource = globalThis.EventSource;
      globalThis.EventSource = class extends NativeEventSource {
        constructor(url) { super(url); globalThis.causalConnection = this; }
      };
    });
    await page.goto(fixture.server.url + '/diagnostics');
    await page.getByLabel('Diagnostic example').selectOption('causal');
    await page.getByText(/Source causal-flow/).waitFor();
    await page.getByText('Connection: Live', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Send three test jobs' }).click();
    await page.getByText('Outputs: 2/3 · Ready · Session active', { exact: true }).waitFor();
    const panel = page.getByRole('region', { name: 'Causal explanation' });
    const selection = panel.getByLabel('Input or output');
    const output = await selection.getByRole('option', { name: /^Output · demo-1-6/ }).getAttribute('value');
    await selection.selectOption(output);
    await panel.getByText(/left · attempt-finished · succeeded/).waitFor();
    await panel.getByText(/right · attempt-finished · succeeded/).waitFor();
    await panel.getByText(/input-admitted · eligibility.in/).waitFor();
    assert.equal(await panel.getByText('Some payloads were not captured.').count(), 1);
    const input = await selection.getByRole('option', { name: /^Input · demo-1-4/ }).getAttribute('value');
    await selection.selectOption(input);
    await panel.getByText(/Filter observed drop/).waitFor();
    await panel.getByText(/Node reported drop · BELOW_THRESHOLD · rule v1/).waitFor();
    assert.equal(await panel.getByText(/join.out/).count(), 0);
    await page.evaluate(() => globalThis.causalConnection.dispatchEvent(new globalThis.Event('error')));
    await panel.getByText(/connection was interrupted/).waitFor();
    await panel.getByText('Evidence: Partial').waitFor();
    await page.evaluate(() => globalThis.causalConnection.dispatchEvent(new globalThis.Event('open')));
    await page.getByText('Connection: Live', { exact: true }).waitFor();
    for (let batch = 2; batch <= 7; batch++) {
      await page.getByRole('button', { name: 'Send three test jobs' }).click();
      await page.getByText(`Outputs: ${batch * 2}/${batch * 3} · Ready · Session active`, { exact: true }).waitFor();
    }
    await panel.getByText('The selected packet is no longer retained.').waitFor();
    await page.getByRole('button', { name: 'Start a new run' }).click();
    await page.getByText('Connection: Live', { exact: true }).waitFor();
    assert.equal(await selection.inputValue(), '');
    assert.equal(await panel.getByText(/BELOW_THRESHOLD/).count(), 0);
  } finally { await view.close(); }
});
