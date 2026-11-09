const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fork } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');
const { createServer } = require('node:http');
const { createRequire } = require('node:module');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const browserFixture = require('./browser-fixture.cjs');
const { verifyCommandFeedback, verifyCursorRecovery, verifyReadFailure } = require('./durable-browser-checks.cjs');

const app = process.env.FBP_NEXT_APP;
const adminUrl = process.env.FBP_POSTGRES_TEST_URL;
const requireApp = createRequire(join(app, 'package.json'));
const workspaceId = 'demo-workspace';
const token = randomUUID();

async function providerFixture() {
  let effects = 0, lookups = 0, available = true;
  const server = createServer((request, response) => {
    if (request.method === 'POST') {
      effects++;
      request.resume();
      request.on('end', () => response.end('8'));
    } else if (request.url === '/provider-review' && effects === 1 && available) {
      lookups++;
      response.end('8');
    } else { response.statusCode = 404; response.end(); }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { url: 'http://127.0.0.1:' + server.address().port,
    effects: () => effects, lookups: () => lookups, setAvailable: value => { available = value; }, close: () => new Promise(resolve => server.close(resolve)) };
}

async function setup(database) {
  const base = join(app, 'node_modules/event-driven-design-durable/dist');
  const { openPostgresStore } = await import(pathToFileURL(join(base, 'postgres/index.js')));
  const { startStepWorker } = await import(pathToFileURL(join(base, 'index.js')));
  const { demoDurableProfile } = await import(pathToFileURL(join(app, 'lib/durable/profiles.ts')));
  const { packet } = requireApp('event-driven-design');
  const store = openPostgresStore(database);
  await store.migrate();
  async function stage(slug, kind = 'wait', tenant = workspaceId) {
    const profile = demoDurableProfile(kind);
    const { runId } = await store.withDurableTransaction(tenant, tx => tx.stage({
      jobId: slug, revisionId: 'review-v1', profilePin: profile.pin,
      inputs: { request: [packet(731921, { jobId: slug })] },
    }));
    await store.initializeSteps({ workspaceId: tenant, runId }, profile);
    const run = { slug, runId, workspaceId: tenant, kind, title: slug };
    if (slug === 'wait') run.origin = { revisionId: 'review-v1', executionDigest: profile.pin.executionDigest,
      nodes: { first: 'Review approval', result: 'Review result' } };
    return run;
  }
  return { store, stage, startStepWorker, demoDurableProfile };
}

async function killAfterWait(database, scope, beforeKill) {
  const child = fork(join(__dirname, 'durable-worker.cjs'));
  const exit = once(child, 'exit');
  try {
    const result = once(child, 'message');
    child.send({ app, database, scope });
    const [state] = await Promise.race([result, exit.then(() => ['early exit'])]);
    assert.equal(state, 'waiting');
    await beforeKill();
  } finally { child.kill('SIGKILL'); await exit; }
}

async function makeUncertain(store, run, provider) {
  const [claim] = await store.claimSteps(run, run.profile, { workerId: 'provider', leaseMs: 60000, limit: 1 });
  const request = { provider: 'fixture', businessKey: 'provider-review', resourceKey: 'provider-resource',
    revision: 1, policy: 'reconcile-required', policyVersion: 'v1', payload: 731921 };
  const operation = await store.prepareExternalOperation(run, claim, request);
  const result = await store.invokeExternalOperation(run, claim, operation.operationId, request, async payload => {
    const response = await globalThis.fetch(provider.url, { method: 'POST', body: JSON.stringify(payload) });
    assert(response.ok);
    await response.text();
    throw Error('Simulated lost provider response');
  });
  assert.equal(result.state, 'uncertain');

}

const waitText = (page, text) => page.getByText(text, { exact: true }).waitFor();

test('installed inspector reconnects to PostgreSQL and fences unauthorized and stale commands', { timeout: 65000 }, async () => {
  const pg = requireApp('pg');
  const admin = new pg.Pool({ connectionString: adminUrl });
  const name = 's49_' + randomUUID().replaceAll('-', '');
  const database = new globalThis.URL(adminUrl);
  database.pathname = '/' + name;
  const provider = await providerFixture();
  let store, fixture, view, disabled, created;
  const workers = [];
  try {
    await admin.query('CREATE DATABASE ' + name);
    created = true;
    const host = await setup(database.href);
    store = host.store;
    const waiting = await host.stage('wait');
    const uncertain = await host.stage('provider', 'provider');
    const cancelled = await host.stage('cancel');
    const hidden = await host.stage('hidden', 'wait', 'other-workspace');
    const missing = { ...waiting, slug: 'missing', title: 'missing', runId: randomUUID() };
    await makeUncertain(store, { ...uncertain, profile: host.demoDurableProfile('provider') }, provider);
    const durableFixture = { database: database.href, providerUrl: provider.url, token,
      runs: [waiting, uncertain, cancelled, hidden, missing] };
    fixture = await browserFixture('durable-progress', { durableFixture });
    view = await fixture.open();
    const { page, context } = view;
    const path = '/api/durable/';
    const url = fixture.server.url;
    const status = async (slug, command, auth = true, origin = url) => {
      const headers = { ...(auth && { cookie: 'durable-demo=' + token }), origin, 'content-type': 'application/json' };
      const response = await globalThis.fetch(url + path + slug, {
        headers, ...(command && { method: 'POST', body: JSON.stringify(command) }),
      });
      return [response.status, await response.json()];
    };
    const absent = [404, { code: 'RUN_NOT_FOUND' }];
    assert.deepEqual(await status('wait', null, false), absent);
    assert.deepEqual(await status('hidden'), absent);
    assert.deepEqual(await status('missing'), absent);
    assert.deepEqual(await status('unknown'), absent);
    assert.deepEqual(await status('wait', { kind: 'cancel' }, true, 'https://elsewhere.invalid'), absent);
    assert.equal((await status('wait', { kind: 'cancel' }))[0], 400);
    assert.equal((await status('wait?after=bad'))[0], 400);
    await page.goto(url + '/inspector/durable');
    await waitText(page, 'No durable runs are connected.');
    await context.addCookies([{ name: 'durable-demo', value: token, url }]);
    await page.reload();
    await page.getByRole('combobox', { name: 'Durable run' }).selectOption({ label: 'missing' });
    await waitText(page, 'Connection: Run unavailable');
    await page.getByRole('combobox', { name: 'Durable run' }).selectOption({ label: 'wait' });
    await page.getByRole('button', { name: 'Refresh progress' }).click();
    await waitText(page, 'Review approval');
    await page.getByText(/ · ready/).waitFor();
    const browserCommands = [];
    page.on('request', request => { if (request.method() === 'POST') browserCommands.push(request.url()); });
    await page.evaluate(() => { globalThis.s49Sentinel = true; });
    let snapshot;
    await killAfterWait(database.href, waiting, async () => {
      await page.getByText(/ · waiting/).waitFor();
      [, snapshot] = await status('wait');
      assert(!JSON.stringify(snapshot).includes('731921'));
      assert.equal(snapshot.revisionId, 'review-v1');
      await page.route('**/api/durable/wait', route => route.request().method() === 'POST' ? route.abort() : route.continue());
      await page.getByRole('button', { name: 'Approve wait' }).click();
      await waitText(page, 'Action response unavailable');
      await page.unroute('**/api/durable/wait');
      browserCommands.length = 0;
      await page.route('**/api/durable/wait', route => route.abort());
      await waitText(page, 'Connection: Disconnected');
      await waitText(page, 'Run: queued');
      await waitText(page, 'Showing the last saved view.');
      assert.equal(await page.getByRole('button', { name: 'Approve wait' }).isEnabled(), false);
    });
    const wait = snapshot.steps[0];
    const signal = { kind: 'signal', generation: wait.stepId, nodeId: wait.nodeId,
      signalName: wait.wait.signalName, expectedRevision: wait.wait.revision };
    assert.equal((await status('wait', signal, false))[0], 404);
    assert.equal((await status('wait', { ...signal, expectedRevision: 2 }))[0], 409);
    assert.equal((await status('wait', signal))[0], 200);
    workers.push(host.startStepWorker({ store, scope: waiting, profile: host.demoDurableProfile('wait'),
      workerId: 'replacement', timeoutMs: 3000, pollMs: 10 }));
    await page.unroute('**/api/durable/wait');
    await page.evaluate(() => globalThis.dispatchEvent(new globalThis.Event('online')));
    await waitText(page, 'Run: completed');
    assert.equal(await page.evaluate(() => globalThis.s49Sentinel), true);
    assert.deepEqual(browserCommands, []);
    await verifyCursorRecovery(page);
    await page.getByRole('button', { name: 'Next page' }).click();
    await waitText(page, 'Review result');
    await page.getByRole('button', { name: 'First page' }).click();
    await waitText(page, 'Review approval');

    await page.getByRole('combobox', { name: 'Durable run' }).selectOption({ label: 'provider' });
    await page.getByText(/ · uncertain/).waitFor();
    const [, providerState] = await status('provider');
    const step = providerState.steps[0];
    const resolve = { kind: 'resolve', stepId: step.stepId, operationId: step.operation.operationId,
      expectedRevision: step.operation.revision };
    assert.equal((await status('provider', { ...resolve, expectedRevision: 0 }))[0], 409);
    assert.equal(provider.lookups(), 0);
    provider.setAvailable(false);
    assert.deepEqual(await status('provider', resolve), [503, { code: 'PROGRESS_UNAVAILABLE' }]);
    provider.setAvailable(true);
    assert.deepEqual(await status('provider', { ...resolve, operationId: randomUUID() }), absent);
    await page.getByRole('button', { name: 'Check provider outcome' }).click();
    await waitText(page, 'Action recorded');
    workers.push(host.startStepWorker({ store, scope: uncertain, profile: host.demoDurableProfile('provider'),
      workerId: 'provider-successor', timeoutMs: 3000, pollMs: 10 }));
    await waitText(page, 'Run: completed');
    assert.equal((await status('provider', resolve))[0], 409);
    assert.equal(provider.effects(), 1);
    assert.equal(provider.lookups(), 1);

    await page.getByRole('combobox', { name: 'Durable run' }).selectOption({ label: 'cancel' });
    const [, cancelState] = await status('cancel');
    await verifyCommandFeedback(page);
    const cancel = { kind: 'cancel', expectedRevision: cancelState.lifecycleRevision };
    assert.equal((await status('cancel', { ...cancel, expectedRevision: 'a'.repeat(64) }))[0], 409);
    await page.getByRole('button', { name: 'Cancel run' }).click();
    await waitText(page, 'Run: cancelled');
    await verifyReadFailure(page);
    assert.equal((await status('cancel', cancel))[0], 409);
    assert.deepEqual(await status('missing', cancel), absent);
    const malformed = await globalThis.fetch(url + path + 'cancel', { method: 'POST',
      headers: { cookie: 'durable-demo=' + token, origin: url, 'content-type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
    await page.route('**/api/durable/cancel', route => route.fulfill({ json: {
      ...cancelState, status: 'failed', failureCode: 'JOIN_INCOMPLETE',
      steps: [{ ...cancelState.steps[0], stage: 'failed', failureCode: 'COMPONENT_FAILED' }],
    } }));
    await page.getByRole('button', { name: 'Refresh progress' }).click();
    await waitText(page, 'JOIN_INCOMPLETE');
    await page.getByText(/COMPONENT_FAILED/).waitFor();
    await page.unroute('**/api/durable/cancel');
    assert.deepEqual(await status('hidden', cancel), absent);

    disabled = await browserFixture('durable-disabled');
    const empty = await disabled.open();
    try {
      await empty.page.goto(disabled.server.url + '/inspector/durable');
      await waitText(empty.page, 'No durable runs are connected.');
    } finally { await empty.close(); }
  } finally {
    await Promise.all(workers.map(worker => worker.stop()));
    await view?.close(); await fixture?.close(); await disabled?.close();
    await store?.close(); await provider.close();
    if (created) await admin.query('DROP DATABASE ' + name);
    await admin.end();
  }
});
