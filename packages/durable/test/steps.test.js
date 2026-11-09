import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { derivePacket, packet } from 'event-driven-design';
import { openPostgresStore } from '../dist/postgres/index.js';
import { stepProfile } from './fixtures/step-profile.mjs';

const adminUrl = process.env.FBP_POSTGRES_TEST_URL;
assert(adminUrl, 'Set FBP_POSTGRES_TEST_URL to a disposable server with CREATEDB access.');
const admin = new pg.Pool({ connectionString: adminUrl });
const database = 'fbp_s41_' + randomUUID().replaceAll('-', '');
const url = new globalThis.URL(adminUrl);
url.pathname = '/' + database;
const profile = stepProfile({ retry: true });
let store, observer, created = false;

before(async () => {
  await admin.query('CREATE DATABASE ' + database);
  created = true;
  observer = new pg.Pool({ connectionString: url.href });
  store = openPostgresStore(url.href);
  await observer.query(`CREATE SCHEMA nodeflow_durable;
    CREATE TABLE nodeflow_durable.schema_version (singleton boolean PRIMARY KEY, version integer NOT NULL);
    INSERT INTO nodeflow_durable.schema_version VALUES (true, 1)`);
  const migration = await readFile(new globalThis.URL('../migrations/001-submissions.sql', import.meta.url), 'utf8');
  await observer.query(migration);
  const stagedOnV1 = await stage('from-v1');
  await store.migrate();
  await store.initializeSteps(stagedOnV1, profile);
  assert.equal((await store.sweepReady(stagedOnV1))[0].nodeId, 'A');
});
after(async () => {
  await store?.close();
  await observer?.end();
  try { if (created) await admin.query('DROP DATABASE ' + database); }
  finally { await admin.end(); }
});

async function stage(jobId, inputs = { request: [packet(1, { jobId, key: 'test' })] }) {
  const workspaceId = 'workspace';
  const { runId } = await store.withDurableTransaction(workspaceId, tx =>
    tx.stage({ jobId, revisionId: 'two-step', profilePin: profile.pin, inputs }));
  return { workspaceId, runId };
}
const commandFor = (step, value, commitKey = 'finish-' + step.nodeId) => ({
  stepId: step.stepId, epoch: step.epoch, workerId: step.workerId, commitKey,
  result: { kind: 'computed', packet: derivePacket(value, [step.input]) },
});
async function counts(scope) {
  const { rows: [row] } = await observer.query(`SELECT
    (SELECT count(*) FROM nodeflow_durable.steps WHERE run_id = $1)::integer AS steps,
    (SELECT count(*) FROM nodeflow_durable.step_packets WHERE run_id = $1)::integer AS packets,
    (SELECT count(*) FROM nodeflow_durable.step_outcomes WHERE run_id = $1)::integer AS outcomes,
    (SELECT count(*) FROM nodeflow_durable.notification_outbox JOIN nodeflow_durable.step_outcomes USING (outcome_id)
      WHERE run_id = $1)::integer AS wakes`, [scope.runId]);
  return row;
}
function startWorker(scope, applicationName) {
  const childUrl = new globalThis.URL(url);
  childUrl.searchParams.set('application_name', applicationName);
  const child = fork(new globalThis.URL('./fixtures/step-worker.mjs', import.meta.url), [], {
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  });
  const exited = once(child, 'exit');
  const messages = [];
  child.on('message', value => messages.push(value));
  child.send({ url: childUrl.href, scope });
  return { child, exited, messages };
}
async function until(check) {
  for (let attempt = 0; attempt < 250; attempt++) {
    const result = await check();
    if (result) return result;
    await delay(20);
  }
  throw Error('Timed out waiting for PostgreSQL/process evidence');
}
async function kill(worker) {
  worker.child.kill('SIGKILL');
  assert.deepEqual(await worker.exited, [null, 'SIGKILL']);
}

test('a killed producer leaves a committed successor that the restart sweep finds', async () => {
  const scope = await stage('after-commit');
  await Promise.all([store.initializeSteps(scope, profile), store.initializeSteps(scope, profile)]);
  const worker = startWorker(scope, 's41-after');
  let finished;
  try { finished = await until(() => worker.messages.find(msg => msg.state === 'committed' || msg.state === 'failed')); }
  finally { await kill(worker); }
  assert.equal(finished.state, 'committed', JSON.stringify(finished));
  assert.deepEqual(await counts(scope), { steps: 2, packets: 2, outcomes: 1, wakes: 1 });

  const restarted = openPostgresStore(url.href);
  const listener = await observer.connect();
  try {
    const wakes = [];
    listener.on('notification', notice => wakes.push(notice.payload));
    await listener.query('LISTEN nodeflow_step_ready');
    const [step] = await restarted.claimSteps(scope, profile, { workerId: 'restart', leaseMs: 10000, limit: 1 });
    assert.equal(step.nodeId, 'B');
    assert.equal(step.input.value, 2);
    const original = worker.messages.find(msg => msg.state === 'committing').command;
    assert.deepEqual(step.input.parentPacketIds, [original.result.packet.parentPacketIds[0]]);
    assert.deepEqual(await restarted.commitStep(scope, profile, original), finished.receipt);
    assert(await restarted.publishStepWake(scope, finished.receipt.outcomeId));
    assert(await restarted.publishStepWake(scope, finished.receipt.outcomeId));
    await until(() => wakes.length === 2);
    assert.deepEqual(wakes, [finished.receipt.outcomeId, finished.receipt.outcomeId]);
    assert.deepEqual(await restarted.sweepReady(scope), []);
    const result = await profile.invoke(step.nodeId, step.input, { timeoutMs: 1000 });
    assert.equal(result.status, 'computed');
    const command = { ...commandFor(step, 3), result: { kind: 'computed', packet: result.packet } };
    await assert.rejects(restarted.commitStep(scope, profile, { ...command, commitKey: original.commitKey }),
      { code: 'OUTCOME_CONFLICT' });
    assert.deepEqual(await counts(scope), { steps: 2, packets: 2, outcomes: 1, wakes: 1 });
    const completed = await restarted.commitStep(scope, profile, command);
    assert.equal(completed.successorId, null);
    assert.equal(completed.outputPacketId, result.packet.packetId);
    assert.deepEqual(await restarted.sweepReady(scope), []);
    assert.deepEqual(await counts(scope), { steps: 2, packets: 3, outcomes: 2, wakes: 2 });
    assert.equal(await restarted.publishStepWake({ ...scope, workspaceId: 'other' }, completed.outcomeId), false);
  } finally { await listener.query('UNLISTEN *'); listener.release(); await restarted.close(); }
});

test('a process killed while the outbox insert is blocked leaves no partial outcome', async () => {
  const scope = await stage('before-commit');
  await store.initializeSteps(scope, profile);
  await observer.query(`CREATE FUNCTION nodeflow_durable.block_wake() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN PERFORM pg_advisory_xact_lock(17320968, 41); RETURN NEW; END $$;
    CREATE TRIGGER block_wake BEFORE INSERT ON nodeflow_durable.notification_outbox
    FOR EACH ROW EXECUTE FUNCTION nodeflow_durable.block_wake()`);
  const blocker = await observer.connect();
  await blocker.query('SELECT pg_advisory_lock(17320968, 41)');
  const worker = startWorker(scope, 's41-before');
  try {
    await until(async () => (await observer.query(`SELECT pid FROM pg_stat_activity
      WHERE application_name = 's41-before' AND cardinality(pg_blocking_pids(pid)) > 0`)).rows[0]);
    assert.deepEqual(await counts(scope), { steps: 1, packets: 1, outcomes: 0, wakes: 0 });
  } finally {
    await kill(worker);
    await blocker.query('SELECT pg_advisory_unlock(17320968, 41)');
    blocker.release();
    await observer.query('DROP TRIGGER block_wake ON nodeflow_durable.notification_outbox');
  }
  await until(async () => !(await observer.query("SELECT pid FROM pg_stat_activity WHERE application_name = 's41-before'")).rowCount);
  assert.deepEqual(await counts(scope), { steps: 1, packets: 1, outcomes: 0, wakes: 0 });
  await observer.query("UPDATE nodeflow_durable.steps SET lease_expires_at = clock_timestamp() - interval '1 second' WHERE run_id = $1", [scope.runId]);
  assert.equal((await store.sweepReady(scope))[0].nodeId, 'A');
});

test('stale claims, conflicting commits, and invalid output cannot publish success', async () => {
  const scope = await stage('refusal');
  await store.initializeSteps(scope, profile);
  const [step] = await store.claimSteps(scope, profile, { workerId: 'test-worker', leaseMs: 10000, limit: 1 });
  const valid = commandFor(step, 2);
  await assert.rejects(store.commitStep(scope, profile, { ...valid, epoch: 2 }), { code: 'STALE_CLAIM' });
  await assert.rejects(store.commitStep({ ...scope, workspaceId: 'other' }, profile, valid), { code: 'STEP_NOT_FOUND' });
  await assert.rejects(store.commitStep(scope, { ...profile }, valid), { code: 'VERSION_UNAVAILABLE' });
  const wrongLineage = { ...valid, result: { kind: 'computed', packet: packet(2, { jobId: 'refusal' }) } };
  await assert.rejects(store.commitStep(scope, profile, wrongLineage), { code: 'STEP_LINEAGE_MISMATCH' });
  assert.deepEqual(await counts(scope), { steps: 1, packets: 1, outcomes: 0, wakes: 0 });
  const invalid = commandFor(step, 'wrong');
  const failed = await store.commitStep(scope, profile, invalid);
  assert.equal(failed.failureCode, 'OUTPUT_CONTRACT');
  assert.equal(failed.outputPacketId, null);
  assert.equal(failed.successorId, null);
  assert.deepEqual(await store.commitStep(scope, profile, invalid), failed);
  await assert.rejects(store.commitStep(scope, profile, valid), { code: 'OUTCOME_CONFLICT' });
  await assert.rejects(store.commitStep(scope, profile, { ...invalid, commitKey: 'changed' }), { code: 'OUTCOME_CONFLICT' });
  assert.deepEqual(await store.sweepReady(scope), []);
  assert.deepEqual(await counts(scope), { steps: 1, packets: 1, outcomes: 1, wakes: 1 });
});


test('initialization validates scoped run pins and input contracts, and explicit failures stay terminal', async () => {
  const missing = { workspaceId: 'workspace', runId: randomUUID() };
  await assert.rejects(store.initializeSteps(missing, profile), { code: 'RUN_NOT_FOUND' });
  assert.throws(() => store.initializeSteps({ ...missing, runId: 'bad' }, profile), { code: 'INVALID_STEP_SCOPE' });
  assert.throws(() => store.initializeSteps({ ...missing, workspaceId: '!' }, profile), { code: 'INVALID_STEP_SCOPE' });
  const wrongPort = await stage('wrong-port', { other: [] });
  await assert.rejects(store.initializeSteps(wrongPort, profile), { code: 'UNKNOWN_PORT' });
  const wrongInput = await stage('wrong-input', { request: [packet('wrong', { jobId: 'wrong-input' })] });
  await assert.rejects(store.initializeSteps(wrongInput, profile), { code: 'INPUT_CONTRACT' });
  assert.deepEqual(await counts(wrongInput), { steps: 0, packets: 0, outcomes: 0, wakes: 0 });
  const scope = await stage('failure');
  await observer.query('UPDATE nodeflow_durable.workflow_runs SET adapter_digest = $2 WHERE run_id = $1',
    [scope.runId, 'f'.repeat(64)]);
  await assert.rejects(store.initializeSteps(scope, profile), { code: 'VERSION_UNAVAILABLE' });
  await observer.query('UPDATE nodeflow_durable.workflow_runs SET adapter_digest = $2 WHERE run_id = $1',
    [scope.runId, profile.pin.adapterDigest]);
  await store.initializeSteps(scope, profile);
  const [step] = await store.claimSteps(scope, profile, { workerId: 'test-worker', leaseMs: 10000, limit: 1 });
  const command = commandFor(step, 2);
  for (const invalid of [null, { ...command, extra: true }, { ...command, stepId: 'bad' },
    { ...command, commitKey: '' }, { ...command, epoch: -1 }, { ...command, epoch: 1.5 },
    { ...command, epoch: 2147483648 }, { ...command, result: null }, { ...command, result: { kind: 'bad', code: 'TIMEOUT' } },
    { ...command, result: { kind: 'failed', code: 'not-allowed' } }, { ...command, result: { kind: 'failed' } }]) {
    assert.throws(() => store.commitStep(scope, profile, invalid), { code: 'INVALID_STEP_COMMIT' });
  }
  const failed = await store.commitStep(scope, profile, { ...command, result: { kind: 'failed', code: 'NODE_TIMEOUT' } });
  assert.equal(failed.failureCode, 'NODE_TIMEOUT');
  assert.deepEqual(await store.sweepReady(scope), []);
});
