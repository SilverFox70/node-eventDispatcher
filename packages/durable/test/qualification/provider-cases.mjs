import assert from 'node:assert/strict';
import { domainProfile, publishProjection, requestFor } from './domain-profile.mjs';
import { expireClaim, prepare, projection } from './harness.mjs';
import { watchdog } from './supervisor.mjs';

const stage = async (env, worker, request) => {
  const scope = await worker.call({ kind: 'stage', request });
  await env.store.initializeSteps(scope, domainProfile());
  return scope;
};
export async function invoke(env, worker, work) {
  return worker.call({ kind: 'invoke', ...work, provider: env.provider.url });
}
export async function reconcile(env, worker, work, key) {
  return worker.call({ kind: 'reconcile', ...work, provider: env.provider.url, work: key });
}
export async function finish(env, worker, work, key) {
  const result = await reconcile(env, worker, work, key);
  assert.equal(result.status, 'succeeded');
  assert(result.receipt.successorId);
  assert.equal(await worker.call({ kind: 'drain', scope: work.scope }), 1);
  assert.equal(await worker.call({ kind: 'drain', scope: work.scope }), 0);
  return result;
}
const acceptedOnce = (env, request) => {
  const effects = env.provider.effects.filter(effect => effect.key === request.businessKey);
  assert.equal(effects.length, 1);
  return effects[0];
};

export async function submission(env) {
  const request = requestFor('submit');
  const scope = await env.a.call({ kind: 'stage', request });
  env.record('domain-committed', scope.runId, env.a);
  await env.a.kill();
  env.record('worker-killed', scope.runId, env.a);
  const { rows } = await env.observer.query('SELECT revision FROM qualification_domain WHERE resource=$1', [request.resourceKey]);
  assert.deepEqual(rows, [{ revision: 1 }]);
  assert.deepEqual(await env.b.call({ kind: 'discover', request }), scope);
  const work = await prepare(env.b, scope, request);
  env.record('prepared', work.operationId, env.b);
  assert.equal((await invoke(env, env.b, work)).state, 'succeeded');
  env.accepted(acceptedOnce(env, request));
  const outcome = await reconcile(env, env.b, work, 'continue');
  env.record('outcome-committed', outcome.receipt.outcomeId, env.b);
  for (let i = 0; i < 3; i++) {
    assert.equal(await env.b.call({ kind: 'wake', scope, work: outcome.receipt.outcomeId }), true);
  }
  assert.equal(await env.b.call({ kind: 'drain', scope }), 1);
  assert.equal(await env.b.call({ kind: 'drain', scope }), 0);
  await projection(env.observer, request.resourceKey, 1, 'verified');
  env.record('projection-proved', scope.runId);
  return { scope, proved: true };
}

export async function prepared(env) {
  const request = requestFor('prepared');
  const scope = await stage(env, env.a, request);
  const work = await prepare(env.a, scope, request);
  env.record('prepared', work.operationId, env.a);
  await env.a.kill();
  env.record('worker-killed', scope.runId, env.a);
  assert.equal(env.provider.effects.length, 0);
  await expireClaim(env.observer, work.claim);
  const replacement = await prepare(env.b, scope, request, true);
  assert.equal(replacement.operationId, work.operationId);
  assert.equal(replacement.claim.epoch, work.claim.epoch + 1);
  env.record('reclaimed', work.operationId, env.b);
  assert.equal((await invoke(env, env.b, replacement)).state, 'succeeded');
  env.accepted(acceptedOnce(env, request));
  await finish(env, env.b, replacement, 'confirmed');
  await projection(env.observer, request.resourceKey, 1, 'verified');
  env.record('projection-proved', scope.runId);
  return { scope, proved: true };
}

export async function permit(env) {
  const request = requestFor('paused');
  const scope = await stage(env, env.a, request);
  const work = await prepare(env.a, scope, request);
  const pending = env.a.start({ kind: 'invoke', ...work, provider: env.provider.url, hold: true });
  assert.deepEqual(await pending.barrier('permit-committed'), { scope, operationId: work.operationId });
  env.record('permit-committed', work.operationId, env.a);
  await expireClaim(env.observer, work.claim);
  assert.equal((await env.b.call({ kind: 'recover', ...work })).state, 'uncertain');
  env.record('uncertain', work.operationId, env.b);
  assert.equal((await reconcile(env, env.b, work, 'absence')).status, 'inconclusive');
  assert.equal(await env.b.call({ kind: 'claim', scope, external: true }), null);
  assert.deepEqual(env.provider.effects, []);
  env.record('absence-held', work.operationId, env.b);
  pending.release();
  env.accepted(await watchdog(env.provider.accepted(request.businessKey), 'late provider acceptance'));
  assert.equal((await watchdog(pending.result, 'fenced result')).error, 'STALE_CLAIM');
  env.record('late-fenced', work.operationId, env.a);
  await finish(env, env.b, work, 'confirmed');
  acceptedOnce(env, request);
  await projection(env.observer, request.resourceKey, 1, 'verified');
  env.record('projection-proved', scope.runId);
  return { scope, proved: true };
}

export async function accepted(env) {
  const request = requestFor('shared');
  const scope = await stage(env, env.a, request);
  const work = await prepare(env.a, scope, request);
  env.provider.hold(request.businessKey);
  const pending = env.a.start({ kind: 'invoke', ...work, provider: env.provider.url, hold: true });
  await pending.barrier('permit-committed');
  env.record('permit-committed', work.operationId, env.a);
  pending.release();
  const effect = await watchdog(Promise.race([
    env.provider.accepted(request.businessKey),
    pending.result.then(() => { throw Error('Worker returned before provider acceptance'); }),
  ]), 'provider accepted before worker death');
  assert(env.provider.replyHeld(request.businessKey));
  assert.deepEqual(effect.result, request.payload);
  env.accepted(effect);
  await env.a.kill();
  assert.equal((await pending.result).error, 'WORKER_EXITED');
  env.record('worker-killed', scope.runId, env.a);
  await expireClaim(env.observer, work.claim);
  assert.equal((await env.b.call({ kind: 'recover', ...work })).state, 'uncertain');
  assert.equal(await env.b.call({ kind: 'claim', scope, external: true }), null);
  env.record('uncertain', work.operationId, env.b);

  const later = requestFor('shared', 2, false);
  const laterScope = await stage(env, env.b, later);
  const laterWork = await prepare(env.b, laterScope, later);
  await assert.rejects(invoke(env, env.b, laterWork), { code: 'EXTERNAL_OPERATION_HELD' });
  env.record('later-held', laterWork.operationId, env.b);
  const independent = requestFor('independent', 1, false);
  const independentScope = await stage(env, env.b, independent);
  const other = await prepare(env.b, independentScope, independent);
  assert.equal((await invoke(env, env.b, other)).state, 'succeeded');
  await finish(env, env.b, other, 'confirmed');
  await projection(env.observer, 'independent', 1, 'skipped');
  assert.deepEqual(await env.store.sweepReady(scope), []);
  assert.deepEqual(env.provider.effects.map(item => item.key), [request.businessKey, independent.businessKey]);
  env.record('independent-projected', independentScope.runId);

  const outcome = await reconcile(env, env.b, work, 'confirmed');
  assert.equal(outcome.status, 'succeeded');
  env.record('outcome-committed', outcome.receipt.outcomeId, env.b);
  assert.equal(await env.b.call({ kind: 'drain', scope }), 1);
  await projection(env.observer, 'shared', 1, 'verified');
  env.record('projection-proved', scope.runId);
  assert.equal((await invoke(env, env.b, laterWork)).state, 'succeeded');
  await finish(env, env.b, laterWork, 'confirmed');
  assert.equal(await publishProjection(env.store, scope), 0);
  await projection(env.observer, 'shared', 2, 'skipped', 2);
  assert.deepEqual(env.provider.effects.map(item => item.key), [request.businessKey, independent.businessKey, later.businessKey]);
  env.record('stale-projection-fenced', laterScope.runId);
  return { scope, proved: true };
}

export async function outcome(env) {
  const request = requestFor('outcome');
  const scope = await stage(env, env.a, request);
  const work = await prepare(env.a, scope, request);
  assert.equal((await invoke(env, env.a, work)).state, 'succeeded');
  env.accepted(acceptedOnce(env, request));
  const applied = await reconcile(env, env.a, work, 'confirmed');
  assert.equal(applied.status, 'succeeded');
  assert.deepEqual((await env.store.sweepReady(scope)).map(step => step.stepId), [applied.receipt.successorId]);
  env.record('outcome-committed', applied.receipt.outcomeId, env.a);
  await env.a.kill();
  env.record('worker-killed', scope.runId, env.a);
  assert.equal(await env.b.call({ kind: 'drain', scope }), 1);
  assert.equal(await env.b.call({ kind: 'wake', scope, work: applied.receipt.outcomeId }), true);
  assert.equal(await env.b.call({ kind: 'wake', scope, work: applied.receipt.outcomeId }), true);
  assert.equal(await env.b.call({ kind: 'drain', scope }), 0);
  await assert.rejects(reconcile(env, env.b, work, 'replayed'), { code: 'ALREADY_RESOLVED' });
  acceptedOnce(env, request);
  await projection(env.observer, request.resourceKey, 1, 'verified');
  env.record('projection-proved', scope.runId);
  return { scope, proved: true };
}
