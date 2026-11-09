import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { packet } from 'event-driven-design';
import { startStepWorker } from '../dist/index.js';
import { openPostgresStore } from '../dist/postgres/index.js';
import { waitProfile } from './fixtures/wait-profile.mjs';

const adminUrl = process.env.FBP_POSTGRES_TEST_URL;
assert(adminUrl);
const admin = new pg.Pool({ connectionString: adminUrl });
const database = 'fbp_s48_' + randomUUID().replaceAll('-', '');
const url = new globalThis.URL(adminUrl);
url.pathname = '/' + database;
const profile = waitProfile();
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

async function stage(jobId, timing, count = 1) {
  const workspaceId = jobId === 'capacity' ? 'capacity-workspace' : 'review-workspace';
  const inputs = Array.from({ length: count }, () => packet(7, { jobId, key: 'review-key' }));
  const { runId } = await store.withDurableTransaction(workspaceId, tx => tx.stage({
    jobId, revisionId: 'review', profilePin: profile.pin, inputs: { request: inputs }, ...(timing && { timing }),
  }));
  const scope = { workspaceId, runId };
  await store.initializeSteps(scope, profile);
  const [step] = await store.sweepReady(scope);
  const command = { generation: step.stepId, nodeId: step.nodeId, signalName: 'approved',
    expectedRevision: 1, actorId: 'reviewer', commandKey: 'decision', payload: { approved: true } };
  return { scope, command, trigger: step.input };
}

const allowed = (target, command) => target.workspaceId.endsWith('-workspace') && command.actorId === 'reviewer';
const submit = (run, patch = {}, authorize = allowed) =>
  store.submitSignal(run.scope, profile, { ...run.command, ...patch }, authorize);
const conflict = { code: 'SIGNAL_CONFLICT' };
async function inbox(run) {
  return (await observer.query(`SELECT state,payload,expires_at-admitted_at AS lifetime FROM nodeflow_durable.signal_inbox
    WHERE run_id=$1 ORDER BY admitted_at`, [run.scope.runId])).rows;
}
async function claim(run) {
  const [step] = await store.claimSteps(run.scope, profile, { workerId: 'manual', leaseMs: 60000, limit: 1 });
  return step;
}
function worker(run) {
  return startStepWorker({ store, scope: run.scope, profile, workerId: 'restart', timeoutMs: 3000, pollMs: 10 });
}
async function complete(run) {
  const active = worker(run);
  try {
    for (let i = 0; i < 200; i++) {
      if ((await store.getRunTiming(run.scope)).status === 'completed') break;
      await delay(15);
    }
    assert.equal((await store.getRunTiming(run.scope)).status, 'completed');
  } finally { await active.stop(); }
}

async function verifySuccessor(run) {
  await complete(run);
  const [result, extra] = await store.readRoutedOutputs(run.scope);
  assert.equal(extra, undefined);
  assert.deepEqual(result.packet.value, { approved: true });
  assert.equal(result.packet.jobId, run.trigger.jobId);
  assert.equal(result.packet.key, run.trigger.key);
  const { rows: [derived] } = await observer.query(`SELECT envelope FROM nodeflow_durable.step_packets
    WHERE run_id=$1 AND packet_id=$2`, [run.scope.runId, result.packet.parentPacketIds[0]]);
  assert.deepEqual(JSON.parse(derived.envelope).parentPacketIds, [run.trigger.packetId]);
  assert.equal((await inbox(run)).filter(row => row.state === 'consumed').length, 1);
}

test('a registered wait releases its lease and survives a killed worker and concurrent duplicate signals', { timeout: 15000 }, async () => {
  const run = await stage('restart');
  const child = fork(new globalThis.URL('./fixtures/wait-worker.mjs', import.meta.url), []);
  const exited = once(child, 'exit');
  try {
    const message = once(child, 'message');
    child.send({ url: url.href, scope: run.scope, generation: run.command.generation });
    const [state] = await Promise.race([message, exited.then(() => { throw Error('Worker exited before registration'); })]);
    assert.deepEqual(state, { state: 'waiting', lease_owner: null });
  } finally { child.kill('SIGKILL'); await exited; }
  assert.deepEqual(await store.sweepReady(run.scope), []);
  assert.equal((await store.getRunTiming(run.scope)).status, 'queued');
  assert.equal(await store.sweepExpiredSignals(run.scope), 0);
  const receipts = await Promise.all([submit(run), submit(run)]);
  assert.deepEqual(receipts.map(receipt => receipt.state), ['consumed', 'consumed']);
  await assert.rejects(submit(run, { commandKey: 'late' }), conflict);
  await verifySuccessor(run);
});

test('an early signal is retained for seven days and consumed when its exact wait registers', async () => {
  const run = await stage('early');
  assert.equal((await submit(run)).state, 'pending');
  assert.equal((await submit(run)).state, 'pending');
  const [record] = await inbox(run);
  assert.equal(record.lifetime.days, 7);
  await assert.rejects(submit(run, { commandKey: 'competing' }), conflict);
  const step = await claim(run);
  await assert.rejects(store.commitRoutingStep(run.scope, profile, {
    stepId: step.stepId, workerId: step.workerId, epoch: step.epoch, outputs: {},
  }), { code: 'INVALID_DELIVERY' });
  await assert.rejects(store.registerWait(run.scope, profile, { ...step, epoch: step.epoch + 1 }), { code: 'STALE_CLAIM' });
  await store.registerWait(run.scope, profile, step);
  assert.equal((await submit(run)).state, 'consumed');
  await verifySuccessor(run);

  const automatic = await stage('early-worker');
  assert.equal((await submit(automatic)).state, 'pending');
  await verifySuccessor(automatic);
});

test('authorization and exact binding are checked before any new inbox write', async () => {
  const run = await stage('authorization');
  for (const patch of [
    { generation: randomUUID() }, { generation: undefined }, { nodeId: 'other' }, { signalName: 'unknown' },
    { expectedRevision: 2 }, { payload: { approved: 'wrong' } },
  ]) await assert.rejects(submit(run, patch), conflict);
  await assert.rejects(store.submitSignal({ ...run.scope, workspaceId: 'wrong' }, profile, run.command,
    () => assert.fail('Wrong workspace must not reach authorization')), conflict);
  await assert.rejects(submit(run, {}, (scope, command) => {
    assert.deepEqual(scope, run.scope);
    assert.deepEqual(command, run.command);
    assert(Object.isFrozen(command.payload));
    return false;
  }), { code: 'SIGNAL_FORBIDDEN' });
  assert.deepEqual(await inbox(run), []);
  assert.equal((await submit(run)).state, 'pending');
  await assert.rejects(submit(run, {}, () => false), { code: 'SIGNAL_FORBIDDEN' });
  for (const patch of [{ payload: { approved: false } }, { actorId: 'other' }]) {
    await assert.rejects(submit(run, patch, () => true), conflict);
  }
  await store.cancelRun(run.scope);
  assert.equal((await submit(run)).state, 'closed');
  assert.equal((await inbox(run))[0].payload, null);
  await assert.rejects(submit(run, { commandKey: 'after-cancel' }), conflict);
});

test('expiry removes payloads, preserves receipts, and allows a fresh signal for an open wait', async () => {
  const run = await stage('expiry');
  await submit(run);
  await observer.query("UPDATE nodeflow_durable.signal_inbox SET expires_at=clock_timestamp() WHERE run_id=$1", [run.scope.runId]);
  await store.registerWait(run.scope, profile, await claim(run));
  assert.equal((await submit(run)).state, 'expired');
  assert.equal((await inbox(run))[0].payload, null);
  assert.deepEqual(await store.readRoutedOutputs(run.scope), []);
  assert.equal((await submit(run, { commandKey: 'fresh' })).state, 'consumed');
  await verifySuccessor(run);

  const sweep = await stage('sweep');
  await submit(sweep);
  await observer.query("UPDATE nodeflow_durable.signal_inbox SET expires_at=clock_timestamp() WHERE run_id=$1", [sweep.scope.runId]);
  assert.equal(await store.sweepExpiredSignals(sweep.scope), 1);
  assert.equal((await submit(sweep)).state, 'expired');
  assert.equal((await inbox(sweep))[0].payload, null);
});

test('cancellation during authorization closes the wait before the command can advance it', async () => {
  const run = await stage('cancellation');
  const step = await claim(run);
  await store.registerWait(run.scope, profile, step);
  await assert.rejects(submit(run, {}, async () => {
    await store.cancelRun(run.scope);
    return true;
  }), conflict);
  assert.deepEqual(await inbox(run), []);
  assert.deepEqual(await store.sweepReady(run.scope), []);
  const { rows: [wait] } = await observer.query('SELECT state,revision FROM nodeflow_durable.waits WHERE run_id=$1', [run.scope.runId]);
  assert.deepEqual(wait, { state: 'closed', revision: 2 });
});

test('workspace inbox capacity refuses another early signal', async () => {
  const run = await stage('capacity', undefined, 1001);
  await observer.query(`INSERT INTO nodeflow_durable.signal_inbox
    (run_id,generation,command_key,workspace_id,node_id,signal_name,expected_revision,actor_id,fingerprint,payload,expires_at)
    SELECT run_id,step_id,'seed',$2,node_id,'approved',1,'reviewer','seed','null',clock_timestamp()+interval '1 day'
    FROM nodeflow_durable.steps WHERE run_id=$1 AND step_id<>$3`, [run.scope.runId, run.scope.workspaceId, run.command.generation]);
  await assert.rejects(submit(run), { code: 'SIGNAL_CAPACITY' });
  assert.equal((await inbox(run)).length, 1000);
});

test('signal consumption persists a continuation while its downstream edge is full', async () => {
  const run = await stage('backpressure', undefined, 2);
  const [, next] = await store.sweepReady(run.scope);
  await submit(run);
  await submit(run, { generation: next.stepId });
  await store.registerWait(run.scope, profile, await claim(run));
  await store.registerWait(run.scope, profile, await claim(run));
  assert.deepEqual((await inbox(run)).map(row => row.state), ['consumed', 'consumed']);
  const { rows: [pending] } = await observer.query(`SELECT count(*)::int AS n FROM nodeflow_durable.routing_commits
    WHERE run_id=$1 AND NOT admitted`, [run.scope.runId]);
  assert.equal(pending.n, 1);

  const successor = await claim(run);
  assert.equal(successor.nodeId, 'result');
  await assert.rejects(store.registerWait(run.scope, profile, successor), { code: 'INVALID_DELIVERY' });
  const computed = await profile.invokeDelivery(successor.nodeId, successor.input, { timeoutMs: 3000 }, successor.inputPort);
  await store.commitRoutingStep(run.scope, profile, {
    stepId: successor.stepId, workerId: successor.workerId, epoch: successor.epoch, outputs: computed.outputs,
  });
  await complete(run);
  assert.equal((await store.readRoutedOutputs(run.scope)).length, 2);
});
