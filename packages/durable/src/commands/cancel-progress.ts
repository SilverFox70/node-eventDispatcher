import { FlowError } from 'event-driven-design';
import type { Pool } from 'pg';
import { holdRun, lockRun, remainingBudget } from '../postgres/run-timing.js';
import { inTransaction } from '../postgres/transaction.js';
import { authorizeProgress, lifecycleRevision } from '../query/progress-model.js';
import type { ProgressAuthorization, ProgressCancellation } from '../query/progress-model.js';
import { checkScope } from '../steps/model.js';
import type { StepScope } from '../steps/model.js';

export async function cancelProgress(pool: Pool, scope: StepScope, input: ProgressCancellation,
  authorize: ProgressAuthorization) {
  scope = checkScope(scope);
  const { actorId, expectedRevision } = input;
  await authorizeProgress(scope, actorId, authorize);
  return inTransaction(pool, async client => {
    const run = await lockRun(client, scope);
    if (run.status !== 'queued' || lifecycleRevision(scope.runId, run.status, run.terminal_at) !== expectedRevision ||
      await remainingBudget(client, scope.runId) === 0) throw new FlowError('PROGRESS_CONFLICT');
    await holdRun(client, scope.runId, 'cancelled');
    return { status: 'cancelled' as const };
  });
}
