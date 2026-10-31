import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { FlowError } from '../errors.js';
import { createDeadline } from './deadline.js';
import type { RunState } from './state.js';
import type { TaskScope } from './task-scope.js';
export type TaskContext = Readonly<{ signal: AbortSignal; attempt: number; attemptId: string }>;
export type TaskOutcome<T> = { ok: true; value: T } | { ok: false; error: unknown };
export class NodeTimeoutError extends FlowError {
  constructor(readonly nodeId: string, readonly timeoutMs: number) { super('NODE_TIMEOUT'); }
}

/** One attempt: terminal/revoked leases never regain the ability to publish work. */
export function taskAttempt<T>(handler: (context: TaskContext) => T | PromiseLike<T>, state: RunState,
  scope: TaskScope, nodeId: string, attempt: number, timeoutMs: number | undefined, onSettled: () => void) {
  const started = performance.now();
  const controller = new globalThis.AbortController(), lease = { active: true };
  let settled = false, finished = false;
  let stopTimer: (() => void) | undefined;
  let resolve!: (outcome: TaskOutcome<T>) => void;
  let settle!: () => void;
  const result = new Promise<TaskOutcome<T>>(done => { resolve = done; });
  const settlement = new Promise<void>(done => { settle = done; });
  function finish(outcome: TaskOutcome<T>): void {
    if (finished) return;
    finished = true; lease.active = false; stopTimer?.();
    scope.run(lease, () => controller.abort());
    resolve(outcome);
  }
  const cancel = () => finish({ ok: false, error: new FlowError('RUN_TERMINATED') });
  function expire(): void {
    if (state.check()) { state.record('NODE_TIMEOUT', nodeId); finish({ ok: false, error: new NodeTimeoutError(nodeId, timeoutMs!) }); }
    else cancel();
  }
  if (timeoutMs !== undefined) stopTimer = createDeadline(timeoutMs, expire);
  function complete(outcome: TaskOutcome<T>): void {
    settled = true; settle(); onSettled();
    if (finished) return;
    if (!state.check()) cancel();
    else if (timeoutMs !== undefined && performance.now() - started >= timeoutMs) expire();
    else finish(outcome);
  }
  void scope.run(lease, () => Promise.resolve().then(() => {
    if (!lease.active || !state.check()) throw new FlowError('RUN_TERMINATED');
    return handler(Object.freeze({ signal: controller.signal, attempt, attemptId: randomUUID() }));
  })).then(value => complete({ ok: true, value }), error => complete({ ok: false, error }));
  return { result, settlement, cancel, settled: () => settled };
}
