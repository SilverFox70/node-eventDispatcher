import type { RegistryComponent } from '../component.js';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { isProxy } from 'node:util/types';
import { FlowError } from '../errors.js';
import type { TaskPolicy } from '../model/graph/task-policy.js';
import { createDeadline } from './deadline.js';
import { taskAttempt } from './task-attempt.js';
import type { TaskContext } from './task-attempt.js';
import type { RunState } from './state.js';
import type { TaskScope } from './task-scope.js';
import type { Diagnostics } from './diagnostics/records.js';
import { createProvenance } from './diagnostics/provenance.js';
import type { TaskOptions } from './diagnostics/provenance.js';
import { diagnosticErrorCode } from './diagnostics/errors.js';
export type { TaskContext } from './task-attempt.js';
export { NodeTimeoutError } from './task-attempt.js';

function errorCode(error: unknown): unknown {
  return typeof error === 'object' && error !== null && !isProxy(error) ? Object.getOwnPropertyDescriptor(error, 'code')?.value : undefined;
}
/** One operation owner per node. Retries never overlap an unsettled attempt. */
export function createTasks(state: RunState, scope: TaskScope, nodeId: string, policy: TaskPolicy, diagnostics: Diagnostics, component: RegistryComponent) {
  let busy = false, working = false, pendingAttempt = false;
  const provenance = createProvenance();
  let failure: { error: unknown } | undefined;
  function consumeFailure(error: unknown): boolean {
    const match = failure !== undefined && Object.is(failure.error, error);
    failure = undefined; return match;
  }
  function task<T>(handler: (context: TaskContext) => T | PromiseLike<T>, options?: TaskOptions): Promise<T> {
    let inputs: ReturnType<typeof provenance.inputs>;
    try {
      scope.guard(true);
      if (!state.check()) throw new FlowError('RUN_TERMINATED');
      if (typeof handler !== 'function') throw new FlowError('INVALID_ARGUMENT');
      if (busy) throw new FlowError('TASK_ACTIVE');
      inputs = provenance.inputs(options);
    } catch (error) {
      const refused = Promise.reject<T>(error); void refused.catch(() => {}); return refused;
    }
    busy = true; working = true; failure = undefined;
    const operationId = randomUUID(), started = performance.now();
    diagnostics.record({ kind: 'operation-started', nodeId, operationId, inputs });
    let observed = false;
    function finishObservation(outcome: 'succeeded' | 'failed' | 'cancelled', error?: unknown): void {
      if (observed) return;
      observed = true;
      const base = { kind: 'operation-finished' as const, nodeId, operationId, durationMs: performance.now() - started };
      diagnostics.record(outcome === 'succeeded' ? { ...base, outcome } : { ...base, outcome, code: diagnosticErrorCode(error) });
    }
    let pending = false, ended = false;
    let cancelAttempt: (() => void) | undefined, cancelWait: (() => void) | undefined;
    const unregister = state.onEnd(() => { cancelAttempt?.(); cancelWait?.(); finishObservation('cancelled', new FlowError('RUN_TERMINATED')); });
    function wait(ms: number, settlement?: Promise<void>): Promise<boolean> {
      if (ms === 0) return Promise.resolve(false);
      return new Promise(resolve => {
        let finished = false;
        const finish = (value: boolean) => {
          if (finished) return;
          finished = true; stop(); cancelWait = undefined; resolve(value);
        };
        let stop: () => void = () => {};
        stop = createDeadline(ms, () => finish(false));
        if (finished) stop(); else cancelWait = () => finish(false);
        void settlement?.then(() => finish(true));
      });
    }
    async function execute(): Promise<T> {
      const retry = policy.retry;
      for (let attempt = 1; ; attempt++) {
        if (!state.check()) throw new FlowError('RUN_TERMINATED');
        pending = true; pendingAttempt = true;
        const current = taskAttempt(handler, state, scope, nodeId, attempt, policy.taskTimeoutMs,
          () => { pending = false; pendingAttempt = false; if (ended) busy = false; }, { diagnostics, operationId, inputs, declarations: component.decisions ?? [] });
        cancelAttempt = current.cancel;
        const outcome = await current.result;
        if (!state.check()) throw new FlowError('RUN_TERMINATED');
        if (outcome.ok) return outcome.value;
        if (!retry || attempt > retry.maxRetries || !retry.codes.includes(errorCode(outcome.error) as string)) throw outcome.error;
        if (!current.settled()) {
          const settled = await wait(retry.settleTimeoutMs ?? 0, current.settlement);
          if (!state.check()) throw new FlowError('RUN_TERMINATED');
          if (!settled) throw outcome.error;
        }
        if (!state.check()) throw new FlowError('RUN_TERMINATED');
        state.record('TASK_RETRY', nodeId);
        await wait(retry.delayMs);
      }
    }
    const result = execute().then(value => { finishObservation('succeeded'); return value; }, error => {
      finishObservation('failed', error); failure = { error }; throw error;
    }).finally(() => { ended = true; working = false; unregister(); if (!pending) busy = false; });
    void result.catch(() => {});
    return result;
  }
  function settledFailureCode(error: unknown): string | undefined {
    if (!failure || !Object.is(failure.error, error) || pendingAttempt) return;
    const code = errorCode(error);
    return typeof code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(code) ? code : undefined;
  }
  return { task, pending: () => working, delivered: provenance.delivered, consumeFailure, settledFailureCode };
}
