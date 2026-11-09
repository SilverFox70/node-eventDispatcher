import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import pg from 'pg';
import { packet } from 'event-driven-design';
import { openPostgresStore } from '../dist/postgres/index.js';
import { stepProfile } from './fixtures/step-profile.mjs';

const adminUrl = process.env.FBP_POSTGRES_TEST_URL;
assert(adminUrl);
const admin = new pg.Pool({ connectionString: adminUrl });
const database = 's49_progress_' + randomUUID().replaceAll('-', '');
const url = new globalThis.URL(adminUrl);
url.pathname = '/' + database;
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

const actorId = 'operator';
const allow = (_scope, actor) => actor === actorId;
async function stage(jobId, timing) {
  const profile = stepProfile();
  const workspaceId = 'demo-workspace';
  const { runId } = await store.withDurableTransaction(workspaceId, tx => tx.stage({
    jobId, revisionId: 'pinned-revision', profilePin: profile.pin,
    inputs: { request: Array.from({ length: 3 }, () => packet(987654321, { jobId })) }, ...(timing && { timing }),
  }));
  const scope = { workspaceId, runId };
  await store.initializeSteps(scope, profile);
  return { scope, profile };
}

test('safe snapshots are read-only, scoped and paged by an exact run-bound cursor', async () => {
  const { scope, profile } = await stage('read');
  const query = (request = {}) => store.queryRun(scope, { actorId, ...request }, allow);
  const first = await query({ limit: 1 });
  assert.equal(first.steps.length, 1);
  assert.equal(first.steps[0].stage, 'ready');
  assert.equal(first.revisionId, 'pinned-revision');
  assert.equal(first.executionDigest, profile.pin.executionDigest);
  assert.equal(first.adapterDigest, profile.pin.adapterDigest);
  assert.equal(first.status, 'queued');
  assert.equal(first.readVersion, (await query({ limit: 1 })).readVersion);
  assert(!JSON.stringify(first).includes('987654321'));
  const next = await query({ limit: 2, after: first.nextCursor });
  assert.equal(next.steps.length, 2);
  assert.equal(next.nextCursor, null);
  assert.equal(new Set([first.steps[0], ...next.steps].map(step => step.stepId)).size, 3);

  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const [run, time, step] = JSON.parse(Buffer.from(first.nextCursor, 'base64url').toString());
  for (const after of ['', 'bad', encode({}), encode([run, time]), encode([randomUUID(), time, step]),
    encode([run, 3, step]), encode([run, '2026-02-31T00:00:00.000000Z', step]),
    encode([run, '2026-13-01T00:00:00.000000Z', step]), encode([run, time, 'bad']), first.nextCursor + 'A']) {
    await assert.rejects(query({ after }), { code: 'INVALID_PROGRESS_PAGE' });
  }
  for (const limit of [0, 1.5, 101]) await assert.rejects(query({ limit }), { code: 'INVALID_PROGRESS_PAGE' });
  for (const requested of [{ ...scope, workspaceId: 'other' }, { ...scope, runId: randomUUID() }]) {
    await assert.rejects(store.queryRun(requested, { actorId }, allow), { code: 'RUN_NOT_FOUND' });
  }
  await assert.rejects(query({ actorId: 'other' }), { code: 'RUN_NOT_FOUND' });
  await assert.rejects(query({ actorId: '!' }), { code: 'RUN_NOT_FOUND' });
  assert.equal((await store.getRunTiming(scope)).status, 'queued');
});

test('cancel is authorized and compares the lifecycle revision under lock', async () => {
  const { scope } = await stage('cancel', { timeoutMs: 60000, notBeforeMs: 1 });
  const before = await store.queryRun(scope, { actorId }, allow);
  assert(before.deadlineAt && before.notBefore);
  const command = { actorId, expectedRevision: before.lifecycleRevision };
  await assert.rejects(store.cancelProgress(scope, command, () => false), { code: 'RUN_NOT_FOUND' });
  await assert.rejects(store.cancelProgress({ ...scope, workspaceId: 'other' }, command, allow), { code: 'RUN_NOT_FOUND' });
  await assert.rejects(store.cancelProgress(scope, { ...command, expectedRevision: 'stale' }, allow), { code: 'PROGRESS_CONFLICT' });
  const results = await Promise.allSettled([store.cancelProgress(scope, command, allow), store.cancelProgress(scope, command, allow)]);
  assert.deepEqual(results.filter(result => result.status === 'fulfilled').map(result => result.value), [{ status: 'cancelled' }]);
  assert.deepEqual(results.filter(result => result.status === 'rejected').map(result => result.reason.code), ['PROGRESS_CONFLICT']);
  const after = await store.queryRun(scope, { actorId }, allow);
  assert.equal(after.status, 'cancelled');
  assert(after.terminalAt);
  assert.notEqual(after.lifecycleRevision, before.lifecycleRevision);
  const expired = await stage('expiry', { timeoutMs: 60000 });
  const current = await store.queryRun(expired.scope, { actorId }, allow);
  await observer.query('UPDATE nodeflow_durable.workflow_runs SET deadline_at=clock_timestamp() WHERE run_id=$1', [expired.scope.runId]);
  await assert.rejects(store.cancelProgress(expired.scope, { actorId, expectedRevision: current.lifecycleRevision }, allow),
    { code: 'PROGRESS_CONFLICT' });
});
