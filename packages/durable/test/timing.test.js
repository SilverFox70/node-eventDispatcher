import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { derivePacket, FlowError, packet } from 'event-driven-design';
import { startStepWorker } from '../dist/index.js';
import { openPostgresStore } from '../dist/postgres/index.js';
import { stepProfile } from './fixtures/step-profile.mjs';

const adminUrl = process.env.FBP_POSTGRES_TEST_URL;
assert(adminUrl);
const admin = new pg.Pool({ connectionString: adminUrl });
const database = 'fbp_s45_' + randomUUID().replaceAll('-', '');
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
async function stage(jobId, profile, timing) {
  const workspaceId = 'workspace';
  const { runId } = await store.withDurableTransaction(workspaceId, tx => tx.stage({
    jobId, revisionId: 'two-step', profilePin: profile.pin,
    inputs: { request: [packet(1, { jobId })] }, ...(timing && { timing }),
  }));
  return { workspaceId, runId };
}
const options = { workerId: 'worker', leaseMs: 60000, limit: 1 };
async function stepRow(scope) {
  return (await observer.query('SELECT * FROM nodeflow_durable.steps WHERE run_id=$1', [scope.runId])).rows[0];
}
async function until(check) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const value = await check();
    if (value) return value;
    await delay(15);
  }
  throw Error('Timed out waiting for scheduling evidence');
}
function worker(db, scope, profile, workerId) {
  return startStepWorker({ store: db, scope, profile, workerId, timeoutMs: 5000, pollMs: 10, concurrency: 1 });
}

test('a scheduled retry survives closing workers and consumes the same claim budget', async () => {
  let calls = 0;
  const profile = stepProfile({ retry: { maxRetries: 1, delayMs: 60000 }, handler: () => {
    calls++;
    throw new FlowError('TEMPORARY');
  } });
  const scope = await stage('restart', profile, { timeoutMs: 120000 });
  await store.initializeSteps(scope, profile);
  const first = worker(store, scope, profile, 'before-restart');
  try {
    await until(async () => { const row = await stepRow(scope); return row.epoch === 1 && row.lease_owner === null; });
  } finally { await first.stop(); }
  assert.equal(calls, 1);
  assert.equal((await store.getRunTiming(scope)).status, 'queued');
  const restarted = openPostgresStore(url.href);
  try {
    assert.deepEqual(await restarted.claimSteps(scope, profile, options), []);
    await observer.query('UPDATE nodeflow_durable.steps SET not_before=clock_timestamp() WHERE run_id=$1', [scope.runId]);
    const second = worker(restarted, scope, profile, 'after-restart');
    try { await until(async () => (await restarted.getRunTiming(scope)).status === 'failed'); }
    finally { await second.stop(); }
  } finally { await restarted.close(); }
  assert.equal(calls, 2);
  assert.equal((await stepRow(scope)).epoch, 2);
  assert.equal((await store.cancelRun(scope)).status, 'failed');
});

test('database not-before, timing validation, and deadline guard bound execution', async () => {
  const profile = stepProfile();
  for (const timing of [{ timeoutMs: 0 }, { timeoutMs: 2147483648 }, { timeoutMs: 1.5 }, { timeoutMs: 100, extra: true },
    { timeoutMs: 100, notBeforeMs: -1 }, { timeoutMs: 100, notBeforeMs: 100 }, { timeoutMs: 100, notBeforeMs: 1.5 }]) {
    await assert.rejects(stage('invalid', profile, timing), { code: 'INVALID_SUBMISSION' });
  }
  for (const maxRetries of [-1, 6]) {
    assert.throws(() => stepProfile({ retry: { maxRetries } }), { code: 'PROFILE_INELIGIBLE' });
  }
  for (const overrides of [{ taskTimeoutMs: 101 }, { retry: { maxRetries: 1, delayMs: 100 } },
    { retry: { maxRetries: 1, settleTimeoutMs: 101 } }]) {
    const tooLong = stepProfile(overrides);
    const scope = await stage('invalid-' + randomUUID(), tooLong, { timeoutMs: 100 });
    await assert.rejects(store.initializeSteps(scope, tooLong), { code: 'INVALID_TIMEOUT_POLICY' });
    await assert.rejects(store.claimSteps(scope, tooLong, options), { code: 'INVALID_TIMEOUT_POLICY' });
  }
  const retrying = stepProfile({ retry: { delayMs: 1000 } });
  const short = await stage('retry-window', retrying, { timeoutMs: 120000 });
  await store.initializeSteps(short, retrying);
  const [shortClaim] = await store.claimSteps(short, retrying, options);
  assert.equal(await store.scheduleStepRetry(short, retrying, shortClaim, 'OTHER'), false);
  await assert.rejects(store.scheduleStepRetry(short, retrying, { ...shortClaim, epoch: 2 }, 'TEMPORARY'),
    { code: 'STALE_CLAIM' });
  await observer.query("UPDATE nodeflow_durable.workflow_runs SET deadline_at=clock_timestamp()+interval '500 milliseconds' WHERE run_id=$1", [short.runId]);
  assert.equal(await store.scheduleStepRetry(short, retrying, shortClaim, 'TEMPORARY'), false);
  const scope = await stage('scheduled', profile, { timeoutMs: 120000, notBeforeMs: 60000 });
  await store.initializeSteps(scope, profile);
  assert.deepEqual(await store.sweepReady(scope), []);
  assert.deepEqual(await store.claimSteps(scope, profile, options), []);
  assert((await store.getRunTiming(scope)).notBefore);
  await observer.query('UPDATE nodeflow_durable.workflow_runs SET not_before=clock_timestamp() WHERE run_id=$1', [scope.runId]);
  const [claim] = await store.claimSteps(scope, profile, options);
  assert(claim.remainingMs > 0 && claim.remainingMs <= 120000);
  assert.equal(await store.scheduleStepRetry(scope, profile, claim, 'TEMPORARY'), false);
  await observer.query("UPDATE nodeflow_durable.workflow_runs SET deadline_at=clock_timestamp()-interval '1 second' WHERE run_id=$1", [scope.runId]);
  await assert.rejects(store.heartbeatStep(scope, claim, 1000), { code: 'STALE_CLAIM' });
  await assert.rejects(store.commitStep(scope, profile, {
    stepId: randomUUID(), epoch: claim.epoch, workerId: claim.workerId, commitKey: 'missing',
    result: { kind: 'computed', packet: derivePacket(2, [claim.input]) },
  }), { code: 'STEP_NOT_FOUND' });
  await assert.rejects(store.commitStep(scope, profile, {
    ...{ stepId: claim.stepId, epoch: claim.epoch, workerId: claim.workerId }, commitKey: 'late',
    result: { kind: 'computed', packet: derivePacket(2, [claim.input]) },
  }), { code: 'RUN_TERMINATED' });
  assert.deepEqual(await store.claimSteps(scope, profile, options), []);
  assert.equal((await store.getRunTiming(scope)).status, 'timed-out');

  let interrupted = false;
  const slow = stepProfile({ handler: async (_value, context) => {
    try { await delay(5000, undefined, { signal: context.signal }); }
    catch { interrupted = true; }
    return 2;
  } });
  const bounded = await stage('bounded-in-flight', slow, { timeoutMs: 1000 });
  await store.initializeSteps(bounded, slow);
  const active = worker(store, bounded, slow, 'deadline-worker');
  try { await until(() => interrupted); }
  finally { await active.stop(); }
  await until(async () => (await store.getRunTiming(bounded)).status === 'timed-out');
  assert.equal((await stepRow(bounded)).status, 'ready');
  assert.deepEqual(await store.claimSteps(bounded, slow, options), []);
});

test('deadline and cancellation preserve provider uncertainty and cannot revive terminal runs', async () => {
  const profile = stepProfile({ retry: { maxRetries: 5 } });
  const scope = await stage('external-timeout', profile, { timeoutMs: 120000 });
  await store.initializeSteps(scope, profile);
  const [claim] = await store.claimSteps(scope, profile, options);
  const request = { provider: 'fixture', businessKey: 'business', resourceKey: 'person', revision: 1,
    policy: 'reconcile-required', policyVersion: 'v1', payload: null };
  const { operationId } = await store.prepareExternalOperation(scope, claim, request);
  let sends = 0;
  const server = createServer((_request, response) => { sends++; response.end('2'); });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const endpoint = 'http://127.0.0.1:' + server.address().port;
  const send = async () => (await globalThis.fetch(endpoint, { method: 'POST' })).json();
  try {
    await assert.rejects(store.invokeExternalOperation(scope, claim, operationId, request, async () => {
      const result = await send();
      await observer.query("UPDATE nodeflow_durable.workflow_runs SET deadline_at=clock_timestamp()-interval '1 second' WHERE run_id=$1", [scope.runId]);
      assert.equal((await store.getRunTiming(scope)).status, 'timed-out');
      return result;
    }), { code: 'RUN_TERMINATED' });
    assert.equal((await store.recoverExternalOperation(scope, operationId)).state, 'uncertain');
    assert.equal((await store.cancelRun(scope)).status, 'timed-out');
    await assert.rejects(store.invokeExternalOperation(scope, claim, operationId, request, send), { code: 'RUN_TERMINATED' });
    assert.equal(await store.scheduleStepRetry(scope, profile, claim, 'TEMPORARY'), false);
    assert.equal(sends, 1);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }

  const cancelled = await stage('cancelled', profile);
  await store.initializeSteps(cancelled, profile);
  assert.equal((await store.cancelRun(cancelled)).status, 'cancelled');
  assert.deepEqual(await store.claimSteps(cancelled, profile, options), []);
  assert.equal((await store.getRunTiming(cancelled)).status, 'cancelled');
});
