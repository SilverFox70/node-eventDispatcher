import { FlowError } from 'event-driven-design';
import type { Pool, PoolClient } from 'pg';
import type { ReconciliationBinding } from '../reconciliation/model.js';
import { checkScope } from '../steps/model.js';
import type { StepScope } from '../steps/model.js';

export async function readTarget(db: Pool | PoolClient, scope: StepScope, stepId: string, operationId: string, lock = false) {
  const key = [scope.workspaceId, scope.runId, stepId, operationId];
  if (lock) await db.query(`
    SELECT s.step_id FROM nodeflow_durable.steps s JOIN nodeflow_durable.workflow_runs r USING (run_id)
    WHERE r.workspace_id=$1 AND s.run_id=$2 AND s.step_id=$3 FOR UPDATE OF s`, key.slice(0, 3));
  const { rows: [row] } = await db.query<{
    provider: string; business_key: string; resource_key: string; resource_revision: number;
    fingerprint: string; policy_version: string; resolution_revision: number; state: string;
    result_json: string | null; hold_reason: string | null; next_review_at: Date | null;
    step_status: string; node_id: string; envelope: string; execution_digest: string; adapter_digest: string;
  }>(`
    SELECT o.*, s.status AS step_status, s.node_id, p.envelope, r.execution_digest, r.adapter_digest
    FROM nodeflow_durable.external_operations o
    JOIN nodeflow_durable.external_step_operations link USING (operation_id)
    JOIN nodeflow_durable.steps s USING (step_id)
    JOIN nodeflow_durable.workflow_runs r USING (run_id)
    JOIN nodeflow_durable.step_packets p ON (p.run_id,p.packet_id)=(s.run_id,s.input_packet_id)
    WHERE o.workspace_id=$1 AND r.workspace_id=$1 AND s.run_id=$2 AND s.step_id=$3 AND o.operation_id=$4
    ${lock ? 'FOR UPDATE OF o' : ''}`, key);
  if (!row) throw new FlowError('EXTERNAL_OPERATION_NOT_FOUND');
  const binding: ReconciliationBinding = Object.freeze({
    operationId, provider: row.provider, businessKey: row.business_key, resourceKey: row.resource_key,
    resourceRevision: row.resource_revision, fingerprint: row.fingerprint, policyVersion: row.policy_version,
  });
  return { binding, row };
}

export async function getReconciliationTarget(pool: Pool, scope: StepScope, stepId: string, operationId: string) {
  scope = checkScope(checkScope(scope, stepId), operationId);
  const { binding, row } = await readTarget(pool, scope, stepId, operationId);
  return Object.freeze({ binding, revision: row.resolution_revision, state: row.state,
    reason: row.hold_reason, nextReviewAt: row.next_review_at?.toISOString() ?? null });
}
