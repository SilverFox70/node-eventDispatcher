import { createHash } from 'node:crypto';
import { FlowError } from 'event-driven-design';
import type { RunStatus } from '../scheduling/policy.js';
import type { StepScope } from '../steps/model.js';
import { validIdentifier } from '../submission/input.js';

export type ProgressAuthorization = (scope: StepScope, actorId: string) => boolean | Promise<boolean>;
export type ProgressRequest = Readonly<{ actorId: string; after?: string; limit?: number }>;

export type ProgressStep = Readonly<{
  stepId: string; nodeId: string; attempts: number; maxClaims: number;
  stage: 'ready' | 'running' | 'retry-held' | 'retry-delayed' | 'routing' | 'waiting' | 'uncertain' | 'failed' | 'completed';
  failureCode: string | null;
  wait: Readonly<{ signalName: string; revision: number; state: 'waiting' | 'consumed' | 'closed' }> | null;
  operation: Readonly<{ operationId: string; revision: number; state: string }> | null;
}>;

export async function authorizeProgress(scope: StepScope, actorId: string, authorize: ProgressAuthorization) {
  if (!validIdentifier(actorId) || await authorize(Object.freeze(scope), actorId) !== true) {
    throw new FlowError('RUN_NOT_FOUND');
  }
}

export function lifecycleRevision(runId: string, status: RunStatus, terminalAt: Date | null) {
  return createHash('sha256').update(JSON.stringify([runId, status, terminalAt])).digest('hex');
}

export type RunProgress = Readonly<{
  runId: string; jobId: string; status: RunStatus; revisionId: string;
  executionDigest: string; adapterDigest: string; deadlineAt: string | null;
  notBefore: string | null; terminalAt: string | null; failureCode: string | null;
  lifecycleRevision: string; readVersion: string; nextCursor: string | null;
  steps: readonly ProgressStep[];
}>;

export type ProgressCancellation = Readonly<{ actorId: string; expectedRevision: string }>;
