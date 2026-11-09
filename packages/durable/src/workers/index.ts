import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { FlowError } from 'event-driven-design';
import type { openPostgresStore } from '../postgres/index.js';
import type { DurableProfile, StepClaim, StepResult, StepScope } from '../steps/model.js';
import { profileDefinition } from '../profile/definition.js';
import { isJoinRefusal } from '../operators/join/refusals.js';
import { checkScope } from '../steps/model.js';
import { validIdentifier } from '../submission/input.js';

type Store = Pick<ReturnType<typeof openPostgresStore>, 'claimSteps' | 'heartbeatStep' | 'commitStep' | 'scheduleStepRetry' | 'commitRoutingStep' | 'flushRouting' | 'registerWait'>;
export type StepWorkerOptions = Readonly<{
  store: Store; scope: StepScope; profile: DurableProfile; workerId: string; timeoutMs: number;
  leaseMs?: number; heartbeatMs?: number; pollMs?: number; concurrency?: number;
  onError?: (error: unknown) => void;
}>;

const integerIn = (value: number, min: number, max: number) =>
  Number.isSafeInteger(value) && value >= min && value <= max;

async function pause(ms: number, signal: AbortSignal) {
  // These validated timers only reject when their local controller aborts.
  await delay(ms, undefined, { signal }).catch(() => {});
}

function failure(code: string): StepResult {
  switch (code) {
    case 'OUTPUT_CONTRACT': case 'NODE_TIMEOUT': case 'TIMEOUT': case 'CANCELLED':
      return { kind: 'failed', code };
    default:
      return { kind: 'failed', code: 'COMPONENT_FAILED' };
  }
}

/** Own one bounded periodic sweep. Stop aborts local work and leaves lease expiry to PostgreSQL. */
export function startStepWorker(options: StepWorkerOptions) {
  const { store, profile, workerId, timeoutMs, leaseMs = 30000, heartbeatMs = 10000,
    pollMs = 5000, concurrency = 8, onError = () => {} } = options;
  const scope = checkScope(options.scope);
  if (!validIdentifier(workerId) || !integerIn(timeoutMs, 1, 2147483647) ||
      !integerIn(leaseMs, 2, 300000) || !integerIn(heartbeatMs, 1, leaseMs - 1) ||
      !integerIn(pollMs, 1, 60000) || !integerIn(concurrency, 1, 100)) {
    throw new FlowError('INVALID_WORKER_OPTIONS');
  }
  const shutdown = new globalThis.AbortController();

  async function commitJoin(claim: StepClaim) {
    const identity = { stepId: claim.stepId, workerId, epoch: claim.epoch };
    try {
      await store.commitRoutingStep(scope, profile, { ...identity, outputs: {} });
    } catch (error) {
      if (!(error instanceof FlowError) || !(isJoinRefusal(error.code) || error.code === 'OUTPUT_CONTRACT')) throw error;
      await store.commitStep(scope, profile, {
        ...identity, commitKey: claim.stepId, result: { kind: 'failed', code: error.code },
      });
    }
  }

  async function execute(claim: StepClaim, claimStarted: number) {
    const stopHeartbeat = new globalThis.AbortController();
    const lost = new globalThis.AbortController();
    const pulseSignal = globalThis.AbortSignal.any([shutdown.signal, stopHeartbeat.signal]);
    const signal = globalThis.AbortSignal.any([shutdown.signal, lost.signal]);
    const pulse = (async () => {
      while (!pulseSignal.aborted) {
        await pause(heartbeatMs, pulseSignal);
        if (pulseSignal.aborted) break;
        try { await store.heartbeatStep(scope, claim, leaseMs); }
        catch (error) { lost.abort(); onError(error); break; }
      }
    })();
    try {
      const remaining = claim.remainingMs === null ? timeoutMs : Math.floor(claim.remainingMs - (performance.now() - claimStarted));
      if (remaining <= 0) return;
      const deadline = claim.remainingMs === null ? signal : globalThis.AbortSignal.timeout(remaining);
      const invocation = { timeoutMs, signal: globalThis.AbortSignal.any([signal, deadline]) };
      const definition = profileDefinition(profile);
      const waiting = definition.waits.has(claim.nodeId);
      const persisted = waiting || definition.joins.has(claim.nodeId);
      const computed = persisted ? null : profile.routed
        ? await profile.invokeDelivery(claim.nodeId, claim.input, invocation, claim.inputPort)
        : await profile.invokeOnce(claim.nodeId, claim.input, invocation);
      stopHeartbeat.abort();
      await pulse;
      if (signal.aborted || (claim.remainingMs !== null && deadline.aborted)) return;
      if (computed === null) {
        if (waiting) await store.registerWait(scope, profile, claim);
        else await commitJoin(claim);
        return;
      }
      if (computed.status === 'stopped' && computed.retryCode &&
          await store.scheduleStepRetry(scope, profile, claim, computed.retryCode)) return;
      if (computed.status === 'computed' && 'outputs' in computed) {
        await store.commitRoutingStep(scope, profile, { stepId: claim.stepId, workerId, epoch: claim.epoch, outputs: computed.outputs });
        return;
      }
      const result: StepResult = computed.status === 'computed'
        ? { kind: 'computed', packet: computed.packet } : failure(computed.terminal.code);
      await store.commitStep(scope, profile, {
        stepId: claim.stepId, workerId, epoch: claim.epoch, commitKey: claim.stepId, result,
      });
    } catch (error) { onError(error); }
    finally { stopHeartbeat.abort(); await pulse; }
  }

  const done = (async () => {
    while (!shutdown.signal.aborted) {
      try {
        if (profile.routed) await store.flushRouting(scope, profile);
        const claimStarted = performance.now();
        const claims = await store.claimSteps(scope, profile, { workerId, leaseMs, limit: concurrency });
        if (!shutdown.signal.aborted) await Promise.all(claims.map(claim => execute(claim, claimStarted)));
      } catch (error) { onError(error); }
      await pause(pollMs, shutdown.signal);
    }
  })();
  return Object.freeze({
    done,
    stop() { shutdown.abort(); return done; },
  });
}
