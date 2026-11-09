import { holdRun, lockRun, remainingBudget } from './run-timing.js';
import { validateRunBudget } from '../scheduling/policy.js';
import { admitPacket, FlowError } from 'event-driven-design';
import type { Pool } from 'pg';
import { validIdentifier } from '../submission/input.js';
import { checkPin, checkScope } from '../steps/model.js';
import type { ClaimIdentity, ClaimOptions, DurableProfile, StepScope } from '../steps/model.js';
import { inTransaction } from './transaction.js';

function validateLease(workerId: string, leaseMs: number): void {
  if (!validIdentifier(workerId) || !Number.isSafeInteger(leaseMs) || leaseMs < 1 || leaseMs > 300000) {
    throw new FlowError('INVALID_LEASE');
  }
}

export function claimSteps(pool: Pool, scope: StepScope, profile: DurableProfile, options: ClaimOptions) {
  scope = checkScope(scope);
  const { workerId, leaseMs, limit } = options;
  validateLease(workerId, leaseMs);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new FlowError('INVALID_CLAIM_LIMIT');
  return inTransaction(pool, async client => {
    const run = await lockRun(client, scope);
    if (run.status !== 'queued') return [];
    const remaining = await remainingBudget(client, scope.runId);
    if (remaining !== null && remaining <= 0) {
      await holdRun(client, scope.runId, 'timed-out');
      return [];
    }
    checkPin(profile, run.execution_digest, run.adapter_digest);
    if (run.timeout_ms !== null) validateRunBudget(profile, run.timeout_ms);
    const { rows } = await client.query<{
      step_id: string; node_id: string; epoch: number; lease_expires_at: Date; envelope: string;
    }>(`WITH due AS (
      SELECT s.step_id FROM nodeflow_durable.steps s
      WHERE run_id = $1 AND status = 'ready'
        AND EXISTS (SELECT 1 FROM nodeflow_durable.workflow_runs r WHERE r.run_id=$1
          AND (r.not_before IS NULL OR r.not_before <= clock_timestamp())
          AND (r.deadline_at IS NULL OR r.deadline_at > clock_timestamp())) AND not_before <= clock_timestamp() AND epoch < max_claims
        AND CASE WHEN $5::boolean THEN EXISTS (
        SELECT 1 FROM nodeflow_durable.external_step_operations link
        JOIN nodeflow_durable.external_operations operation USING (operation_id)
        WHERE link.step_id = s.step_id AND operation.state = 'prepared')
      ELSE NOT EXISTS (SELECT 1 FROM nodeflow_durable.external_step_operations link WHERE link.step_id = s.step_id) END
      AND (lease_expires_at IS NULL OR lease_expires_at <= clock_timestamp())
      ORDER BY created_at, step_id LIMIT $2 FOR UPDATE SKIP LOCKED
    ), claimed AS (
      UPDATE nodeflow_durable.steps s SET epoch = s.epoch + 1, lease_owner = $3,
        lease_expires_at = clock_timestamp() + $4::integer * interval '1 millisecond'
      FROM due WHERE s.step_id = due.step_id RETURNING s.*
    )
    SELECT c.step_id, c.node_id, c.epoch, c.lease_expires_at, p.envelope FROM claimed c
      JOIN nodeflow_durable.step_packets p ON (p.run_id, p.packet_id) = (c.run_id, c.input_packet_id)
      ORDER BY c.created_at, c.step_id`, [scope.runId, limit, workerId, leaseMs, options.external === true]);
    return rows.map(row => Object.freeze({
      stepId: row.step_id, nodeId: row.node_id, epoch: row.epoch, workerId,
      leaseExpiresAt: row.lease_expires_at.toISOString(), remainingMs: remaining, input: admitPacket(JSON.parse(row.envelope)),
    }));
  });
}

export async function heartbeatStep(pool: Pool, scope: StepScope, claim: ClaimIdentity, leaseMs: number): Promise<string> {
  const { stepId, workerId, epoch } = claim;
  scope = checkScope(scope, stepId);
  validateLease(workerId, leaseMs);
  if (!Number.isInteger(epoch) || epoch < 1 || epoch > 2147483647) throw new FlowError('INVALID_LEASE');
  const { rows: [row] } = await pool.query<{ lease_expires_at: Date }>(`
    UPDATE nodeflow_durable.steps s SET
      lease_expires_at = GREATEST(s.lease_expires_at, clock_timestamp() + $6::integer * interval '1 millisecond')
    FROM nodeflow_durable.workflow_runs r
    WHERE r.run_id = s.run_id AND r.workspace_id = $1 AND s.run_id = $2 AND s.step_id = $3
      AND s.lease_owner = $4 AND s.epoch = $5 AND s.status = 'ready'
      AND s.lease_expires_at > clock_timestamp() AND r.status='queued'
      AND (r.deadline_at IS NULL OR r.deadline_at > clock_timestamp())
    RETURNING s.lease_expires_at`, [scope.workspaceId, scope.runId, stepId, workerId, epoch, leaseMs]);
  if (!row) throw new FlowError('STALE_CLAIM');
  return row.lease_expires_at.toISOString();
}
