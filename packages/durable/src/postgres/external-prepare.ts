import { randomUUID } from 'node:crypto';
import { FlowError } from 'event-driven-design';
import type { Pool, PoolClient } from 'pg';
import { readOperation } from '../operations/model.js';
import type { ExternalOperation, ExternalOperationRequest } from '../operations/model.js';
import { checkScope } from '../steps/model.js';
import type { ClaimIdentity, StepScope } from '../steps/model.js';
import { inTransaction } from './transaction.js';

type OperationRow = { operation_id: string; fingerprint: string; state: ExternalOperation['state'] };

export async function requireLiveClaim(client: PoolClient, scope: StepScope, claim: ClaimIdentity) {
  const { rows } = await client.query(`
    SELECT s.step_id FROM nodeflow_durable.steps s JOIN nodeflow_durable.workflow_runs r USING (run_id)
    WHERE r.workspace_id = $1 AND s.run_id = $2 AND s.step_id = $3 AND s.epoch = $4 AND s.lease_owner = $5
      AND s.status = 'ready' AND s.lease_expires_at > clock_timestamp() FOR UPDATE OF s
  `, [scope.workspaceId, scope.runId, claim.stepId, claim.epoch, claim.workerId]);
  if (!rows.length) throw new FlowError('STALE_CLAIM');
}

export function lockResource(client: PoolClient, workspaceId: string, provider: string, resource: string) {
  return client.query(`SELECT resource_key FROM nodeflow_durable.external_resources
    WHERE workspace_id = $1 AND provider = $2 AND resource_key = $3 FOR UPDATE`, [workspaceId, provider, resource]);
}

export async function prepareExternalOperation(pool: Pool, scope: StepScope, claim: ClaimIdentity,
  input: ExternalOperationRequest): Promise<ExternalOperation> {
  claim = { ...claim };
  scope = checkScope(scope, claim.stepId);
  const { request, fingerprint } = readOperation(input);
  const { provider, businessKey, resourceKey, revision, policyVersion } = request;
  return inTransaction(pool, async client => {
    await requireLiveClaim(client, scope, claim);
    await client.query(`INSERT INTO nodeflow_durable.external_resources VALUES ($1,$2,$3)
      ON CONFLICT DO NOTHING`, [scope.workspaceId, provider, resourceKey]);
    await lockResource(client, scope.workspaceId, provider, resourceKey);
    const key = [scope.workspaceId, provider, businessKey];
    const { rows: [existing] } = await client.query<OperationRow>(
      'SELECT operation_id, fingerprint, state FROM nodeflow_durable.external_operations WHERE workspace_id=$1 AND provider=$2 AND business_key=$3', key);
    const operation = existing ?? (await client.query<OperationRow>(`
      INSERT INTO nodeflow_durable.external_operations
        (operation_id, workspace_id, provider, business_key, resource_key, resource_revision, policy_version, fingerprint)
      SELECT $4,$1,$2,$3,$5,$6,$7,$8 WHERE NOT EXISTS (
        SELECT 1 FROM nodeflow_durable.external_operations WHERE workspace_id=$1 AND provider=$2
          AND resource_key=$5 AND resource_revision >= $6)
      ON CONFLICT DO NOTHING RETURNING operation_id, fingerprint, state
    `, [...key, randomUUID(), resourceKey, revision, policyVersion, fingerprint])).rows[0];
    if (!operation || operation.fingerprint !== fingerprint) throw new FlowError('INPUT_CONFLICT');
    const { rowCount } = await client.query(`
      INSERT INTO nodeflow_durable.external_step_operations VALUES ($1,$2)
      ON CONFLICT (step_id) DO UPDATE SET operation_id = EXCLUDED.operation_id
      WHERE external_step_operations.operation_id = EXCLUDED.operation_id
    `, [claim.stepId, operation.operation_id]);
    if (rowCount !== 1) throw new FlowError('INPUT_CONFLICT');
    return { operationId: operation.operation_id, state: operation.state };
  });
}
