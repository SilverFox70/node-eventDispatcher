import { createHash } from 'node:crypto';
import { FlowError } from 'event-driven-design';
import type { Pool, PoolClient } from 'pg';
import { inTransaction } from '../postgres/transaction.js';
import type { RunStatus } from '../scheduling/policy.js';
import { checkScope } from '../steps/model.js';
import type { StepScope } from '../steps/model.js';
import { readProgressPage, stepCursor } from './page-cursor.js';
import { authorizeProgress, lifecycleRevision } from './progress-model.js';
import type { ProgressAuthorization, ProgressRequest, ProgressStep, RunProgress } from './progress-model.js';

type RunRow = {
  status: RunStatus; job_id: string; revision_id: string; execution_digest: string; adapter_digest: string;
  deadline_at: Date | null; not_before: Date | null; terminal_at: Date | null; join_failure_code: string | null;
};
type StepRow = {
  step_id: string; node_id: string; cursor_time: string; epoch: number; max_claims: number;
  stage: ProgressStep['stage']; failure_code: string | null;
  wait: ProgressStep['wait']; operation: ProgressStep['operation'];
};

function readSteps(client: PoolClient, runId: string, page: ReturnType<typeof readProgressPage>) {
  return client.query<StepRow>(`SELECT s.step_id,s.node_id,s.epoch,s.max_claims,
    to_char(s.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_time,
    CASE WHEN w.state='waiting' THEN 'waiting'
      WHEN o.state IN ('uncertain','invocation-intent') AND (o.state='uncertain' OR s.lease_expires_at<=transaction_timestamp()) THEN 'uncertain'
      WHEN s.status<>'ready' THEN s.status
      WHEN s.lease_expires_at>transaction_timestamp() THEN 'running'
      WHEN s.epoch>=s.max_claims THEN 'retry-held'
      WHEN s.not_before>transaction_timestamp() THEN 'retry-delayed'
      ELSE 'ready' END AS stage,
    so.failure_code,
    CASE WHEN w.generation IS NOT NULL THEN json_build_object('signalName',w.signal_name,'revision',w.revision,'state',w.state) END AS wait,
    CASE WHEN o.operation_id IS NOT NULL THEN json_build_object('operationId',o.operation_id,'revision',o.resolution_revision,'state',o.state) END AS operation
    FROM nodeflow_durable.steps s
    LEFT JOIN nodeflow_durable.waits w ON (w.run_id,w.generation)=(s.run_id,s.step_id)
    LEFT JOIN nodeflow_durable.step_outcomes so USING (step_id)
    LEFT JOIN nodeflow_durable.external_step_operations link USING (step_id)
    LEFT JOIN nodeflow_durable.external_operations o USING (operation_id)
    WHERE s.run_id=$1 AND ($2::timestamptz IS NULL OR (s.created_at,s.step_id)>($2,$3::uuid))
    ORDER BY s.created_at,s.step_id LIMIT $4`, [runId, page.time, page.stepId, page.limit + 1]);
}

export async function queryRun(pool: Pool, scope: StepScope, request: ProgressRequest, authorize: ProgressAuthorization): Promise<RunProgress> {
  scope = checkScope(scope);
  await authorizeProgress(scope, request.actorId, authorize);
  return inTransaction(pool, async client => {
    const { rows: [run] } = await client.query<RunRow>(`SELECT status,job_id,revision_id,execution_digest,adapter_digest,
      deadline_at,not_before,terminal_at,join_failure_code FROM nodeflow_durable.workflow_runs
      WHERE workspace_id=$1 AND run_id=$2`, [scope.workspaceId, scope.runId]);
    if (!run) throw new FlowError('RUN_NOT_FOUND');
    const page = readProgressPage(scope, request.after, request.limit);
    const { rows } = await readSteps(client, scope.runId, page);
    const steps: ProgressStep[] = rows.slice(0, page.limit).map(row => ({
      stepId: row.step_id, nodeId: row.node_id, attempts: row.epoch, maxClaims: row.max_claims,
      stage: row.stage, failureCode: row.failure_code, wait: row.wait, operation: row.operation,
    }));
    const last = rows[page.limit - 1];
    const snapshot = {
      runId: scope.runId, jobId: run.job_id, status: run.status, revisionId: run.revision_id,
      executionDigest: run.execution_digest, adapterDigest: run.adapter_digest,
      deadlineAt: run.deadline_at?.toISOString() ?? null, notBefore: run.not_before?.toISOString() ?? null,
      terminalAt: run.terminal_at?.toISOString() ?? null, failureCode: run.join_failure_code,
      lifecycleRevision: lifecycleRevision(scope.runId, run.status, run.terminal_at),
      steps, nextCursor: rows.length > page.limit ? stepCursor(scope.runId, last!.cursor_time, last!.step_id) : null,
    };
    return { ...snapshot, readVersion: createHash('sha256').update(JSON.stringify(snapshot)).digest('hex') };
  }, 'repeatable-read-only');
}
