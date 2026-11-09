import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { packet } from 'event-driven-design';
import { prepareDurableProfile, startStepWorker } from '../dist/index.js';
import { openPostgresStore } from '../dist/postgres/index.js';
import { joinInput, joinProfile, joinProfileOptions } from './fixtures/join-profile.mjs';

const adminUrl = process.env.FBP_POSTGRES_TEST_URL;
assert(adminUrl);
const admin = new pg.Pool({ connectionString: adminUrl });
const database = 'fbp_s47_' + randomUUID().replaceAll('-', '');
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

async function stage(jobId, parts, profile = joinProfile()) {
  const workspaceId = 'join-workspace';
  const inputs = Object.fromEntries(Object.entries(parts).map(([port, entries]) => [port,
    entries.map(([value, key]) => packet(value, key === undefined ? { jobId } : { jobId, key }))]));
  const { runId } = await store.withDurableTransaction(workspaceId, tx => tx.stage({
    jobId, revisionId: 'join', profilePin: profile.pin, inputs: Object.fromEntries(Object.entries(inputs).map(([port, packets]) => [joinInput(port), packets])),
  }));
  const scope = { workspaceId, runId };
  await store.initializeSteps(scope, profile);
  return { scope, profile, inputs };
}

const command = claim => ({ stepId: claim.stepId, workerId: claim.workerId, epoch: claim.epoch, outputs: {} });
const commit = (run, claim) => store.commitRoutingStep(run.scope, run.profile, command(claim));
const claimAll = run => store.claimSteps(run.scope, run.profile, { workerId: 'test', leaseMs: 60000, limit: 20 });
const read = run => store.readRoutedOutputs(run.scope);
async function count(run, table) {
  return (await observer.query('SELECT count(*)::int AS n FROM nodeflow_durable.' + table + ' WHERE run_id=$1',
    [run.scope.runId])).rows[0].n;
}
async function drive(run, expected) {
  const errors = [];
  const worker = startStepWorker({ store, ...run, workerId: 'restart', timeoutMs: 5000,
    pollMs: 10, concurrency: 1, onError: error => errors.push(error) });
  try {
    for (let i = 0; i < 200; i++) {
      const status = await store.getRunTiming(run.scope);
      if (status.status === expected) { assert.deepEqual(errors, []); return status; }
      await delay(15);
    }
    assert.fail('Expected terminal status ' + expected + ' but received ' + JSON.stringify(errors));
  } finally { await worker.stop(); }
}

test('a killed worker leaves a committed slot that joins only with its own job after restart', { timeout: 15000 }, async () => {
  const first = await stage('first-job', { stats: [[25, 'same']], species: [[9, 'same']] });
  const second = await stage('second-job', { stats: [[50, 'same']], species: [[20, 'same']] });
  const child = fork(new globalThis.URL('./fixtures/join-worker.mjs', import.meta.url), []);
  const exited = once(child, 'exit');
  try {
    const message = once(child, 'message');
    child.send({ url: url.href, scope: first.scope });
    const [result] = await Promise.race([message, exited.then(() => { throw Error('worker exited before slot commit'); })]);
    assert.deepEqual(result, { status: 'committed' });
  } finally { child.kill('SIGKILL'); await exited; }
  assert.equal(await count(first, 'join_slots'), 1);
  assert.equal(await count(first, 'join_completions'), 0);
  assert.deepEqual(await read(first), []);
  await Promise.all([drive(first, 'completed'), drive(second, 'completed')]);
  for (const run of [first, second]) {
    const [result, extra] = await read(run);
    const { stats: [stats], species: [species] } = run.inputs;
    assert.equal(extra, undefined);
    assert.deepEqual(result.packet.value, { stats: stats.value, species: species.value });
    assert.deepEqual(result.packet.parentPacketIds, [stats.packetId, species.packetId]);
    assert.equal(result.packet.jobId, stats.jobId);
    assert.equal(result.packet.key, 'same');
    assert.equal(await count(run, 'join_slots'), 0);
    assert.equal(await count(run, 'join_completions'), 1);
  }
});

test('duplicate deliveries refuse without overwriting a slot or reopening a completion', async () => {
  const run = await stage('duplicate-job', { stats: [[1, 'key'], [2, 'key']], species: [[3, 'key'], [4, 'key']] });
  const claims = await claimAll(run);
  const byValue = value => claims.find(claim => claim.input.value === value);
  await assert.rejects(store.commitRoutingStep(run.scope, run.profile, { ...command(byValue(1)), outputs: { out: [] } }),
    { code: 'INVALID_DELIVERY' });
  assert.equal(await commit(run, byValue(1)), 'committed');
  assert.equal(await commit(run, byValue(1)), 'committed');
  await assert.rejects(commit(run, byValue(2)), { code: 'DUPLICATE_KEY' });
  assert.equal(await count(run, 'join_slots'), 1);
  assert.equal(await commit(run, byValue(3)), 'committed');
  assert.equal(await commit(run, byValue(3)), 'committed');
  for (const value of [2, 4]) await assert.rejects(commit(run, byValue(value)), { code: 'JOIN_GROUP_COMPLETED' });
  assert.deepEqual((await read(run)).map(row => row.packet.value), [{ stats: 1, species: 3 }]);
  await store.cancelRun(run.scope);
  assert.equal(await count(run, 'join_completions'), 1);
  assert.equal(await count(run, 'join_slots'), 0);
});

test('partial capacity, completion capacity, missing key and incomplete input fail explicitly', async () => {
  const cases = [
    { job: 'duplicate-terminal', parts: { stats: [[1, 'key'], [2, 'key']], species: [[3, 'key']] },
      limits: {}, code: 'DUPLICATE_KEY', completions: 0 },
    { job: 'capacity', parts: { stats: [[1, 'a'], [2, 'b']] }, limits: { maxKeys: 1 }, code: 'JOIN_CAPACITY', completions: 0 },
    { job: 'history', parts: { stats: [[1, 'a'], [2, 'b']], species: [[3, 'a'], [4, 'b']] },
      limits: { completedGroupLimit: 1 }, code: 'JOIN_HISTORY_CAPACITY', completions: 1 },
    { job: 'missing-key', parts: { stats: [[1]] }, limits: {}, code: 'INVALID_PACKET', completions: 0 },
    { job: 'incomplete', parts: { stats: [[1, 'a']] }, limits: {}, code: 'JOIN_INCOMPLETE', completions: 0 },
  ];
  for (const { job, parts, limits, code, completions } of cases) {
    const profile = prepareDurableProfile(joinProfileOptions(undefined, limits));
    const run = await stage(job, parts, profile);
    const status = await drive(run, 'failed');
    const failure = await observer.query('SELECT failure_code FROM nodeflow_durable.step_outcomes WHERE run_id=$1', [run.scope.runId]);
    assert.equal(status.failureCode ?? failure.rows[0]?.failure_code, code);
    assert.equal(await count(run, 'join_groups'), 0);
    assert.equal(await count(run, 'join_completions'), completions);
    assert.equal((await read(run)).length, completions);
  }
});

test('a full edge holds a completed output without reopening the join', async () => {
  const profile = prepareDurableProfile(joinProfileOptions(undefined, {}, true));
  const run = await stage('full-edge', { stats: [[1, 'a'], [2, 'b']], species: [[3, 'a'], [4, 'b'], [5, 'b']] }, profile);
  const claims = await claimAll(run);
  const byValue = value => claims.find(claim => claim.input.value === value);
  for (const value of [1, 3, 2]) assert.equal(await commit(run, byValue(value)), 'committed');
  assert.equal(await commit(run, byValue(4)), 'pending');
  assert.equal(await count(run, 'join_completions'), 2);
  assert.equal(await count(run, 'join_slots'), 0);
  await assert.rejects(commit(run, byValue(5)), { code: 'JOIN_GROUP_COMPLETED' });
  const [sink] = await claimAll(run);
  const result = await profile.invokeDelivery(sink.nodeId, sink.input, { timeoutMs: 5000 }, sink.inputPort);
  await store.commitRoutingStep(run.scope, profile, { ...command(sink), outputs: result.outputs });
  assert.equal(await store.flushRouting(run.scope, profile), 1);
  assert.equal(await commit(run, byValue(4)), 'committed');
  assert.equal(await count(run, 'deliveries'), 2);
});

test('the join transaction refuses invalid persisted ports and output payloads without partial effects', async () => {
  const run = await stage('invalid-delivery', { stats: [[1, 'key']], species: [[2, 'key']] });
  const claims = await claimAll(run);
  const stats = claims.find(claim => claim.inputPort === 'stats');
  const species = claims.find(claim => claim.inputPort === 'species');
  await observer.query("UPDATE nodeflow_durable.steps SET input_port='unknown' WHERE step_id=$1", [stats.stepId]);
  await assert.rejects(commit(run, stats), { code: 'INVALID_DELIVERY' });
  assert.equal(await count(run, 'join_slots'), 0);
  await observer.query("UPDATE nodeflow_durable.steps SET input_port='stats' WHERE step_id=$1", [stats.stepId]);
  assert.equal(await commit(run, stats), 'committed');
  await observer.query(`UPDATE nodeflow_durable.step_packets SET envelope=$3 WHERE run_id=$1 AND packet_id=$2`,
    [run.scope.runId, species.input.packetId, JSON.stringify({ ...species.input, value: 'wrong' })]);
  await assert.rejects(commit(run, species), { code: 'OUTPUT_CONTRACT' });
  assert.equal(await count(run, 'join_slots'), 1);
  assert.equal(await count(run, 'join_completions'), 0);
  assert.deepEqual(await read(run), []);
});
