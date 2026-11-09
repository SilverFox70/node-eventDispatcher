import { requireActiveRun } from './run-timing.js';
import { FlowError } from 'event-driven-design';
import type { Json } from 'event-driven-design';
import type { Pool } from 'pg';
import { readOperation } from '../operations/model.js';
import type { ExternalOperation, ExternalOperationRequest } from '../operations/model.js';
import { checkScope, serialize } from '../steps/model.js';
import type { ClaimIdentity, StepScope } from '../steps/model.js';
import { lockResource, requireLiveClaim } from './external-prepare.js';
import { inTransaction } from './transaction.js';

function requireTransition(rowCount: number | null): void {
  if (rowCount !== 1) throw new FlowError('EXTERNAL_OPERATION_HELD');
}

export async function invokeExternalOperation(pool: Pool, scope: StepScope, claim: ClaimIdentity,
  operationId: string, input: ExternalOperationRequest, send: (payload: Json) => Promise<Json>): Promise<ExternalOperation> {
  claim = { ...claim };
  scope = checkScope(checkScope(scope, claim.stepId), operationId);
  const { request, fingerprint } = readOperation(input);
  await inTransaction(pool, async client => {
    await requireActiveRun(client, scope);
    await requireLiveClaim(client, scope, claim);
    await lockResource(client, scope.workspaceId, request.provider, request.resourceKey);
    const { rowCount } = await client.query(`
      UPDATE nodeflow_durable.external_operations o SET state='invocation-intent', resolution_revision=resolution_revision+1,
        intent_step_id=$2, intent_epoch=$3, intent_worker=$4, intent_at=clock_timestamp()
      FROM nodeflow_durable.external_step_operations link
      WHERE o.operation_id=$1 AND link.step_id=$2 AND link.operation_id=o.operation_id
        AND o.fingerprint=$5 AND o.state='prepared'
        AND NOT EXISTS (SELECT 1 FROM nodeflow_durable.external_operations earlier
          WHERE earlier.workspace_id=o.workspace_id AND earlier.provider=o.provider
            AND earlier.resource_key=o.resource_key AND earlier.resource_revision < o.resource_revision
            AND earlier.state <> 'succeeded')
        AND EXISTS (SELECT 1 FROM nodeflow_durable.steps s WHERE s.step_id=$2
          AND s.lease_expires_at > clock_timestamp())
    `, [operationId, claim.stepId, claim.epoch, claim.workerId, fingerprint]);
    requireTransition(rowCount);
    await requireActiveRun(client, scope);
  });

  let result: string;
  try { result = serialize(await send(request.payload)); }
  catch {
    await pool.query(`UPDATE nodeflow_durable.external_operations SET state='uncertain', resolution_revision=resolution_revision+1
      WHERE operation_id=$1 AND state='invocation-intent'`, [operationId]);
    return { operationId, state: 'uncertain' };
  }
  await inTransaction(pool, async client => {
    await requireActiveRun(client, scope);
    await requireLiveClaim(client, scope, claim);
    const { rowCount } = await client.query(`UPDATE nodeflow_durable.external_operations SET state='succeeded', result_json=$2, resolution_revision=resolution_revision+1
      WHERE operation_id=$1 AND state='invocation-intent' AND intent_step_id=$3 AND intent_epoch=$4 AND intent_worker=$5
        AND EXISTS (SELECT 1 FROM nodeflow_durable.steps s WHERE s.step_id=$3
          AND s.lease_expires_at > clock_timestamp())`,
    [operationId, result, claim.stepId, claim.epoch, claim.workerId]);
    requireTransition(rowCount);
    await requireActiveRun(client, scope);
  });
  return { operationId, state: 'succeeded' };
}

export async function recoverExternalOperation(pool: Pool, scope: StepScope, operationId: string): Promise<ExternalOperation> {
  scope = checkScope(scope, operationId);
  const { rows: [row] } = await pool.query<{ state: ExternalOperation['state'] }>(`
    WITH visible AS (
      SELECT o.operation_id, o.state FROM nodeflow_durable.external_operations o
      WHERE o.operation_id=$1 AND o.workspace_id=$2 AND EXISTS (
        SELECT 1 FROM nodeflow_durable.external_step_operations link JOIN nodeflow_durable.steps s USING (step_id)
        WHERE link.operation_id=o.operation_id AND s.run_id=$3)
    ), expired AS (
      UPDATE nodeflow_durable.external_operations o SET state='uncertain', resolution_revision=o.resolution_revision+1
      FROM visible v, nodeflow_durable.steps s, nodeflow_durable.workflow_runs r
      WHERE r.run_id=s.run_id AND o.operation_id=v.operation_id AND s.step_id=o.intent_step_id AND o.state='invocation-intent'
        AND (s.lease_expires_at <= clock_timestamp() OR s.epoch <> o.intent_epoch OR s.lease_owner <> o.intent_worker
          OR r.status <> 'queued' OR r.deadline_at <= clock_timestamp())
      RETURNING o.state
    )
    SELECT state FROM expired UNION ALL SELECT state FROM visible WHERE NOT EXISTS (SELECT 1 FROM expired)
  `, [operationId, scope.workspaceId, scope.runId]);
  if (!row) throw new FlowError('EXTERNAL_OPERATION_NOT_FOUND');
  return { operationId, state: row.state };
}
