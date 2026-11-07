const assert = require('node:assert/strict');

async function verifySavedDraft(page, server, capture = async () => {}) {
  const url = server.url + '/editor?saved=1';
  const endpoint = server.url + '/api/editor/draft';
  const put = (data, origin = server.url) => page.request.put(endpoint, { data, headers: { origin } });
  assert.equal((await put({}, 'http://invalid.example')).status(), 403);
  for (const body of [null, {}, { expectedRevision: -1, graph: {}, layout: {} },
    { expectedRevision: null, graph: { version: 2 }, layout: {} },
    { expectedRevision: null, graph: { version: 1 }, layout: {} },
    { expectedRevision: null, graph: { version: 2, nodes: [] }, layout: {} }]) {
    assert.equal((await put(body)).status(), 400);
  }
  const empty = { graph: { version: 2, nodes: [], edges: [], inputs: {}, outputs: {} }, layout: { positions: {}, groups: {} } };
  assert.equal((await put({ expectedRevision: 0, ...empty })).status(), 404);
  for (const node of [{ id: 'a', component: 'missing@1' }, { id: 'a', component: 'inventory-alert@1', config: { credentials: 'refuse' } }]) {
    assert.equal((await put({ expectedRevision: null, ...empty, graph: { ...empty.graph, nodes: [node] } })).status(), 400);
  }
  const foreign = await page.request.get(url, { headers: { host: 'external.invalid' } });
  assert(!(await foreign.text()).includes('This local draft saves to SQLite.'));
  await page.goto(url);
  const saved = page.getByRole('region', { name: 'Saved draft' });
  await saved.getByText('No saved revision yet').waitFor();
  const [other] = await Promise.all([page.waitForEvent('popup'), page.getByRole('link', { name: 'Open saved draft in a new tab' }).click()]);
  try {
    await other.coverage.startJSCoverage();
    await other.reload();
    await other.getByText('No saved revision yet').waitFor();
    await other.getByRole('button', { name: 'Add Inventory Alert' }).click();
    await other.getByText('Saved revision 0').waitFor();
    await capture('draft-create', other);
    await page.getByRole('button', { name: 'Add Inventory Alert' }).click();
    await saved.getByText(/newer revision.*unsaved/).waitFor();
    await capture('draft-conflict');

    page.once('dialog', dialog => dialog.accept());
    await page.reload();
    await saved.getByText('Saved revision 0').waitFor();
    await page.getByRole('button', { name: 'Select Inventory Alert · node-1' }).click();
    await page.getByRole('button', { name: 'Right', exact: true }).click();
    await saved.getByText('Saved revision 1').waitFor();
    await capture('draft-first-save');
    const card = page.locator('.react-flow__node[data-id="node-1"]');
    const position = await card.evaluate(node => node.style.transform);
    await page.reload();
    await saved.getByText('Saved revision 1').waitFor();
    assert.equal(await card.evaluate(node => node.style.transform), position);
    assert.equal(await page.locator('.react-flow__node').count(), 1);

    await page.route('**/api/editor/draft', route => route.fulfill({ status: 503 }));
    await page.getByRole('button', { name: 'Select Inventory Alert · node-1' }).click();
    await page.getByRole('button', { name: 'Right', exact: true }).click();
    await saved.getByText('Save failed. Your edits are unsaved.').waitFor();
    await page.unroute('**/api/editor/draft');
    const badAck = page.waitForResponse(response => response.url() === endpoint && response.ok());
    await page.route('**/api/editor/draft', route => route.fulfill({ json: { revision: 99 } }), { times: 1 });
    await saved.getByRole('button', { name: 'Save draft now' }).click();
    await badAck;
    await saved.getByText('Save failed. Your edits are unsaved.').waitFor();
    await saved.getByRole('button', { name: 'Save draft now' }).click();
    await saved.getByText('Saved revision 2').waitFor();

    let release;
    const held = new Promise(resolve => { release = resolve; });
    const sent = page.waitForRequest(request => request.url() === endpoint && request.method() === 'PUT');
    await page.route('**/api/editor/draft', async route => {
      const response = await route.fetch();
      await held;
      await route.fulfill({ response });
    }, { times: 1 });
    await page.getByRole('button', { name: 'Right', exact: true }).click();
    await sent;
    await saved.getByText('Saving draft…').waitFor();
    try { await page.getByRole('button', { name: 'Right', exact: true }).click(); }
    finally { release(); }
    await saved.getByText('Saved revision 4').waitFor();
  } finally { await other.close(); }
}

module.exports = { verifySavedDraft };
