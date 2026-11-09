import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { packet } from 'event-driven-design';
import { openPostgresStore } from 'event-driven-design-durable/postgres';
import { joinProfile } from './fixtures/join-profile.mjs';
import { stepProfile } from './fixtures/step-profile.mjs';
import { stageApproval } from './approval/host.mjs';

const migrations = new globalThis.URL('./node_modules/event-driven-design-durable/migrations/', import.meta.url);

export async function seedLegacy(observer, database) {
  await observer.query('CREATE SCHEMA nodeflow_durable');
  await observer.query(`CREATE TABLE nodeflow_durable.schema_version (
    singleton boolean PRIMARY KEY CHECK (singleton), version integer NOT NULL CHECK (version>0))`);
  for (const file of (await readdir(migrations)).filter(file => /^00[1-9]-/.test(file)).sort()) {
    await observer.query(await readFile(new globalThis.URL(file, migrations), 'utf8'));
  }
  await observer.query('INSERT INTO nodeflow_durable.schema_version VALUES (true,9)');
  await observer.query(await readFile(new globalThis.URL('./approval/schema.sql', import.meta.url), 'utf8'));
  const store = openPostgresStore(database);
  try {
    const approval = await stageApproval(store, 'packed-approval');
    const uncertain = await seedUncertain(store);
    await seedCompletion(store);
    return { approval, uncertain };
  } finally { await store.close(); }
}

async function stage(store, profile, jobId, values) {
  const workspaceId = 'retention';
  const inputs = Object.fromEntries(Object.entries(values).map(([port, value]) => [port, [packet(value, { jobId, key: 'retained' })]]));
  const { runId } = await store.withDurableTransaction(workspaceId, tx => tx.stage({
    jobId, revisionId: 'retention-v1', profilePin: profile.pin, inputs,
  }));
  const scope = { workspaceId, runId };
  await store.initializeSteps(scope, profile);
  return scope;
}

async function seedUncertain(store) {
  const profile = stepProfile();
  const scope = await stage(store, profile, 'uncertain', { request: 1 });
  const [claim] = await store.claimSteps(scope, profile, { workerId: 'fixture', leaseMs: 60000, limit: 1 });
  const request = { provider: 'fixture', businessKey: 'retained-operation', resourceKey: 'retained',
    revision: 1, policy: 'reconcile-required', policyVersion: 'v1', payload: 1 };
  const operation = await store.prepareExternalOperation(scope, claim, request);
  const recorded = await store.invokeExternalOperation(scope, claim, operation.operationId, request, async () => {
    throw Error('Response lost');
  });
  assert.equal(recorded.state, 'uncertain');
  return { scope, stepId: claim.stepId, operationId: operation.operationId };
}

async function seedCompletion(store) {
  const profile = joinProfile();
  const scope = await stage(store, profile, 'completed-join', { 'a-stats': 3, species: 5 });
  for (let i = 0; i < 2; i++) {
    const [claim] = await store.claimSteps(scope, profile, { workerId: 'join', leaseMs: 60000, limit: 1 });
    await store.commitRoutingStep(scope, profile, { stepId: claim.stepId, workerId: claim.workerId, epoch: claim.epoch, outputs: {} });
  }
  assert.equal((await store.readRoutedOutputs(scope)).length, 1);
}

export async function verifyMissingEvidence(database, work) {
  const store = openPostgresStore(database);
  try {
    const profile = stepProfile();
    const initial = await store.getReconciliationTarget(work.scope, work.stepId, work.operationId);
    let lookups = 0;
    const outcome = await store.reconcileExternalOperation(work.scope, profile, {
      stepId: work.stepId, operationId: work.operationId, actorId: 'reviewer',
      commandKey: 'missing-evidence', expectedRevision: initial.revision, mode: 'lookup',
    }, {
      provider: 'fixture', policyVersion: 'v1', authorize: () => true,
      async readEvidence(binding) {
        lookups++;
        return { binding, kind: 'inconclusive', reason: 'ABSENT', reviewAfterMs: 1000, evidenceRef: 'provider-unavailable' };
      },
    });
    assert.equal(lookups, 1);
    assert.equal(outcome.status, 'inconclusive');
    assert.equal(outcome.reason, 'ABSENT');
    assert.equal((await store.getReconciliationTarget(work.scope, work.stepId, work.operationId)).state, 'uncertain');
    assert.deepEqual(await store.sweepReady(work.scope), []);
  } finally { await store.close(); }
}
