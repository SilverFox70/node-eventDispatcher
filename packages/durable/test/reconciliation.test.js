import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import pg from 'pg';
import { packet } from 'event-driven-design';
import { openPostgresStore } from '../dist/postgres/index.js';
import { stepProfile } from './fixtures/step-profile.mjs';

const adminUrl = process.env.FBP_POSTGRES_TEST_URL;
assert(adminUrl);
const admin = new pg.Pool({ connectionString: adminUrl });
const database = 'fbp_s44_' + randomUUID().replaceAll('-', '');
const url = new globalThis.URL(adminUrl);
url.pathname = '/' + database;
const profile = stepProfile({ retry: true });
let store, observer, server, base;
let writes = 0;
const results = new Map();
before(async () => {
  await admin.query('CREATE DATABASE ' + database);
  observer = new pg.Pool({ connectionString: url.href });
  store = openPostgresStore(url.href);
  await store.migrate();
  server = createServer((request, response) => {
    const key = request.url;
    response.setHeader('content-type', 'application/json');
    if (request.method === 'POST') { writes++; results.set(key, 17); }
    response.end(JSON.stringify(results.has(key) ? { found: true, value: results.get(key) } : { found: false }));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await store?.close();
  await observer?.end();
  try { if (observer) await admin.query('DROP DATABASE ' + database); }
  finally { await admin.end(); }
});

async function prepare(jobId) {
  const workspaceId = 'workspace';
  const { runId } = await store.withDurableTransaction(workspaceId, tx => tx.stage({
    jobId, revisionId: 'two-step', profilePin: profile.pin, inputs: { request: [packet(1, { jobId })] },
  }));
  const scope = { workspaceId, runId };
  await store.initializeSteps(scope, profile);
  const [claim] = await store.claimSteps(scope, profile, { workerId: jobId, leaseMs: 60000, limit: 1 });
  const request = {
    provider: 'fixture', businessKey: jobId, resourceKey: jobId, revision: 7,
    policy: 'reconcile-required', policyVersion: 'v1', payload: { name: 'Example' },
  };
  const { operationId } = await store.prepareExternalOperation(scope, claim, request);
  return { scope, claim, request, operationId };
}
const target = work => store.getReconciliationTarget(work.scope, work.claim.stepId, work.operationId);
const commandFor = (work, revision, key = 'resolve') => ({
  operationId: work.operationId, stepId: work.claim.stepId, actorId: 'operator', commandKey: key,
  mode: 'lookup', expectedRevision: revision,
});
const provider = {
  provider: 'fixture', policyVersion: 'v1',
  authorize: (_scope, command) => command.actorId === 'operator',
  async readEvidence(binding) {
    const response = await globalThis.fetch(base + '/' + binding.businessKey);
    const result = await response.json();
    return result.found
      ? { binding, evidenceRef: 'provider-receipt', kind: 'succeeded', value: result.value }
      : { binding, evidenceRef: 'provider-absent', kind: 'inconclusive', reason: 'ABSENT', reviewAfterMs: 1000 };
  },
};
const reconcile = (work, command, adapter = provider) => store.reconcileExternalOperation(work.scope, profile, command, adapter);
const send = work => store.invokeExternalOperation(work.scope, work.claim, work.operationId, work.request,
  async () => (await globalThis.fetch(base + '/' + work.request.businessKey, { method: 'POST' })).json().then(result => result.value));
const loseResponse = work => store.invokeExternalOperation(work.scope, work.claim, work.operationId, work.request, async () => {
  await globalThis.fetch(base + '/' + work.request.businessKey, { method: 'POST' });
  throw Error('response lost');
});
async function audit(work) {
  return (await observer.query(`SELECT decision, actor_id, evidence_ref
    FROM nodeflow_durable.reconciliation_audit WHERE operation_id=$1 ORDER BY audit_id`, [work.operationId])).rows;
}

test('matching provider evidence continues the exact step once, with atomic audit', async () => {
  const work = await prepare('applied');
  const count = writes;
  assert.equal((await loseResponse(work)).state, 'uncertain');
  const initial = await target(work);
  await assert.rejects(store.getReconciliationTarget({ ...work.scope, workspaceId: 'other' },
    work.claim.stepId, work.operationId), { code: 'EXTERNAL_OPERATION_NOT_FOUND' });
  assert.equal(initial.state, 'uncertain');
  assert.equal(initial.nextReviewAt, null);
  const command = commandFor(work, initial.revision);
  const result = await reconcile(work, command);
  assert.equal(result.status, 'succeeded');
  assert.equal(result.revision, initial.revision + 1);
  const [step] = await store.sweepReady(work.scope);
  assert.equal(step.stepId, result.receipt.successorId);
  assert.equal(step.input.value, 17);
  assert.deepEqual(step.input.parentPacketIds, [work.claim.input.packetId]);
  await assert.rejects(reconcile(work, command), { code: 'ALREADY_RESOLVED' });
  assert.equal((await store.sweepReady(work.scope)).length, 1);
  assert.equal(writes, count + 1);
  assert.deepEqual(await audit(work), [
    { decision: 'SUCCEEDED', actor_id: 'operator', evidence_ref: 'provider-receipt' },
    { decision: 'ALREADY_RESOLVED', actor_id: 'operator', evidence_ref: null },
  ]);
});

test('absence during a paused permit stays blocked, and later success can resolve', async () => {
  const work = await prepare('paused');
  const count = writes;
  const outcome = store.invokeExternalOperation(work.scope, work.claim, work.operationId, work.request, async () => {
    await observer.query("UPDATE nodeflow_durable.steps SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE step_id=$1",
      [work.claim.stepId]);
    assert.equal((await store.recoverExternalOperation(work.scope, work.operationId)).state, 'uncertain');
    const initial = await target(work);
    const command = commandFor(work, initial.revision, 'absent');
    const held = await reconcile(work, command);
    assert.equal(held.status, 'inconclusive');
    assert.equal(held.reason, 'ABSENT');
    const refreshed = await target(work);
    assert.equal(refreshed.nextReviewAt, held.nextReviewAt);
    assert(Date.parse(held.nextReviewAt) > 0);
    await assert.rejects(reconcile(work, { ...command, expectedRevision: held.revision }), { code: 'DUPLICATE_RESOLUTION' });
    await assert.rejects(send(work), { code: 'STALE_CLAIM' });
    assert.equal(writes, count);
    assert.deepEqual(await store.sweepReady(work.scope), []);
    return (await (await globalThis.fetch(base + '/paused', { method: 'POST' })).json()).value;
  });
  await assert.rejects(outcome, { code: 'STALE_CLAIM' });
  const refreshed = await target(work);
  assert.equal((await reconcile(work, commandFor(work, refreshed.revision, 'found'))).status, 'succeeded');
  assert.equal(writes, count + 1);
});

test('authorization, revisions, bindings and pinned output contracts refuse and audit', async () => {
  const work = await prepare('invalid-evidence');
  const start = await target(work);
  await assert.rejects(reconcile(work, commandFor(work, start.revision)), { code: 'EXTERNAL_OPERATION_HELD' });
  await loseResponse(work);
  const initial = await target(work);
  const command = { ...commandFor(work, initial.revision), mode: 'manual' };
  const count = writes;
  let lookups = 0;
  const unused = { ...provider, readEvidence() { lookups++; throw Error('must not look up'); } };
  await assert.rejects(reconcile(work, { ...command, actorId: 'guest' }, unused), { code: 'RECONCILIATION_FORBIDDEN' });
  await assert.rejects(reconcile(work, { ...command, expectedRevision: 0 }, unused), { code: 'STALE_RECONCILIATION' });
  await assert.rejects(reconcile(work, command, { ...unused, policyVersion: 'v2' }), { code: 'VERSION_UNAVAILABLE' });
  await assert.rejects(store.reconcileExternalOperation(work.scope, { ...profile }, command, unused),
    { code: 'VERSION_UNAVAILABLE' });
  assert.equal(lookups, 0);
  const success = { binding: initial.binding, evidenceRef: 'verified', kind: 'succeeded', value: 17 };
  for (const evidence of [
    null, { ...success, binding: { ...initial.binding, resourceKey: 'other' } },
    { ...success, evidenceRef: '!' }, { ...success, value: 'wrong' }, { ...success, kind: 'absent' },
    { binding: initial.binding, evidenceRef: 'hold', kind: 'inconclusive', reason: 'ABSENT', reviewAfterMs: 0 },
    { binding: initial.binding, evidenceRef: 'hold', kind: 'inconclusive', reason: 'BAD', reviewAfterMs: 100 },
    { binding: initial.binding, evidenceRef: 'hold', kind: 'inconclusive', reason: 'ABSENT', reviewAfterMs: 86400001 },
    { binding: initial.binding, evidenceRef: 'hold', kind: 'inconclusive', reason: 'ABSENT', reviewAfterMs: 0.5 },
  ]) await assert.rejects(reconcile(work, command, { ...provider, async readEvidence() { return evidence; } }),
    { code: 'INVALID_PROVIDER_EVIDENCE' });
  assert.deepEqual(await store.sweepReady(work.scope), []);
  assert.equal((await target(work)).revision, initial.revision);
  for (const patch of [{ actorId: '!' }, { commandKey: '' }, { mode: 'other' }, { expectedRevision: -1 },
    { expectedRevision: 1.5 }, { expectedRevision: 2147483648 }, { extra: true }]) {
    await assert.rejects(reconcile(work, { ...command, ...patch }), { code: 'INVALID_RECONCILIATION_COMMAND' });
  }
  await assert.rejects(reconcile(work, null), { code: 'INVALID_RECONCILIATION_COMMAND' });
  const accepted = await reconcile(work, command, { ...provider, async readEvidence() { return success; } });
  assert.equal(accepted.status, 'succeeded');
  assert.equal(writes, count);
  const records = await audit(work);
  assert(records.some(row => row.actor_id === 'guest' && row.decision === 'RECONCILIATION_FORBIDDEN'));
  assert(records.some(row => row.decision === 'STALE_RECONCILIATION'));
  assert.equal(records.filter(row => row.decision === 'SUCCEEDED').length, 1);
});

test('confirmed results remain pinned and competing CAS decisions advance once', async () => {
  const work = await prepare('confirmed');
  assert.equal((await send(work)).state, 'succeeded');
  const initial = await target(work);
  const command = commandFor(work, initial.revision);
  await assert.rejects(reconcile(work, command, { ...provider, async readEvidence(binding) {
    return { binding, evidenceRef: 'absent', kind: 'inconclusive', reason: 'ABSENT', reviewAfterMs: 1000 };
  } }), { code: 'INVALID_PROVIDER_EVIDENCE' });
  await assert.rejects(reconcile(work, command, { ...provider, async readEvidence(binding) {
    return { binding, evidenceRef: 'wrong-value', kind: 'succeeded', value: 18 };
  } }), { code: 'INVALID_PROVIDER_EVIDENCE' });
  let entered = 0, release;
  const barrier = new Promise(resolve => { release = resolve; });
  const racing = { ...provider, async readEvidence(binding, selected) {
    if (++entered === 2) release();
    await barrier;
    return provider.readEvidence(binding, selected);
  } };
  const results = await Promise.allSettled([
    reconcile(work, command, racing), reconcile(work, { ...command, commandKey: 'other' }, racing),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'ALREADY_RESOLVED');
  assert.equal((await store.sweepReady(work.scope)).length, 1);
});
