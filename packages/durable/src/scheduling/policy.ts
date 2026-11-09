import { FlowError } from 'event-driven-design';
import { profileDefinition } from '../profile/definition.js';
import type { DurableProfile } from '../steps/model.js';

export type RunTiming = Readonly<{ timeoutMs: number; notBeforeMs?: number }>;
export type RunStatus = 'queued' | 'completed' | 'failed' | 'cancelled' | 'timed-out';

export function readTiming(timing: RunTiming): RunTiming {
  const { timeoutMs, notBeforeMs = 0 } = timing;
  if (Object.keys(timing).some(key => key !== 'timeoutMs' && key !== 'notBeforeMs') ||
      !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647 ||
      !Number.isInteger(notBeforeMs) || notBeforeMs < 0 || notBeforeMs >= timeoutMs) {
    throw new FlowError('INVALID_TIMEOUT_POLICY');
  }
  return { timeoutMs, notBeforeMs };
}

export function validateRunBudget(profile: DurableProfile, budget: number) {
  for (const node of profileDefinition(profile).spec.nodes) {
    if ((node.taskTimeoutMs ?? 0) > budget || (node.retry?.delayMs ?? 0) >= budget ||
        (node.retry?.settleTimeoutMs ?? 0) > budget) throw new FlowError('INVALID_TIMEOUT_POLICY');
  }
}
