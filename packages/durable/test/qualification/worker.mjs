import { openPostgresStore } from '../../dist/postgres/index.js';
import { startStepWorker } from '../../dist/index.js';
import { domainProfile, publishProjection, stageDomain } from './domain-profile.mjs';
import { joinProfile } from '../fixtures/join-profile.mjs';
import { waitProfile } from '../fixtures/wait-profile.mjs';

const store = openPostgresStore(process.env.FBP_QUALIFICATION_DATABASE);
const workerId = process.env.FBP_QUALIFICATION_WORKER;
const profile = domainProfile();
const paused = new Map();
const stageBarrier = (id, label, data) => process.send({ id, label, data });
const pause = (id, label, data) => new Promise(resolve => {
  paused.set(id, resolve);
  stageBarrier(id, label, data);
});

async function act(id, { kind, scope, request, claim, operationId, provider, hold, external, changed, work }) {
  switch (kind) {
    case 'stage': {
      const result = await stageDomain(store, request, hold ? scope => pause(id, 'domain-staged', scope) : undefined);
      stageBarrier(id, 'domain-committed', result);
      return result;
    }
    case 'discover': {
      const workspaceId = 'qualification';
      const { rows: [run] } = await store.withDurableTransaction(workspaceId, tx => tx.query(
        'SELECT run_id FROM nodeflow_durable.workflow_runs WHERE workspace_id=$1 AND job_id=$2',
        [workspaceId, request.businessKey]));
      const discovered = { workspaceId, runId: run.run_id };
      await store.initializeSteps(discovered, profile);
      return discovered;
    }
    case 'claim':
      return (await store.claimSteps(scope, changed ? domainProfile(true) : profile, {
        workerId, leaseMs: 60000, limit: 1, ...(external && { external: true }),
      }))[0] ?? null;
    case 'prepare':
      return store.prepareExternalOperation(scope, claim, request);
    case 'invoke':
      return store.invokeExternalOperation(scope, claim, operationId, request, async value => {
        if (hold) await pause(id, 'permit-committed', { scope, operationId });
        const response = await fetch(provider + '/' + request.businessKey, {
          method: 'POST', body: JSON.stringify(value), signal: globalThis.AbortSignal.timeout(10000),
        });
        if (!response.ok) throw Error('PROVIDER_REFUSED');
        return response.json();
      });
    case 'recover':
      return store.recoverExternalOperation(scope, operationId);
    case 'reconcile': {
      const target = await store.getReconciliationTarget(scope, claim.stepId, operationId);
      return store.reconcileExternalOperation(scope, profile, {
        actorId: workerId, stepId: claim.stepId, operationId, commandKey: work, mode: 'lookup', expectedRevision: target.revision,
      }, {
        provider: 'fixture', policyVersion: 'v1', authorize: () => true,
        async readEvidence(binding) {
          const response = await fetch(provider + '/' + binding.businessKey, { signal: globalThis.AbortSignal.timeout(5000) });
          const value = await response.json();
          return value.found
            ? { kind: 'succeeded', binding, evidenceRef: 'confirmed', value: value.result }
            : { kind: 'inconclusive', binding, evidenceRef: 'absent', reason: 'ABSENT', reviewAfterMs: 1000 };
        },
      });
    }
    case 'wake':
      return store.publishStepWake(scope, work);
    case 'drain': {
      const selected = work === 'wait' ? waitProfile() : profile;
      const active = startStepWorker({ store, scope, profile: selected, workerId, timeoutMs: 5000, pollMs: 10, concurrency: 1 });
      try {
        for (let i = 0; i < 200; i++) {
          if ((await store.getRunTiming(scope)).status === 'completed') return work === 'wait' ? true : publishProjection(store, scope);
          await new Promise(resolve => globalThis.setTimeout(resolve, 10));
        }
        throw Error('RUN_DID_NOT_COMPLETE');
      } finally { await active.stop(); }
    }
    case 'route': {
      const selected = work === 'join' ? joinProfile() : waitProfile();
      const steps = await store.claimSteps(scope, selected, { workerId, leaseMs: 60000, limit: 1 });
      const [step] = steps;
      if (work === 'join') {
        const command = { stepId: step.stepId, workerId, epoch: step.epoch, outputs: {} };
        await store.commitRoutingStep(scope, selected, command);
        return command;
      }
      await store.registerWait(scope, selected, step);
      return { stepId: step.stepId };
    }
    default:
      throw Error('UNKNOWN_QUALIFICATION_COMMAND');
  }
}

process.on('message', ({ id, release, action }) => {
  if (release) {
    paused.get(id)?.();
    paused.delete(id);
    return;
  }
  void act(id, action).then(
    result => process.send({ id, result }),
    error => process.send({ id, error: error.code ?? error.message }),
  );
});
