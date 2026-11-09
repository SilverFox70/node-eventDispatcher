import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
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
const database = 'fbp_s42_' + randomUUID().replaceAll('-', '');
const url = new globalThis.URL(adminUrl);
url.pathname = '/' + database;
const retryProfile = stepProfile({ retry: true });
let store, observer, created = false;
before(async () => {
  await admin.query('CREATE DATABASE ' + database);
  created = true;
  observer = new pg.Pool({ connectionString: url.href });
  store = openPostgresStore(url.href);
  await store.migrate();
});
after(async () => {
  await store?.close();
  await observer?.end();
  try { if (created) await admin.query('DROP DATABASE ' + database); }
  finally { await admin.end(); }
});

async function stage(jobId, profile = retryProfile, count = 1) {
  const workspaceId = 'workspace';
  const { runId } = await store.withDurableTransaction(workspaceId, tx => tx.stage({
    jobId, revisionId: 'two-step', profilePin: profile.pin,
    inputs: { request: Array.from({ length: count }, () => packet(1, { jobId })) },
  }));
  const scope = { workspaceId, runId };
  await store.initializeSteps(scope, profile);
  return scope;
}
const options = { workerId: 'worker', leaseMs: 60000, limit: 1 };
async function expire(stepId) {
  await observer.query("UPDATE nodeflow_durable.steps SET lease_expires_at = clock_timestamp() - interval '1 second' WHERE step_id = $1", [stepId]);
}
async function until(check) {
  for (let attempt = 0; attempt < 250; attempt++) {
    const result = await check();
    if (result) return result;
    await delay(20);
  }
  throw Error('Timed out waiting for worker evidence');
}
async function completed(scope) {
  const { rows } = await observer.query('SELECT count(*)::integer AS count FROM nodeflow_durable.step_outcomes WHERE run_id = $1', [scope.runId]);
  return rows[0].count;
}
function osWorker(scope, workerId) {
  const child = fork(new globalThis.URL('./fixtures/lease-worker.mjs', import.meta.url), [], {
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  });
  const exited = once(child, 'exit');
  const messages = [];
  child.on('message', message => messages.push(message));
  return {
    async send(action) {
      child.send({ action, url: url.href, scope, workerId });
      return until(() => {
        const index = messages.findIndex(item => item.action === action);
        return index < 0 ? null : messages.splice(index, 1)[0];
      });
    },
    batches() { return messages.filter(item => item.action === 'batch').map(item => item.size); },
    async kill() { child.kill('SIGKILL'); await exited; },
    async stop() { child.send({ action: 'stop' }); assert.deepEqual(await exited, [0, null]); },
  };
}

test('DB time governs due work, heartbeat ownership, and exhausted recovery', async () => {
  const scope = await stage('lease');
  const [ready] = await store.sweepReady(scope);
  await observer.query("UPDATE nodeflow_durable.steps SET not_before = clock_timestamp() + interval '1 hour' WHERE step_id = $1", [ready.stepId]);
  assert.deepEqual(await store.claimSteps(scope, retryProfile, options), []);
  await observer.query("UPDATE nodeflow_durable.steps SET not_before = clock_timestamp() WHERE step_id = $1", [ready.stepId]);
  const [first] = await store.claimSteps(scope, retryProfile, { ...options, leaseMs: 10000 });
  assert.equal(first.epoch, 1);
  const { rows: [clock] } = await observer.query('SELECT clock_timestamp() AS now');
  assert(Date.parse(first.leaseExpiresAt) > +clock.now);
  assert(Date.parse(await store.heartbeatStep(scope, first, 60000)) > Date.parse(first.leaseExpiresAt));
  assert.deepEqual(await store.claimSteps(scope, retryProfile, { ...options, workerId: 'other' }), []);
  await expire(first.stepId);
  const oldCommand = { stepId: first.stepId, epoch: first.epoch, workerId: first.workerId, commitKey: 'expired',
    result: { kind: 'computed', packet: derivePacket(2, [first.input]) } };
  await assert.rejects(store.commitStep(scope, retryProfile, oldCommand), { code: 'STALE_CLAIM' });
  assert.equal(await completed(scope), 0);
  const [second] = await store.claimSteps(scope, retryProfile, { ...options, workerId: 'other' });
  assert.equal(second.epoch, 2);
  await assert.rejects(store.heartbeatStep(scope, first, 60000), { code: 'STALE_CLAIM' });
  await assert.rejects(store.heartbeatStep(scope, { ...second, workerId: 'impostor' }, 60000), { code: 'STALE_CLAIM' });
  await expire(second.stepId);
  assert.deepEqual(await store.claimSteps(scope, retryProfile, options), []);
  const noRetry = stepProfile();
  const defaultScope = await stage('no-recovery-default', noRetry);
  const [one] = await store.claimSteps(defaultScope, noRetry, options);
  await expire(one.stepId);
  assert.deepEqual(await store.claimSteps(defaultScope, noRetry, options), []);
  assert.throws(() => store.claimSteps(scope, retryProfile, { ...options, workerId: '!' }), { code: 'INVALID_LEASE' });
  for (const leaseMs of [0, 1.5, 300001]) {
    assert.throws(() => store.claimSteps(scope, retryProfile, { ...options, leaseMs }), { code: 'INVALID_LEASE' });
  }
  for (const limit of [0, 1.5, 101]) {
    assert.throws(() => store.claimSteps(scope, retryProfile, { ...options, limit }), { code: 'INVALID_CLAIM_LIMIT' });
  }
  for (const epoch of [0, 1.5, 2147483648]) {
    await assert.rejects(store.heartbeatStep(scope, { ...first, epoch }, 60000), { code: 'INVALID_LEASE' });
  }
  await assert.rejects(store.claimSteps({ ...scope, workspaceId: 'other' }, retryProfile, options), { code: 'RUN_NOT_FOUND' });
});

test('two processes fence late completion and sweep a backlog without notifications', async () => {
  const scope = await stage('two-workers', retryProfile, 6);
  const a = osWorker(scope, 'A-worker'), b = osWorker(scope, 'B-worker');
  try {
    assert.equal((await a.send('listen')).action, 'listen');
    const [{ claims: [first] }, { claims: [other] }] = await Promise.all([a.send('claim'), b.send('claim')]);
    assert.notEqual(first.stepId, other.stepId);
    await expire(first.stepId);
    const { claims: [takeover] } = await b.send('claim');
    assert.equal(takeover.stepId, first.stepId);
    assert.equal(takeover.epoch, 2);
    assert.equal((await a.send('finish')).code, 'STALE_CLAIM');
    assert.equal(await completed(scope), 0);
    assert((await b.send('finish')).receipt.successorId);
    assert.equal(await completed(scope), 1);
    await expire(other.stepId);
    await a.kill();
    assert.equal((await b.send('loop')).action, 'loop');
    await until(async () => (await completed(scope)) === 12);
    assert.equal(Math.max(...b.batches()), 2);
    const { rows: [row] } = await observer.query(`SELECT count(*)::integer AS total,
      count(DISTINCT input_packet_id)::integer AS inputs FROM nodeflow_durable.steps WHERE run_id = $1`, [scope.runId]);
    assert.deepEqual(row, { total: 12, inputs: 12 });
    assert.deepEqual(await store.sweepReady(scope), []);
  } finally { await a.kill(); await b.stop(); }
});

test('worker reports failures, renews slow work and stops without committing cancelled work', async () => {
  const events = [];
  const profile = stepProfile({ retry: true, handler: async (_value, context) => {
    await delay(80, undefined, { signal: context.signal });
    return 'bad';
  } });
  const scope = await stage('worker-life', profile);
  const settings = { store, scope, profile, workerId: 'runtime', timeoutMs: 1000,
    leaseMs: 1000, heartbeatMs: 5, pollMs: 10, concurrency: 1, onError: error => events.push(error) };
  for (const change of [{ workerId: '!' }, { timeoutMs: 0 }, { leaseMs: 1 },
    { heartbeatMs: 1000 }, { pollMs: 0 }, { concurrency: 101 }]) {
    assert.throws(() => startStepWorker({ ...settings, ...change }), { code: 'INVALID_WORKER_OPTIONS' });
  }
  const worker = startStepWorker(settings);
  try { await until(async () => (await completed(scope)) === 1); }
  finally { await worker.stop(); }
  assert.deepEqual(events, []);
  const { rows: [failure] } = await observer.query('SELECT failure_code FROM nodeflow_durable.step_outcomes WHERE run_id = $1', [scope.runId]);
  assert.equal(failure.failure_code, 'OUTPUT_CONTRACT');
  const waiting = stepProfile({ retry: true, handler: async (_value, context) => {
    await delay(10000, undefined, { signal: context.signal });
    return 2;
  } });
  const stopScope = await stage('shutdown', waiting);
  const stopped = startStepWorker({ ...settings, scope: stopScope, profile: waiting });
  await until(async () => (await observer.query('SELECT epoch FROM nodeflow_durable.steps WHERE run_id = $1', [stopScope.runId])).rows[0].epoch);
  await stopped.stop();
  assert.equal(await completed(stopScope), 0);

  const lostScope = await stage('lost-heartbeat', waiting);
  const lost = startStepWorker({ ...settings, scope: lostScope, profile: waiting });
  try {
    const step = await until(async () => (await observer.query(
      'SELECT step_id FROM nodeflow_durable.steps WHERE run_id = $1 AND epoch = 1', [lostScope.runId])).rows[0]);
    await expire(step.step_id);
    await until(() => events.some(error => error.code === 'STALE_CLAIM'));
  } finally { await lost.stop(); }
  assert.equal(await completed(lostScope), 0);
});


test('worker surfaces claim and invocation errors and records one failed computation', async () => {
  const failures = [];
  const throwing = stepProfile({ retry: true, handler: () => { throw new FlowError('TEMPORARY'); } });
  const scope = await stage('failure', throwing);
  const settings = { store, scope, profile: throwing, workerId: 'error-worker', timeoutMs: 1000,
    pollMs: 20, onError: error => failures.push(error.code) };
  async function observe(options, check) {
    const worker = startStepWorker(options);
    try { await until(check); } finally { await worker.stop(); }
  }
  await observe(settings, async () => (await completed(scope)) === 1);
  const { rows: [result] } = await observer.query('SELECT failure_code FROM nodeflow_durable.step_outcomes WHERE run_id = $1', [scope.runId]);
  assert.equal(result.failure_code, 'COMPONENT_FAILED');
  const tooShort = stepProfile({ taskTimeoutMs: 500 });
  const shortScope = await stage('bad-timeout', tooShort);
  await observe({ ...settings, scope: shortScope, profile: tooShort, timeoutMs: 50 },
    () => failures.includes('INVALID_TIMEOUT_POLICY'));
  assert.equal(await completed(shortScope), 0);
  await observe({ ...settings, scope: { ...scope, runId: randomUUID() } }, () => failures.includes('RUN_NOT_FOUND'));
});
