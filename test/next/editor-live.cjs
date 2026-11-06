const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

function verifyLiveModel(app) {
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    const path = new URL('./debug/live-model.js', import.meta.resolve('event-driven-design-editor/model'));
    const { readLiveSnapshot, freshTransfers, stageEvents, waitingPorts } = await import(path);
    const graph = { edges: [{ to: { node: 'join', port: 'one' } }, { to: { node: 'join', port: 'two' } }], inputs: {} };
    const session = { revision: 1, graphHash: 'hash', graph };
    const event = { sequence: 2, timeMs: 1, kind: 'received', channelId: 'edge:0',
      from: { node: 'a', port: 'out' }, to: { node: 'join', port: 'one' }, packetId: 'first',
      jobId: 'a', parentPacketIds: [], payloadState: 'omitted' };
    const other = { ...event, sequence: 3, jobId: 'b' };
    const trace = { version: 1, runId: 'run', total: 3, dropped: 1, payloads: false, events: [event, other] };
    const live = { revision: 1, graphHash: 'hash', status: 'running', trace };
    assert.equal(readLiveSnapshot(live, session), live);
    for (const bad of [null, { ...live, revision: 2 }, { ...live, graphHash: 'other' }, { ...live, status: '' },
      { ...live, status: 'other' }, { ...live, trace: { ...trace, events: [{ ...event, kind: 'scheduled' }, other] } }]) {
      assert.throws(() => readLiveSnapshot(bad, session), /INVALID_LIVE_SNAPSHOT/);
    }
    assert.deepEqual(freshTransfers(trace, 2, false), [other]);
    assert.deepEqual(freshTransfers(trace, 1, true), []);
    assert.deepEqual(stageEvents(trace.events, 'a', 'join'), [event]);
    assert.deepEqual(stageEvents(trace.events, 'a', ''), []);
    assert.deepEqual(waitingPorts(graph, [event], 'join'), ['two']);
    assert.deepEqual(waitingPorts(graph, [event], 'a'), []);
    assert.deepEqual(waitingPorts(graph, [], 'join'), []);
    assert.deepEqual(waitingPorts(graph, [event, { ...event, kind: 'sent' }], 'join'), []);
  `], { cwd: app, encoding: 'utf8', timeout: 20000 });
  assert.equal(child.status, 0, child.stderr);
}

function verifyLiveMarkupAndHost(app) {
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { createElement } from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    const { LiveRunPanel } = await import(new URL('./debug/live-panel.js', import.meta.resolve('event-driven-design-editor/model')));
    const session = { id: 'key', revision: 1, graphHash: 'hash', graph: { nodes: [{id:'join'}], inputs: {}, edges: [] } };
    const render = props => renderToStaticMarkup(createElement(LiveRunPanel, { session, revision: 1, chosenJob: '', stage: '',
      paused: false, setJob() {}, setStage() {}, setPaused() {}, ...props }));
    const { useLiveRun } = await import(new URL('./debug/use-live-run.js', import.meta.resolve('event-driven-design-editor/model')));
    function InitialView() {
      assert.equal(useLiveRun(undefined, undefined), undefined);
      return createElement('p', null, 'No active run');
    }
    assert.match(renderToStaticMarkup(createElement(InitialView)), /No active run/);
    assert.match(render({}), /Connecting live view/);
    const event = { sequence: 2, kind: 'sent', from: { node: 'join', port: 'out' }, to: null, packetId: 'p',
      jobId: 'a', parentPacketIds: ['parent'], payloadState: 'oversize' };
    const snapshot = { status: 'running', trace: { events: [event], runId: 'r', dropped: 1 } };
    const input = { ...event, kind: 'received', from: null, to: { node: 'join', port: 'one' } };
    const live = render({ chosenJob: 'a', stage: 'join', live: {
      connection: 'live', snapshot: { status: 'draining', trace: { events: [input], runId: 'r', dropped: 0 } },
    } });
    assert.match(live, /Live connection/);
    assert.match(live, /input → one/);
    const html = render({ revision: 2, chosenJob: 'a', paused: true, live: { snapshot, connection: 'disconnected', reconnected: true } });
    for (const phrase of ['earlier draft', 'History gap', 'too large to capture', 'Parents parent', 'Resume display']) {
      assert(html.includes(phrase), phrase);
    }
  `], { cwd: app, encoding: 'utf8', timeout: 20000 });
  assert.equal(child.status, 0, child.stderr);
  const host = spawnSync(process.execPath, ['--conditions=react-server', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { liveRuns } from './lib/editor-live-runs.ts';
    import { GET } from './app/api/editor/test-run/route.ts';
    const id = '00000000-0000-4000-8000-000000000000';
    const request = key => new Request('http://localhost/api/editor/test-run',
      key ? { headers: { 'x-flow-run-key': key } } : {});
    assert.equal(GET(request()).status, 400);
    liveRuns.begin(id);
    liveRuns.attach('other', 1, 'hash', {});
    liveRuns.finish('other');
    assert.equal(GET(request(id)).status, 404);
    liveRuns.attach(id, 1, 'hash', { snapshot: () => ({ status: 'running' }), trace: () => null });
    assert.equal(GET(request('00000000-0000-4000-8000-000000000001')).status, 404);
    assert.equal(GET(request(id)).headers.get('cache-control'), 'no-store');
    liveRuns.finish(id);
    const now = Date.now;
    Date.now = () => now() + 61000;
    assert.equal(GET(request(id)).status, 404);
    Date.now = now;
    liveRuns.begin(id);
    liveRuns.finish(id);
  `], { cwd: app, encoding: 'utf8', timeout: 20000 });
  assert.equal(host.status, 0, host.stderr);
}

async function verifyLiveEditor(page, server) {
  await page.goto(server.url + '/editor?sample=1');
  await page.evaluate(() => {
    globalThis.s30Document = 'same document';
    globalThis.s30AnimatedEdges = [];
    new globalThis.MutationObserver(() => {
      for (const edge of globalThis.document.querySelectorAll('.react-flow__edge.animated')) {
        globalThis.s30AnimatedEdges.push(edge.getAttribute('data-testid'));
      }
    }).observe(globalThis.document.body, { subtree: true, attributes: true, childList: true });
  });
  const test = page.getByRole('region', { name: 'Test draft' });
  const live = page.getByRole('region', { name: 'Live packet view' });
  const validate = page.getByRole('button', { name: 'Validate draft' });
  await validate.click();
  await page.getByText('Backend validated this draft.', { exact: true }).waitFor();
  await test.getByText('Walk through a fixture test', { exact: true }).click();
  await test.getByRole('button', { name: 'Load slow-branch input' }).click();
  assert.equal(await test.getByRole('checkbox', { name: 'Capture test payloads' }).isChecked(), false);
  await test.getByRole('checkbox', { name: 'Capture test payloads' }).check();
  await page.getByRole('button', { name: 'Select Join by key · join' }).click();
  await test.getByRole('button', { name: 'Run test' }).click();
  await live.getByText('Live connection', { exact: true }).waitFor();
  assert.equal(await live.getByLabel('Stage', { exact: true }).inputValue(), 'join');
  await live.getByText('Waiting for label.', { exact: true }).waitFor();
  const job = await live.getByLabel('Job', { exact: true }).inputValue();
  assert(job);
  await live.getByLabel('Job', { exact: true }).selectOption(job);
  const transfers = live.getByRole('list', { name: 'Packet transfers' });
  await transfers.locator('pre').filter({ hasText: /^4$/ }).waitFor();
  assert((await page.evaluate(() => globalThis.s30AnimatedEdges)).some(id => id?.includes('["units","out","join","units"]')));
  assert.equal(await transfers.getByText(/^sent/).count(), 0);

  // Fail the observation transport while the POST and its runtime continue independently.
  await page.route('**/api/editor/test-run', route => route.request().method() === 'GET'
    ? route.fulfill({ status: 503 }) : route.continue());
  await live.getByText('Live view disconnected. Reconnecting…', { exact: true }).waitFor();
  await live.getByRole('button', { name: 'Pause display' }).click();
  await page.unroute('**/api/editor/test-run');
  await live.getByText('Live view reconnected from the latest snapshot.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => globalThis.s30Document), 'same document');
  assert.equal(await live.getByLabel('Job', { exact: true }).inputValue(), job);
  await test.getByRole('region', { name: 'Test result' }).getByText(/^Test completed/).waitFor();
  await live.getByText('Waiting for label.', { exact: true }).waitFor();
  await live.getByRole('button', { name: 'Resume display' }).click();
  await live.getByText(/^Run completed · /).waitFor();
  assert.equal(await transfers.getByText(/^sent/).count(), 1);
  await live.getByLabel('Stage', { exact: true }).selectOption({ label: 'Final outputs' });
  await transfers.locator('pre').filter({ hasText: /"label": "SLOW"/ }).waitFor();

  await test.getByRole('checkbox', { name: 'Capture test payloads' }).uncheck();
  await test.getByRole('textbox', { name: 'Test inputs as JSON' }).fill(JSON.stringify({ item: ['chair', 'desk'] }));
  await test.getByRole('button', { name: 'Run test' }).click();
  await live.getByText(/^Run completed · /).waitFor();
  await page.getByRole('button', { name: 'Select Look up units · units' }).click();
  assert.equal(await live.getByLabel('Stage', { exact: true }).inputValue(), 'units');
  const jobs = await live.getByLabel('Job', { exact: true }).locator('option').evaluateAll(rows =>
    rows.map(row => row.value).filter(Boolean));
  assert.equal(jobs.length, 2);
  await live.getByLabel('Job', { exact: true }).selectOption(jobs[1]);
  assert.equal(await transfers.getByRole('listitem').count(), 2);
  assert.equal(await transfers.getByText('Payload not captured.', { exact: true }).count(), 2);
  await test.getByRole('textbox', { name: 'Test inputs as JSON' }).fill(JSON.stringify({ item: Array(20).fill('chair') }));
  await test.getByRole('button', { name: 'Run test' }).click();
  await live.getByText(/^Run completed · /).waitFor();
  await live.getByText(/History gap · [1-9]/).waitFor();
}

module.exports = { verifyLiveEditor, verifyLiveMarkupAndHost, verifyLiveModel };
