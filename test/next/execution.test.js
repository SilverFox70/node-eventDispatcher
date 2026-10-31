const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const browserFixture = require('./browser-fixture.cjs');
const evidence = process.env.FBP_NEXT_EVIDENCE;
let fixture;
before(async () => { fixture = await browserFixture('execution'); });
after(async () => { await fixture?.close(); });

async function finalFrame(payloads) {
  const response = await globalThis.fetch(fixture.server.url + '/api/inspection?payloads=' + (payloads ? '1' : '0'), { signal: globalThis.AbortSignal.timeout(8000) });
  const reader = response.body.getReader(), decoder = new globalThis.TextDecoder(); let buffer = '';
  try {
    for (;;) {
      const part = await reader.read(); assert(!part.done, 'stream ended before graph completed'); buffer += decoder.decode(part.value, { stream: true });
      let split;
      while ((split = buffer.indexOf('\n\n')) >= 0) {
        const raw = buffer.slice(0, split); buffer = buffer.slice(split + 2);
        const frame = JSON.parse(raw.match(/data: (.+)/)[1]);
        const graph = frame.snapshot.sources.find(source => source.id === 'account-flow');
        if (graph.run.status === 'completed') return frame;
      }
    }
  } finally { await reader.cancel(); }
}

test('actual packet transfers, transformations, lineage and default/explicit payload capture compose through SSE', async () => {
  const hidden = await finalFrame(false), visible = await finalFrame(true);
  for (const [frame, payloads] of [[hidden, false], [visible, true]]) {
    const trace = frame.execution; assert.equal(trace.payloads, payloads); assert.equal(trace.total, 18);
    assert.equal(trace.runId, frame.snapshot.sources[0].run.runId);
    assert.deepEqual([...new Set(trace.events.map(event => event.jobId))].sort(), ['lookup-acct-101', 'lookup-acct-202', 'lookup-acct-303']);
    assert(trace.events.every(event => payloads ? event.payloadState === 'captured' : !Object.hasOwn(event, 'payload')));
    const job = trace.events.filter(event => event.jobId === 'lookup-acct-101');
    assert.deepEqual(job.map(event => event.kind), ['sent', 'received', 'sent', 'received', 'sent', 'received']);
    assert.deepEqual(job[2].parentPacketIds, [job[0].packetId]);
    assert.deepEqual(job[4].parentPacketIds, [job[2].packetId]);
    assert.notEqual(job[0].packetId, job[2].packetId);
    assert.equal(frame.snapshot.sources[0].run.channels.every(channel => channel.sent === 3 && channel.received === 3), true);
  }
  const output = visible.execution.events.find(event => event.kind === 'sent' && event.channelId === 'output:summary');
  assert.deepEqual(output.payload, { accountId: 'acct-101', display: 'Sample acct-101 · active' });
  assert.notEqual(hidden.execution.runId, visible.execution.runId);
});

test('execution UI shows semantic cards, real packet markers/details, consent reset and actual counts', async () => {
  const view = await fixture.open();
  try {
    await view.page.goto(fixture.server.url + '/inspector');
    await view.page.getByText('Connection: Live', { exact: true }).waitFor();
    const diagram = view.page.getByRole('img', { name: 'Current relationship diagram' });
    assert((await diagram.textContent()).includes('Input accountId: string'));
    assert((await diagram.textContent()).includes('Feeds Load account.accountId'));
    assert((await diagram.textContent()).includes('Look up a sample account'));
    assert.equal(await diagram.locator('script, img').count(), 0);
    await view.page.locator('[data-packet-id]').first().waitFor();
    await view.page.getByRole('button', { name: 'Inspect transfer 1', exact: true }).click();
    await view.page.getByText('Payload capture is off.', { exact: true }).waitFor();
    await view.page.getByRole('button', { name: 'Inspect Load account', exact: true }).press('Enter');
    assert((await view.page.getByTestId('inspection-details').textContent()).includes('account-id@1'));
    await view.page.getByLabel('Capture sample payloads').check();
    await view.page.getByRole('button', { name: 'Inspect transfer 1', exact: true }).click();
    await view.page.getByTestId('packet-payload').waitFor();
    assert.equal((await view.page.getByTestId('packet-payload').textContent()).trim(), '"acct-101"');
    await view.page.getByRole('button', { name: 'Inspect transfer 18', exact: true }).waitFor();
    await view.page.getByRole('button', { name: 'Inspect transfer 17', exact: true }).click();
    assert((await view.page.getByTestId('packet-payload').textContent()).includes('acct-303'));
    assert((await diagram.textContent()).includes('Received: 3 · Sent: 3'));
    await view.page.screenshot({ path: join(evidence, 'execution-inspector.png'), fullPage: true });
    await view.page.getByRole('button', { name: 'Run account example again', exact: true }).click();
    await view.page.getByText('Select a transfer to inspect its identity and immediate lineage.', { exact: true }).waitFor();
    await view.page.getByLabel('Capture sample payloads').uncheck();
    assert.equal(await view.page.getByTestId('packet-payload').count(), 0);
    await view.page.getByLabel('Inspected source').selectOption('idle-definition');
    assert.equal(await view.page.getByRole('region', { name: 'Packet execution' }).count(), 0);
  } finally { await view.close(); }
});

test('hostile titles stay inert in the actual richer browser renderer', async () => {
  const frame = await finalFrame(false), hostile = '<img src=x onerror=alert(1)> <script>alert(1)</script>';
  frame.snapshot.sources[0].catalog.components[0].title = hostile;
  const view = await fixture.open();
  try {
    await view.page.route('**/api/inspection**', route => route.fulfill({ contentType: 'text/event-stream', body: 'data: ' + JSON.stringify(frame) + '\n\n' }));
    await view.page.goto(fixture.server.url + '/inspector');
    await view.page.getByRole('button', { name: 'Inspect ' + hostile, exact: true }).waitFor();
    assert.equal(await view.page.locator('section script, section img, svg script, svg img').count(), 0);
    await view.page.getByRole('button', { name: hostile, exact: true }).click();
    assert((await view.page.getByTestId('inspection-details').textContent()).includes(hostile));
  } finally { await view.close(); }
});


test('oversize payload state is explicit in the selected packet view', async () => {
  const frame = await finalFrame(true);
  frame.execution.events[0].payloadState = 'oversize'; delete frame.execution.events[0].payload;
  const view = await fixture.open();
  try {
    await view.page.route('**/api/inspection?payloads=1', route => route.fulfill({ contentType: 'text/event-stream', body: 'data: ' + JSON.stringify(frame) + '\n\n' }));
    await view.page.goto(fixture.server.url + '/inspector');
    await view.page.getByLabel('Capture sample payloads').check();
    await view.page.getByRole('button', { name: 'Inspect transfer 1', exact: true }).click();
    await view.page.getByText('Payload omitted: oversize.', { exact: true }).waitFor();
  } finally { await view.close(); }
});
