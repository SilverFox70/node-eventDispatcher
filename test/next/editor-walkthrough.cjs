const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');

async function verifyWalkthrough(page, server) {
  await page.goto(server.url + '/editor');
  const requests = [];
  const track = request => {
    if (request.method() === 'POST' && request.url().endsWith('/api/editor/test-run')) requests.push(request);
  };
  page.context().on('request', track);
  const guide = page.getByText('First-run walkthrough', { exact: true });
  await guide.press('Enter');
  const link = page.getByRole('link', { name: 'Open a separate practice draft' });
  await link.waitFor();
  await guide.press('Enter');
  await link.waitFor({ state: 'hidden' });
  await guide.press('Enter');
  const [sample] = await Promise.all([page.waitForEvent('popup'), link.press('Enter')]);
  try {
    await sample.getByText('Practice draft', { exact: true }).waitFor();
    const add = sample.getByRole('button', { name: 'Add Inventory Alert' });
    await add.press('Enter');
    await add.press('Enter');
    await sample.getByRole('button', { name: 'Left', exact: true }).press('Enter');
    await sample.getByRole('button', { name: 'Undo', exact: true }).press('Enter');
    await sample.getByRole('button', { name: 'Redo', exact: true }).press('Enter');

    for (const [id, threshold] of [['node-1', '5'], ['node-2', '2']]) {
      await sample.getByRole('button', { name: 'Select Inventory Alert · ' + id }).press('Enter');
      await sample.getByRole('spinbutton', { name: 'threshold' }).fill(threshold);
      await sample.getByRole('spinbutton', { name: 'threshold' }).press('Tab');
    }
    const connect = sample.getByRole('form', { name: 'Connect ports' });
    await connect.getByLabel('From output').selectOption({ label: 'node-1 · alert' });
    await connect.getByLabel('To input').selectOption({ label: 'node-2 · stock' });
    await connect.getByLabel('Capacity').fill('257');
    await connect.getByRole('button', { name: 'Connect' }).press('Enter');
    await sample.getByRole('alert').filter({ hasText: 'INVALID_CAPACITY' }).waitFor();
    await connect.getByLabel('Capacity').fill('16');
    await connect.getByRole('button', { name: 'Connect' }).press('Enter');
    const expose = sample.getByRole('form', { name: 'Expose port' });
    for (const [label, name] of [['in · node-1 · stock', 'incoming'], ['out · node-2 · alert', 'outgoing']]) {
      await expose.getByRole('combobox').selectOption({ label });
      await expose.getByLabel('Graph port name').fill(name);
      await expose.getByRole('button', { name: 'Expose', exact: true }).press('Enter');
    }
    await sample.getByRole('button', { name: 'Validate draft' }).press('Enter');
    await sample.getByText('Backend validated this draft.', { exact: true }).waitFor();
    assert.equal(requests.length, 0);
    await sample.getByRole('textbox', { name: 'Test inputs as JSON' }).fill('{"incoming":[{"quantity":4,"low":false}]}');
    await sample.getByRole('checkbox', { name: 'Capture test payloads' }).press('Space');
    await sample.getByRole('button', { name: 'Run test' }).press('Enter');
    const live = sample.getByRole('region', { name: 'Live packet view' });
    await live.getByText(/^Run completed · /).waitFor();
    const outputs = live.getByRole('list', { name: 'Packet transfers' });
    await live.getByLabel('Stage', { exact: true }).selectOption('node-1');
    await outputs.locator('pre').filter({ hasText: /"low": true/ }).waitFor();
    await live.getByLabel('Stage', { exact: true }).selectOption({ label: 'Final outputs' });
    await outputs.locator('pre').filter({ hasText: /"low": false/ }).waitFor();
    assert.equal(requests.length, 1);
    await verifyCloseDuringRun(page, sample, server);
  } finally {
    await sample.close();
    page.context().off('request', track);
  }
  assert.equal(await page.locator('.react-flow__node').count(), 0);
  await page.getByText(/current page session/).waitFor();
}

async function verifyCloseDuringRun(page, sample, server) {
  await sample.goto(server.url + '/editor?sample=1');
  await sample.getByRole('button', { name: 'Validate draft' }).press('Enter');
  await sample.getByText('Backend validated this draft.', { exact: true }).waitFor();
  await sample.getByRole('textbox', { name: 'Test inputs as JSON' }).fill('{"item":["slow"]}');
  const started = sample.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/api/editor/test-run'));
  await sample.getByRole('button', { name: 'Run test' }).press('Enter');
  const data = (await started).postDataJSON();
  await sample.getByText(/^Run draining · /).waitFor();
  await sample.close();
  const next = { ...data, id: randomUUID(), inputs: { item: ['chair'] } };
  for (let attempt = 0; attempt < 30; attempt++) {
    const response = await page.request.post(server.url + '/api/editor/test-run', { data: next });
    if (response.status() === 200) {
      assert.equal((await response.json()).terminal.status, 'completed');
      return;
    }
    assert.equal(response.status(), 429);
    await delay(30);
  }
  assert.fail('Closing the practice tab left the fixture run slot occupied.');
}

module.exports = { verifyWalkthrough };
