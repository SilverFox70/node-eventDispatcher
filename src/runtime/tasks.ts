import { isProxy } from 'node:util/types';
import { FlowError } from '../errors.js';
import type { TaskPolicy } from '../model/graph/task-policy.js';
import { createDeadline } from './deadline.js';
import { taskAttempt } from './task-attempt.js';
import type { TaskContext } from './task-attempt.js';
import type { RunState } from './state.js';
import type { TaskScope } from './task-scope.js';
export type { TaskContext } from './task-attempt.js';
export { NodeTimeoutError } from './task-attempt.js';

function errorCode(error: unknown): unknown {
  return typeof error === 'object' && error !== null && !isProxy(error) ? Object.getOwnPropertyDescriptor(error, 'code')?.value : undefined;
}
/** One operation owner per node. Retries never overlap an unsettled attempt. */
export function createTasks(state: RunState, scope: TaskScope, nodeId: string, policy: TaskPolicy) {
  let busy = false, working = false;
  function task<T>(handler: (context: TaskContext) => T | PromiseLike<T>): Promise<T> {
    try {
      scope.guard(true);
      if (!state.check()) throw new FlowError('RUN_TERMINATED');
      if (typeof handler !== 'function') throw new FlowError('INVALID_ARGUMENT');
      if (busy) throw new FlowError('TASK_ACTIVE');
    } catch (error) {
      const refused = Promise.reject<T>(error); void refused.catch(() => {}); return refused;
    }
    busy = true; working = true;
    let pending = false, ended = false;
    let cancelAttempt: (() => void) | undefined, cancelWait: (() => void) | undefined;
    const unregister = state.onEnd(() => { cancelAttempt?.(); cancelWait?.(); });
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
        pending = true;
        const current = taskAttempt(handler, state, scope, nodeId, attempt, policy.taskTimeoutMs,
          () => { pending = false; if (ended) busy = false; });
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
    const result = execute().finally(() => { ended = true; working = false; unregister(); if (!pending) busy = false; });
    void result.catch(() => {});
    return result;
  }
  return { task, pending: () => working };
}
