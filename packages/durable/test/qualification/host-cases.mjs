import assert from 'node:assert/strict';
import { packet } from 'event-driven-design';
import { domainProfile, requestFor } from './domain-profile.mjs';
import { absentSubmission, prepare, projection } from './harness.mjs';
import { finish, invoke } from './provider-cases.mjs';
import { joinProfile } from '../fixtures/join-profile.mjs';
import { waitProfile } from '../fixtures/wait-profile.mjs';
import { watchdog } from './supervisor.mjs';

export async function rollback(env) {
  const request = requestFor('rollback');
  const pending = env.a.start({ kind: 'stage', request, hold: true });
  const { scope } = await pending.barrier('domain-staged');
  env.record('domain-staged', scope.runId, env.a);
  await env.a.kill();
  env.record('worker-killed', scope.runId, env.a);
  assert.equal((await pending.result).error, 'WORKER_EXITED');
  await absentSubmission(env.observer, request);
  assert.deepEqual(env.provider.effects, []);
  env.record('rollback-proved', scope.runId);
  return { proved: true };
}

async function complete(env, scope, request) {
  const work = await prepare(env.b, scope, request);
  assert.equal((await invoke(env, env.b, work)).state, 'succeeded');
  await finish(env, env.b, work, 'confirmed');
  await projection(env.observer, request.resourceKey, 1, 'verified');
  assert.deepEqual(env.provider.effects.map(effect => effect.key), [request.businessKey]);
  env.record('projection-proved', scope.runId);
}

export async function unavailable(env) {
  const request = requestFor('survivor');
  const scope = await env.a.call({ kind: 'stage', request });
  env.record('domain-committed', scope.runId, env.a);

  const interrupted = requestFor('interrupted');
  const pending = env.a.start({ kind: 'stage', request: interrupted, hold: true });
  const { scope: lost, backendPid } = await pending.barrier('domain-staged');
  const { rows: [terminated] } = await env.observer.query('SELECT pg_terminate_backend($1,5000) AS killed', [backendPid]);
  assert.equal(terminated.killed, true);
  env.record('backend-terminated', lost.runId);
  pending.release();
  assert.match((await watchdog(pending.result, 'connection failure')).error, /57P01|connection error|Connection terminated/i);
  env.record('connection-failed', lost.runId, env.a);
  await absentSubmission(env.observer, interrupted);
  env.record('rollback-proved', lost.runId);
  assert.deepEqual(await env.b.call({ kind: 'discover', request }), scope);
  await complete(env, scope, request);
  return { scope, proved: true };
}

export async function pin(env) {
  const request = requestFor('pin');
  const scope = await env.a.call({ kind: 'stage', request });
  env.record('domain-committed', scope.runId, env.a);
  await env.store.initializeSteps(scope, domainProfile());
  await assert.rejects(env.b.call({ kind: 'claim', scope, changed: true }), { code: 'VERSION_UNAVAILABLE' });
  assert.equal((await env.store.sweepReady(scope))[0].epoch, 0);
  assert.deepEqual(env.provider.effects, []);
  env.record('wrong-pin-refused', scope.runId, env.b);
  await complete(env, scope, request);
  return { scope, proved: true };
}

async function stageRouted(env, jobId, profile, values) {
  const workspaceId = 'qualification';
  const inputs = Object.fromEntries(Object.entries(values).map(([name, value]) =>
    [name, [packet(value, { jobId, key: 'qualified' })]]));
  const { runId } = await env.store.withDurableTransaction(workspaceId, tx => tx.stage({
    jobId, revisionId: 'qualification-v1', profilePin: profile.pin, inputs,
  }));
  const scope = { workspaceId, runId };
  await env.store.initializeSteps(scope, profile);
  return { scope, inputs };
}

export async function signal(env) {
  const profile = waitProfile();
  const { scope } = await stageRouted(env, 'signal', profile, { request: 5 });
  const { stepId } = await env.a.call({ kind: 'route', scope, work: 'wait' });
  const command = { generation: stepId, nodeId: 'review', signalName: 'approved', expectedRevision: 1,
    actorId: 'operator', commandKey: 'approve', payload: { approved: true } };
  const submit = () => env.store.submitSignal(scope, profile, command, () => true);
  const consumed = await submit();
  assert.equal(consumed.state, 'consumed');
  env.record('signal-consumed', scope.runId);
  await env.a.kill();
  env.record('worker-killed', scope.runId, env.a);
  assert.deepEqual(await Promise.all([submit(), submit()]), [consumed, consumed]);
  assert.equal(await env.b.call({ kind: 'drain', scope, work: 'wait' }), true);
  const outputs = await env.store.readRoutedOutputs(scope);
  assert.deepEqual(outputs.map(row => row.packet.value), [{ approved: true }]);
  const { rows: [counts] } = await env.observer.query(`SELECT
    (SELECT count(*)::integer FROM nodeflow_durable.signal_inbox WHERE run_id=$1 AND state='consumed') AS consumed,
    (SELECT count(*)::integer FROM nodeflow_durable.deliveries WHERE run_id=$1) AS continuations`, [scope.runId]);
  assert.deepEqual(counts, { consumed: 1, continuations: 1 });
  env.record('replay-proved', scope.runId);
  return { scope, proved: true };
}

export async function join(env) {
  const profile = joinProfile();
  const { scope, inputs } = await stageRouted(env, 'join', profile, { 'a-stats': 5, species: 8 });
  await env.a.call({ kind: 'route', scope, work: 'join' });
  const final = await env.a.call({ kind: 'route', scope, work: 'join' });
  env.record('join-completed', scope.runId, env.a);
  await env.a.kill();
  env.record('worker-killed', scope.runId, env.a);
  assert.equal(await env.store.commitRoutingStep(scope, profile, final), 'committed');
  assert.equal(await env.store.flushRouting(scope, profile), 0);
  assert.deepEqual(await env.store.claimSteps(scope, profile, { workerId: 'replacement', leaseMs: 60000, limit: 1 }), []);
  const output = await env.store.readRoutedOutputs(scope);
  assert.equal(output.length, 1);
  assert.deepEqual(output[0].packet.value, { stats: 5, species: 8 });
  assert.deepEqual(output[0].packet.parentPacketIds, [inputs['a-stats'][0].packetId, inputs.species[0].packetId]);
  const { rows } = await env.observer.query('SELECT final_step_id FROM nodeflow_durable.join_completions WHERE run_id=$1', [scope.runId]);
  assert.deepEqual(rows, [{ final_step_id: final.stepId }]);
  env.record('replay-proved', scope.runId);
  return { scope, proved: true };
}
