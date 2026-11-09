import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { derivePacket, packet } from 'event-driven-design';
import { startStepWorker } from '../dist/index.js';
import { openPostgresStore } from '../dist/postgres/index.js';
import { routingProfile } from './fixtures/routing-profile.mjs';

const adminUrl = process.env.FBP_POSTGRES_TEST_URL;
assert(adminUrl);
const admin = new pg.Pool({ connectionString: adminUrl });
const database = 'fbp_s46_' + randomUUID().replaceAll('-', '');
const url = new globalThis.URL(adminUrl);
url.pathname = '/' + database;
const profile = routingProfile();
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

async function stage(jobId, values) {
  const workspaceId = 'workspace';
  const inputs = values.map(value => packet(value, { jobId }));
  const { runId } = await store.withDurableTransaction(workspaceId, tx => tx.stage({
    jobId, revisionId: 'routing', profilePin: profile.pin, inputs: { request: inputs },
  }));
  const scope = { workspaceId, runId };
  await store.initializeSteps(scope, profile);
  return { scope, inputs };
}
const claim = (scope, limit = 1) => store.claimSteps(scope, profile, { workerId: 'test', leaseMs: 60000, limit });
async function compute(step) {
  const result = await profile.invokeDelivery(step.nodeId, step.input, { timeoutMs: 5000 }, step.inputPort);
  assert.equal(result.status, 'computed');
  return { stepId: step.stepId, workerId: step.workerId, epoch: step.epoch, outputs: result.outputs };
}
async function waitFor(scope, status) {
  for (let i = 0; i < 200; i++) {
    if ((await store.getRunTiming(scope)).status === status) return;
    await delay(15);
  }
  throw Error('Expected run status ' + status);
}
function worker(scope) {
  return startStepWorker({ store, scope, profile, workerId: 'worker', timeoutMs: 5000, pollMs: 10, concurrency: 2 });
}

test('atomic fan-out waits at capacity, replays exactly, and drains FIFO deliveries', async () => {
  const { scope } = await stage('capacity', [1, 2, 0]);
  const roots = await claim(scope, 3);
  assert.equal(roots.length, 3);
  const [first, second, third] = await Promise.all(roots.map(compute));
  const commit = command => store.commitRoutingStep(scope, profile, command);
  for (const invalid of [
    { ...first, sequence: 10 },
    { ...first, outputs: { wrong: [], right: [] } },
    { ...first, outputs: null },
    { ...first, outputs: { ...first.outputs, right: first.outputs.left } },
    { ...first, outputs: { ...first.outputs, left: [] } },
    { ...first, outputs: { ...first.outputs, left: [derivePacket('wrong', [roots[0].input])] } },
    { ...first, outputs: { ...first.outputs, left: [packet(2)] } },
  ]) await assert.rejects(commit(invalid));
  assert.equal((await observer.query('SELECT count(*)::int AS n FROM nodeflow_durable.deliveries WHERE run_id=$1', [scope.runId])).rows[0].n, 0);
  await assert.rejects(commit({ ...first, epoch: 2 }), { code: 'STALE_CLAIM' });
  await assert.rejects(commit({ ...first, stepId: randomUUID() }), { code: 'STALE_CLAIM' });
  await assert.rejects(commit({ ...first, workerId: 'wrong' }), { code: 'STALE_CLAIM' });
  assert.equal(await commit(first), 'committed');
  assert.equal(await commit(first), 'committed');
  assert.equal(await commit(second), 'pending');
  assert.equal(await commit(second), 'pending');
  assert.equal(await commit(third), 'pending');
  assert.equal(await store.flushRouting(scope, profile), 0);
  await assert.rejects(commit({ ...first, outputs: second.outputs }), { code: 'OUTCOME_CONFLICT' });
  const initial = await claim(scope, 2);
  assert.equal(initial.length, 2);
  assert.deepEqual(initial.map(step => step.input.value), [roots[0].input.value, roots[0].input.value]);
  const right = initial.find(step => step.nodeId === 'right');
  const rightCommand = await compute(right);
  await assert.rejects(commit({ ...rightCommand, outputs: { out: [derivePacket(1, [right.input])] } }),
    { code: 'INVALID_DELIVERY' });
  await Promise.all((await Promise.all(initial.map(compute))).map(commit));
  assert.equal(await store.flushRouting(scope, profile), 1);

  const running = worker(scope);
  try { await waitFor(scope, 'completed'); }
  finally { await running.stop(); }
  const outputs = await store.readRoutedOutputs(scope);
  assert.deepEqual(outputs.map(row => row.packet.value).sort((a, b) => a - b), [1, 2, 10, 11, 12]);
  assert.equal(new Set(outputs.map(row => row.packet.packetId)).size, 5);
  assert.deepEqual(await store.readRoutedOutputs(scope, outputs[0].sequence), outputs.slice(1));
  await assert.rejects(store.readRoutedOutputs(scope, '-1'), { code: 'INVALID_OUTPUT_CURSOR' });
  assert.equal(await store.flushRouting(scope, profile), 0);
  const { rows } = await observer.query(`SELECT edge_index,array_agg(sequence::integer ORDER BY sequence) AS sequence
    FROM nodeflow_durable.deliveries WHERE run_id=$1 GROUP BY edge_index ORDER BY edge_index`, [scope.runId]);
  assert.deepEqual(rows.map(row => row.sequence), [[1,2,3], [1,2,3], [1,2,3], [1,2]]);
});

test('a killed producer retains one committed branch and restarts three jobs exactly once', { timeout: 15000 }, async () => {
  const runs = await Promise.all([1, 2, 3].map(value => stage('job-' + value, [value])));
  const child = fork(new globalThis.URL('./fixtures/routing-worker.mjs', import.meta.url), []);
  const exited = once(child, 'exit');
  try {
    const message = once(child, 'message');
    child.send({ url: url.href, scope: runs[0].scope });
    const [result] = await Promise.race([message, exited.then(() => { throw Error('worker exited before branch commit'); })]);
    assert.deepEqual(result, { committed: true });
  } finally { child.kill('SIGKILL'); await exited; }
  const before = await observer.query('SELECT count(*)::int AS n FROM nodeflow_durable.routing_commits WHERE run_id=$1 AND admitted', [runs[0].scope.runId]);
  assert.equal(before.rows[0].n, 2);
  const workers = runs.map(run => worker(run.scope));
  try { await Promise.all(runs.map(run => waitFor(run.scope, 'completed'))); }
  finally { await Promise.all(workers.map(active => active.stop())); }
  for (const { scope, inputs: [source] } of runs) {
    const outputs = await store.readRoutedOutputs(scope);
    assert.deepEqual(outputs.map(row => row.packet.value).sort((a, b) => a - b), [source.value, source.value + 10]);
    const { rows } = await observer.query('SELECT packet_id,parent_packet_id FROM nodeflow_durable.step_packets WHERE run_id=$1', [scope.runId]);
    const byId = new Map(rows.map(row => [row.packet_id, row.parent_packet_id]));
    for (const { packet: output } of outputs) {
      assert.equal(output.jobId, source.jobId);
      assert.equal(output.parentPacketIds[0], byId.get(output.packetId));
      const parent = byId.get(output.packetId);
      assert(parent === source.packetId || byId.get(parent) === source.packetId);
    }
  }
});

test('first branch failure fences a sibling already holding a claim', async () => {
  const { scope } = await stage('failed-branch', [-1]);
  const [fork] = await claim(scope);
  const command = await compute(fork);
  await assert.rejects(store.prepareExternalOperation(scope, fork, {
    provider: 'fixture', businessKey: 'blocked', resourceKey: 'blocked', revision: 1,
    policy: 'reconcile-required', policyVersion: 'v1', payload: null,
  }), { code: 'STALE_CLAIM' });
  await observer.query("UPDATE nodeflow_durable.steps SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE step_id=$1", [fork.stepId]);
  await assert.rejects(store.commitRoutingStep(scope, profile, command), { code: 'STALE_CLAIM' });
  await observer.query("UPDATE nodeflow_durable.steps SET lease_expires_at=clock_timestamp()+interval '1 minute' WHERE step_id=$1", [fork.stepId]);
  await assert.rejects(store.commitStep(scope, profile, {
    stepId: fork.stepId, workerId: fork.workerId, epoch: fork.epoch, commitKey: 'legacy',
    result: { kind: 'computed', packet: command.outputs.left[0] },
  }), { code: 'INVALID_DELIVERY' });
  await store.commitRoutingStep(scope, profile, command);
  const branches = await claim(scope, 2);
  const failed = branches.find(step => step.nodeId === 'left');
  const sibling = branches.find(step => step.nodeId === 'right');
  await store.commitStep(scope, profile, {
    stepId: failed.stepId, workerId: failed.workerId, epoch: failed.epoch, commitKey: 'failed',
    result: { kind: 'failed', code: 'COMPONENT_FAILED' },
  });
  await assert.rejects(store.commitRoutingStep(scope, profile, await compute(sibling)), { code: 'RUN_TERMINATED' });
  assert.equal((await store.getRunTiming(scope)).status, 'failed');
  assert.deepEqual(await store.readRoutedOutputs(scope), []);
});
