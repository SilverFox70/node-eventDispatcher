import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import pg from 'pg';
import { derivePacket, packet } from 'event-driven-design';
import { openPostgresStore } from '../dist/postgres/index.js';
import { stepProfile } from './fixtures/step-profile.mjs';

const adminUrl = process.env.FBP_POSTGRES_TEST_URL;
assert(adminUrl);
const admin = new pg.Pool({ connectionString: adminUrl });
const database = 'fbp_s43_' + randomUUID().replaceAll('-', '');
const url = new globalThis.URL(adminUrl);
url.pathname = '/' + database;
const profile = stepProfile({ retry: true });
let store, observer;
before(async () => {
  await admin.query('CREATE DATABASE ' + database);
  observer = new pg.Pool({ connectionString: url.href });
  store = openPostgresStore(url.href);
  await store.migrate();
});
after(async () => {
  await store?.close();
  await observer?.end();
  try { if (observer) await admin.query('DROP DATABASE ' + database); }
  finally { await admin.end(); }
});

async function claimed(jobId, workerId = jobId) {
  const workspaceId = 'workspace';
  const { runId } = await store.withDurableTransaction(workspaceId, tx => tx.stage({
    jobId, revisionId: 'two-step', profilePin: profile.pin, inputs: { request: [packet(1, { jobId })] },
  }));
  const scope = { workspaceId, runId };
  await store.initializeSteps(scope, profile);
  const [claim] = await store.claimSteps(scope, profile, { workerId, leaseMs: 60000, limit: 1 });
  return { scope, claim };
}
const requestFor = (resourceKey, revision = 7) => ({
  provider: 'fixture', businessKey: resourceKey + '-' + revision, resourceKey, revision,
  policy: 'reconcile-required', policyVersion: 'v1', payload: { name: 'Example' },
});
const prepare = (work, request) => store.prepareExternalOperation(work.scope, work.claim, request);
const invoke = (work, operation, request, send) =>
  store.invokeExternalOperation(work.scope, work.claim, operation.operationId, request, send);
const expire = work => observer.query(
  "UPDATE nodeflow_durable.steps SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE step_id=$1", [work.claim.stepId]);

test('business keys deduplicate across jobs and serialize resource revisions', async () => {
  const earlier = await claimed('earlier'), duplicate = await claimed('duplicate'), later = await claimed('later');
  const request = requestFor('ordering');
  const first = await prepare(earlier, request);
  assert.deepEqual(await prepare(duplicate, request), first);
  await assert.rejects(prepare(duplicate, { ...request, payload: null }), { code: 'INPUT_CONFLICT' });
  await assert.rejects(prepare(duplicate, { ...request, businessKey: 'alias' }), { code: 'INPUT_CONFLICT' });
  const next = requestFor('ordering', 8);
  await assert.rejects(prepare(duplicate, next), { code: 'INPUT_CONFLICT' });
  const second = await prepare(later, next);
  let sends = 0;
  const send = async payload => { sends++; return payload; };
  assert.equal(sends, 0);
  await assert.rejects(invoke(later, second, next, send), { code: 'EXTERNAL_OPERATION_HELD' });
  await assert.rejects(invoke(earlier, first, { ...request, payload: 5 }, send), { code: 'EXTERNAL_OPERATION_HELD' });
  const results = await Promise.allSettled([invoke(earlier, first, request, send), invoke(duplicate, first, request, send)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(sends, 1);
  assert.equal((await invoke(later, second, next, send)).state, 'succeeded');
  assert.equal(sends, 2);
  assert.equal((await store.recoverExternalOperation(duplicate.scope, first.operationId)).state, 'succeeded');
  await assert.rejects(store.recoverExternalOperation({ ...duplicate.scope, workspaceId: 'other' }, first.operationId),
    { code: 'EXTERNAL_OPERATION_NOT_FOUND' });
  await assert.rejects(store.commitStep(earlier.scope, profile, {
    stepId: earlier.claim.stepId, epoch: earlier.claim.epoch, workerId: earlier.claim.workerId, commitKey: 'external',
    result: { kind: 'computed', packet: derivePacket(2, [earlier.claim.input]) },
  }), { code: 'EXTERNAL_OPERATION_HELD' });
});

test('accepted HTTP request survives a killed worker as uncertainty with one provider call', { timeout: 15000 }, async () => {
  const work = await claimed('original'), replacement = await claimed('replacement'), newer = await claimed('newer');
  const request = requestFor('crash');
  const operation = await prepare(work, request);
  assert.deepEqual(await prepare(replacement, request), operation);
  const next = requestFor('crash', 8), nextOperation = await prepare(newer, next);
  let calls = 0, accepted;
  const arrival = new Promise(resolve => { accepted = resolve; });
  const server = createServer(req => { calls++; req.resume(); req.on('end', accepted); });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const endpoint = 'http://127.0.0.1:' + server.address().port;
  const child = fork(new globalThis.URL('./fixtures/external-worker.mjs', import.meta.url), []);
  const exited = once(child, 'exit');
  try {
    child.send({ url: url.href, ...work, operationId: operation.operationId, request, endpoint });
    await Promise.race([arrival, exited.then(() => { throw Error('worker exited before provider accepted'); })]);
    assert.equal((await store.recoverExternalOperation(work.scope, operation.operationId)).state, 'invocation-intent');
    child.kill('SIGKILL');
    assert.deepEqual(await exited, [null, 'SIGKILL']);
    await expire(work);
    assert.equal((await store.recoverExternalOperation(replacement.scope, operation.operationId)).state, 'uncertain');
    const send = payload => globalThis.fetch(endpoint, { method: 'POST', body: JSON.stringify(payload) });
    await assert.rejects(invoke(replacement, operation, request, send), { code: 'EXTERNAL_OPERATION_HELD' });
    await assert.rejects(invoke(newer, nextOperation, next, send), { code: 'EXTERNAL_OPERATION_HELD' });
    assert.deepEqual(await store.sweepReady(work.scope), []);
    assert.deepEqual(await store.claimSteps(work.scope, profile, { workerId: 'takeover', leaseMs: 1000, limit: 1 }), []);
    assert.equal(calls, 1);
  } finally {
    child.kill('SIGKILL');
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await exited;
  }
});

test('expired leases cannot issue permits, and ambiguous provider failures hold the resource', async () => {
  const work = await claimed('expire');
  const request = requestFor('expire');
  const operation = await prepare(work, request);
  await expire(work);
  let calls = 0;
  const send = async () => { calls++; throw Error('provider response lost'); };
  await assert.rejects(invoke(work, operation, request, send), { code: 'STALE_CLAIM' });
  assert.equal(calls, 0);
  const [claim] = await store.claimSteps(work.scope, profile, { workerId: 'new-owner', external: true, leaseMs: 60000, limit: 1 });
  assert.equal(claim.epoch, 2);
  assert.equal((await invoke({ ...work, claim }, operation, request, send)).state, 'uncertain');
  assert.equal(calls, 1);
  for (const patch of [{ provider: '!' }, { revision: 0 }, { revision: 2147483648 }, { revision: 1.5 },
    { policy: 'provider-idempotent' }, { extra: true }, { policyVersion: '', payload: null }]) {
    await assert.rejects(prepare({ ...work, claim }, { ...request, ...patch }), { code: 'INVALID_EXTERNAL_OPERATION' });
  }
  await assert.rejects(prepare(work, null), { code: 'INVALID_EXTERNAL_OPERATION' });
  const lost = await claimed('late-result');
  const other = await claimed('late-replacement');
  const lateRequest = requestFor('late');
  const lateOperation = await prepare(lost, lateRequest);
  await prepare(other, lateRequest);
  let lateCalls = 0;
  const server = createServer((_request, response) => { lateCalls++; response.end('true'); });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const endpoint = 'http://127.0.0.1:' + server.address().port;
  try {
    await assert.rejects(invoke(lost, lateOperation, lateRequest, async () => {
      // The permit committed, but the original process has not sent HTTP yet.
      await expire(lost);
      assert.equal((await store.recoverExternalOperation(lost.scope, lateOperation.operationId)).state, 'uncertain');
      await assert.rejects(invoke(other, lateOperation, lateRequest, send), { code: 'EXTERNAL_OPERATION_HELD' });
      assert.equal(lateCalls, 0);
      const response = await globalThis.fetch(endpoint, { method: 'POST' });
      return response.json();
    }), { code: 'STALE_CLAIM' });
    assert.equal(lateCalls, 1);
    assert.equal((await store.recoverExternalOperation(lost.scope, lateOperation.operationId)).state, 'uncertain');
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
