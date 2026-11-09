import { FlowError } from 'event-driven-design';
import type { Pool, PoolClient } from 'pg';
import type { RunStatus } from '../scheduling/policy.js';
import { closeWaits } from '../signals/inbox.js';
import { checkScope } from '../steps/model.js';
import type { StepScope } from '../steps/model.js';
import { inTransaction } from './transaction.js';

export async function lockRun(client: PoolClient, scope: StepScope, missingCode = 'RUN_NOT_FOUND') {
  const { rows: [run] } = await client.query<{
    execution_digest: string; adapter_digest: string; timeout_ms: number | null;
    deadline_at: Date | null; not_before: Date | null; status: RunStatus; join_failure_code: string | null;
  }>(`SELECT execution_digest, adapter_digest, timeout_ms, deadline_at, not_before, status, join_failure_code
    FROM nodeflow_durable.workflow_runs WHERE workspace_id=$1 AND run_id=$2 FOR UPDATE`, [scope.workspaceId, scope.runId]);
  if (!run) throw new FlowError(missingCode);
  return run;
}

export async function remainingBudget(client: PoolClient, runId: string): Promise<number | null> {
  const { rows: [row] } = await client.query<{ remaining: number | null }>(`
    SELECT CASE WHEN deadline_at IS NOT NULL THEN
      greatest(0,floor(extract(epoch FROM (deadline_at-clock_timestamp()))*1000))::integer END AS remaining
    FROM nodeflow_durable.workflow_runs WHERE run_id=$1`, [runId]);
  return row!.remaining;
}

export async function requireActiveRun(client: PoolClient, scope: StepScope): Promise<void> {
  const run = await lockRun(client, scope);
  const remaining = await remainingBudget(client, scope.runId);
  if (run.status !== 'queued' || (remaining !== null && remaining <= 0)) throw new FlowError('RUN_TERMINATED');
}

export async function clearPartialJoins(client: PoolClient, runId: string) {
  await client.query('DELETE FROM nodeflow_durable.join_groups WHERE run_id=$1', [runId]);
}

export async function holdRun(client: PoolClient, runId: string, status: 'timed-out' | 'cancelled'): Promise<void> {
  await client.query(`UPDATE nodeflow_durable.workflow_runs SET status=$2, terminal_at=clock_timestamp()
    WHERE run_id=$1 AND status='queued'`, [runId, status]);
  await clearPartialJoins(client, runId);
  await closeWaits(client, runId);
  await client.query(`UPDATE nodeflow_durable.external_operations o
    SET state='uncertain', resolution_revision=resolution_revision+1
    FROM nodeflow_durable.steps s
    WHERE o.intent_step_id=s.step_id AND s.run_id=$1 AND o.state='invocation-intent'`, [runId]);
}

export async function finishRunIfDone(client: PoolClient, runId: string): Promise<void> {
  const { rowCount } = await client.query(`UPDATE nodeflow_durable.workflow_runs r SET terminal_at=clock_timestamp(),
    join_failure_code=CASE WHEN EXISTS (SELECT 1 FROM nodeflow_durable.join_groups WHERE run_id=$1) THEN 'JOIN_INCOMPLETE' END,
    status=CASE WHEN EXISTS (SELECT 1 FROM nodeflow_durable.steps WHERE run_id=$1 AND status='failed')
      OR EXISTS (SELECT 1 FROM nodeflow_durable.join_groups WHERE run_id=$1) THEN 'failed' ELSE 'completed' END
    WHERE r.run_id=$1 AND r.status='queued' AND r.steps_initialized
      AND NOT EXISTS (SELECT 1 FROM nodeflow_durable.waits WHERE run_id=$1 AND state='waiting')
      AND NOT EXISTS (SELECT 1 FROM nodeflow_durable.steps WHERE run_id=$1 AND status IN ('ready','routing'))`, [runId]);
  if (rowCount) await clearPartialJoins(client, runId);
}

export function runTiming(pool: Pool, scope: StepScope, cancel = false) {
  scope = checkScope(scope);
  return inTransaction(pool, async client => {
    const run = await lockRun(client, scope);
    const remaining = await remainingBudget(client, scope.runId);
    let status = run.status;
    if (status === 'queued') {
      if (remaining !== null && remaining <= 0) status = 'timed-out';
      else if (cancel) status = 'cancelled';
      if (status !== 'queued') await holdRun(client, scope.runId, status);
    }
    return Object.freeze({ status, deadlineAt: run.deadline_at?.toISOString() ?? null,
      notBefore: run.not_before?.toISOString() ?? null,
      ...(run.join_failure_code && { failureCode: run.join_failure_code }) });
  });
}
