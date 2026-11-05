import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { FlowError } from '../errors.js';
import { createDeadline } from './deadline.js';
import type { RunState } from './state.js';
import type { TaskScope } from './task-scope.js';
import { diagnosticErrorCode } from './diagnostics/errors.js';
import type { Diagnostics } from './diagnostics/records.js';
import type { PacketMetadata } from '../packet.js';
import type { DecisionDeclaration, DecisionRequest } from '../model/diagnostics/decisions.js';
export type AttemptObservation = Readonly<{ diagnostics: Diagnostics; operationId: string; inputs: readonly PacketMetadata[]; declarations: readonly DecisionDeclaration[] }>;
export type TaskContext = Readonly<{ signal: AbortSignal; attempt: number; attemptId: string; recordDecision(value: DecisionRequest): boolean }>;
export type TaskOutcome<T> = { ok: true; value: T } | { ok: false; error: unknown };
export class NodeTimeoutError extends FlowError {
  constructor(readonly nodeId: string, readonly timeoutMs: number) { super('NODE_TIMEOUT'); }
}

/** One attempt: terminal/revoked leases never regain the ability to publish work. */
export function taskAttempt<T>(handler: (context: TaskContext) => T | PromiseLike<T>, state: RunState,
  scope: TaskScope, nodeId: string, attempt: number, timeoutMs: number | undefined, onSettled: () => void, observation: AttemptObservation) {
  const started = performance.now(), attemptId = randomUUID();
  observation.diagnostics.record({ kind: 'attempt-started', nodeId, operationId: observation.operationId, attemptId, attempt, inputs: observation.inputs });
  const controller = new globalThis.AbortController(), lease = { active: true };
  const context: TaskContext = Object.freeze({ signal: controller.signal, attempt, attemptId, recordDecision: (value: DecisionRequest) => recordDecision(value) });
  const recordDecision = observation.diagnostics.decisions.bind(context, { nodeId, operationId: observation.operationId, attemptId, attempt, inputs: observation.inputs },
    observation.declarations, () => scope.owns(lease) && (timeoutMs === undefined || performance.now() - started < timeoutMs));
  let settled = false, finished = false;
  let stopTimer: (() => void) | undefined;
  let resolve!: (outcome: TaskOutcome<T>) => void;
  let settle!: () => void;
  const result = new Promise<TaskOutcome<T>>(done => { resolve = done; });
  const settlement = new Promise<void>(done => { settle = done; });
  function finish(outcome: TaskOutcome<T>): void {
    if (finished) return;
    finished = true; lease.active = false; stopTimer?.();
    const base = { kind: 'attempt-finished' as const, nodeId, operationId: observation.operationId, attemptId, attempt, durationMs: performance.now() - started };
    if (outcome.ok) observation.diagnostics.record({ ...base, outcome: 'succeeded' });
    else {
      const code = diagnosticErrorCode(outcome.error);
      observation.diagnostics.record({ ...base, outcome: code === 'NODE_TIMEOUT' ? 'timed-out' : code === 'RUN_TERMINATED' ? 'cancelled' : 'failed', code });
    }
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
    return handler(context);
  })).then(value => complete({ ok: true, value }), error => complete({ ok: false, error }));
  return { result, settlement, cancel, settled: () => settled };
}
