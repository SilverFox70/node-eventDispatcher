const assert = require('node:assert/strict');
const { createHash, randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');

function snapshot(app) {
  const child = spawnSync(process.execPath, ['--conditions=react-server', '--input-type=module', '-e',
    "import { fixtureGraph } from './lib/editor-run-fixture.ts'; console.log(JSON.stringify(fixtureGraph));"],
  { cwd: app, encoding: 'utf8', timeout: 20000 });
  assert.equal(child.status, 0, child.stderr);
  return JSON.parse(child.stdout);
}
const digest = graph => createHash('sha256').update(JSON.stringify(graph)).digest('hex');
const countLookups = server => server.logs().split('FBP_EDITOR_TEST_LOOKUP').length - 1;

function verifyRunProtocol(app) {
  const child = spawnSync(process.execPath, ['--conditions=react-server', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    const path = new URL('./runs/protocol.js', import.meta.resolve('event-driven-design-editor/model'));
    const { readRunResult, requestRun, hashDraft } = await import(path);
    const valid = { revision: 2, graphHash: 'hash', runId: 'run', terminal: { status: 'completed' }, outputs: { result: [] } };
    for (const broken of [null, { ...valid, revision: 1 }, { ...valid, graphHash: 'other' }, { ...valid, runId: 0 },
      { ...valid, terminal: null }, { ...valid, terminal: { status: 'running' } }, { ...valid, outputs: null },
      { ...valid, outputs: [] }, { ...valid, outputs: 'wrong' }, { ...valid, outputs: { result: 4 } }]) {
      assert.throws(() => readRunResult(broken, 2, 'hash'), /INVALID_RUN_RESULT/);
    }
    assert.equal(readRunResult(valid, 2, 'hash'), valid);
    assert.match(await hashDraft({ version: 2, nodes: [], edges: [], inputs: {}, outputs: {} }), /^[0-9a-f]{64}$/);
    const { POST, DELETE } = await import('./app/api/editor/test-run/route.ts');
    for (const method of [POST, DELETE]) {
      const response = await method(new Request('http://localhost/api/editor/test-run', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: '{',
      }));
      assert.equal(response.status, 400);
    }
    globalThis.fetch = async () => Response.json(null, { status: 502 });
    await assert.rejects(requestRun('/test', {}), /RUN_REQUEST_FAILED/);
  `], { cwd: app, encoding: 'utf8', timeout: 20000 });
  assert.equal(child.status, 0, child.stderr);
  const markup = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { createElement } from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    const path = new URL('./runs/report.js', import.meta.resolve('event-driven-design-editor/model'));
    const { RunReport } = await import(path);
    const { canCancelTest } = await import(new URL('./panel.js', path));
    for (const [pending, cancelling, expected] of [
      [false, false, false], [false, true, false], [true, false, true], [true, true, false],
    ]) assert.equal(canCancelTest(pending, cancelling), expected);
    const render = props => renderToStaticMarkup(createElement(RunReport, { revision: 2, ...props }));
    assert.equal(render({}), '');
    assert.match(render({ issue: 'Invalid input' }), /role="alert">Invalid input/);
    const result = { revision: 2, graphHash: 'hash', runId: 'run', terminal: { status: 'completed' },
      outputs: { result: [{ value: 5 }] } };
    const completed = render({ result });
    assert.match(completed, /result · 1 packets/);
    assert(!completed.includes('earlier draft'));
    const cancelled = render({ result: { ...result, revision: 1,
      terminal: { status: 'cancelled', code: 'CANCELLED' }, outputs: {} } });
    assert.match(cancelled, /Test cancelled · CANCELLED/);
    assert.match(cancelled, /earlier draft/);
  `], { cwd: app, encoding: 'utf8', timeout: 20000 });
  assert.equal(markup.status, 0, markup.stderr);
}

async function verifyRunAdmission(page, server, app) {
  const endpoint = server.url + '/api/editor/test-run';
  const graph = snapshot(app);
  const valid = { id: randomUUID(), revision: 4, graph, graphHash: digest(graph), profile: 'fixtures@1', inputs: { item: ['slow'] } };
  async function refuse(data, status, code) {
    const response = await page.request.post(endpoint, { data });
    assert.equal(response.status(), status);
    assert.deepEqual(await response.json(), { code });
  }
  const before = countLookups(server);
  for (const body of [null, {}, [], { ...valid, revision: 1.5 }, { ...valid, revision: '1' }, { ...valid, capture: 'yes' }, { ...valid, revision: -1 }, { ...valid, id: 'bad' }, { ...valid, graphHash: 7 }]) {
    await refuse(body, 400, 'INVALID_ARGUMENT');
  }
  await refuse({ ...valid, profile: 'network' }, 403, 'PROFILE_FORBIDDEN');
  await refuse({ ...valid, graphHash: 'old' }, 409, 'STALE_GRAPH');
  for (const input of [null, {}, { unknown: ['chair'] }, { item: 'chair' }, { item: [3] }, { item: Array(101).fill('chair') }]) {
    await refuse({ ...valid, inputs: input }, 422, 'INVALID_INPUT');
  }
  const unknown = { ...graph, nodes: graph.nodes.map(node => ({ ...node, component: 'untrusted@1' })) };
  await refuse({ ...valid, graph: unknown, graphHash: digest(unknown) }, 422, 'INVALID_GRAPH');
  const forbidden = { ...graph, nodes: graph.nodes.map(node => ({ ...node, config: { credentials: 'private' } })) };
  await refuse({ ...valid, graph: forbidden, graphHash: digest(forbidden) }, 403, 'HOST_BINDING_FORBIDDEN');
  assert.equal(countLookups(server), before);

  const malformed = { data: '{', headers: { 'content-type': 'application/json' } };
  assert.equal((await page.request.post(endpoint, malformed)).status(), 400);
  assert.equal((await page.request.delete(endpoint, malformed)).status(), 400);
  const split = name => ({ id: name, component: 'broadcast@1' });
  const from = (node, port) => ({ node, port });
  const branching = { version: 2, nodes: [split('a'), split('b'), split('c')],
    inputs: { item: from('a', 'in') },
    edges: [{ from: from('a', 'label'), to: from('b', 'in') }, { from: from('a', 'units'), to: from('c', 'in') }],
    outputs: Object.fromEntries(['b', 'c'].flatMap(node => ['label', 'units'].map(port => [node + port, from(node, port)]))),
  };
  await refuse({ ...valid, graph: branching, graphHash: digest(branching), inputs: { item: Array(100).fill('chair') } },
    422, 'RUN_FAILED');

  const running = page.request.post(endpoint, { data: valid });
  for (let attempt = 0; attempt < 100 && countLookups(server) < before + 2; attempt++) {
    await new Promise(resolve => globalThis.setTimeout(resolve, 10));
  }
  assert.equal(countLookups(server), before + 2);
  await refuse({ ...valid, id: randomUUID() }, 429, 'RUN_QUOTA');
  assert.equal(countLookups(server), before + 2);
  const cancel = id => page.request.delete(endpoint, { data: { id } });
  assert.equal((await cancel('bad')).status(), 400);
  assert.equal((await cancel(randomUUID())).status(), 404);
  assert.equal((await cancel(valid.id)).status(), 202);
  const stopped = await running;
  assert.equal(stopped.status(), 200);
  const report = await stopped.json();
  assert.deepEqual(report.terminal, { status: 'cancelled', code: 'CANCELLED' });
  assert.equal(report.graphHash, valid.graphHash);
  assert.equal((await cancel(valid.id)).status(), 404);
}

async function verifyEditorRun(page, server) {
  const before = countLookups(server);
  await page.goto(server.url + '/editor?sample=1');
  const panel = page.getByRole('region', { name: 'Test draft' });
  const run = panel.getByRole('button', { name: 'Run test', exact: true });
  assert(await run.isDisabled());
  await panel.getByText('Walk through a fixture test', { exact: true }).press('Enter');
  const link = panel.getByRole('link', { name: 'Open a separate sample draft' });
  assert.equal(await link.getAttribute('target'), '_blank');
  await panel.getByRole('button', { name: 'Load fixture inputs' }).press('Enter');
  const input = panel.getByRole('textbox', { name: 'Test inputs as JSON' });
  assert.deepEqual(JSON.parse(await input.inputValue()), { item: ['chair', 'desk', 'lamp'] });
  assert.equal(countLookups(server), before);

  const wireList = page.getByRole('list', { name: 'Connections' });
  await wireList.getByRole('button', { name: 'Disconnect split.label → labels.in' }).click();
  const wire = page.getByRole('form', { name: 'Connect ports' });
  await wire.getByLabel('From output').selectOption({ label: 'split · label' });
  await wire.getByLabel('To input').selectOption({ label: 'labels · in' });
  await wire.getByRole('button', { name: 'Connect' }).click();
  await wireList.getByText('split.label → labels.in').waitFor();

  const validate = page.getByRole('button', { name: 'Validate draft' });
  await validate.click();
  await page.getByText('Backend validated this draft.', { exact: true }).waitFor();
  await input.fill('{');
  await run.click();
  await panel.getByText('Enter valid JSON before running the draft.').waitFor();
  await panel.getByRole('button', { name: 'Load fixture inputs' }).click();

  const sent = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/api/editor/test-run'));
  await run.click();
  const submission = (await sent).postDataJSON();
  const result = page.getByRole('region', { name: 'Test result' });
  await result.getByText('result · 3 packets').waitFor();
  assert.equal(submission.graphHash, digest(submission.graph));
  assert(submission.graph.edges.some(edge => edge.from.node === 'split' && edge.from.port === 'label' && edge.to.node === 'labels'));
  await result.getByText(submission.graphHash, { exact: true }).waitFor();
  const packets = JSON.parse(await result.locator('pre').textContent());
  assert.deepEqual(packets.map(packet => packet.value), [
    { label: 'CHAIR', units: 5 }, { label: 'DESK', units: 4 }, { label: 'LAMP', units: 4 },
  ]);
  assert.equal(new Set(packets.map(packet => packet.jobId)).size, 3);
  assert(packets.every(packet => packet.packetId && new Set(packet.parentPacketIds).size === 2));

  await input.fill(JSON.stringify({ item: ['slow'] }));
  const next = page.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/api/editor/test-run'));
  await run.click();
  await next;
  await panel.getByText('Test running…').waitFor();
  const exposed = page.getByRole('list', { name: 'Exposed ports' });
  await exposed.getByRole('button', { name: 'Unexpose outputs result' }).click();
  const expose = page.getByRole('form', { name: 'Expose port' });
  await expose.getByRole('combobox').selectOption({ label: 'out · join · out' });
  await expose.getByLabel('Graph port name').fill('updated');
  await expose.getByRole('button', { name: 'Expose', exact: true }).click();
  await result.getByText('These results belong to an earlier draft.').waitFor();
  await result.getByText('result · 1 packets').waitFor();

  await validate.click();
  await page.getByText('Backend validated this draft.', { exact: true }).waitFor();
  await input.fill(JSON.stringify({ item: ['chair'] }));
  await run.click();
  await result.getByText('updated · 1 packets').waitFor();

  await input.fill(JSON.stringify({ item: [3] }));
  await run.click();
  await panel.getByText('INVALID_INPUT', { exact: true }).waitFor();

  const starting = countLookups(server);
  await input.fill(JSON.stringify({ item: ['slow'] }));
  await run.click();
  for (let attempt = 0; attempt < 100 && countLookups(server) < starting + 2; attempt++) {
    await new Promise(resolve => globalThis.setTimeout(resolve, 10));
  }
  assert.equal(countLookups(server), starting + 2);
  let releaseCancel;
  const cancelResponse = new Promise(resolve => { releaseCancel = resolve; });
  const cancel = panel.getByRole('button', { name: 'Cancel test' });
  await page.route('**/api/editor/test-run', async route => {
    if (route.request().method() === 'DELETE') await cancelResponse;
    await route.continue();
  });
  try {
    await cancel.click();
    await panel.getByText('Cancelling test…', { exact: true }).waitFor();
    assert(await cancel.isDisabled());
    releaseCancel();
    await result.getByText('Test cancelled · CANCELLED', { exact: false }).waitFor();
  } finally {
    releaseCancel();
    await page.unroute('**/api/editor/test-run');
  }

  const nextStart = countLookups(server);
  await run.click();
  for (let attempt = 0; attempt < 100 && countLookups(server) < nextStart + 2; attempt++) {
    await new Promise(resolve => globalThis.setTimeout(resolve, 10));
  }
  assert.equal(countLookups(server), nextStart + 2);
  await page.route('**/api/editor/test-run', route => route.request().method() === 'DELETE'
    ? route.fulfill({ status: 404, json: { code: 'RUN_NOT_FOUND' } }) : route.continue());
  try {
    await panel.getByRole('button', { name: 'Cancel test' }).click();
    await panel.getByText('Cancellation could not be confirmed. Test connection closed.', { exact: true }).waitFor();
  } finally { await page.unroute('**/api/editor/test-run'); }

  await page.evaluate(() => {
    const fetch = globalThis.fetch;
    globalThis.fetch = (url, options) => url === '/api/editor/test-run' ? Promise.reject('fixture failure') : fetch(url, options);
  });
  await run.click();
  await panel.getByText('RUN_REQUEST_FAILED', { exact: true }).waitFor();
}

module.exports = { verifyRunProtocol, verifyRunAdmission, verifyEditorRun };
