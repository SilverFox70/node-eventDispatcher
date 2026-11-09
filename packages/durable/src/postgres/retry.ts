import { FlowError } from 'event-driven-design';
import type { Pool } from 'pg';
import { checkPin, checkScope } from '../steps/model.js';
import type { ClaimIdentity, DurableProfile, StepScope } from '../steps/model.js';
import { lockRun, remainingBudget } from './run-timing.js';
import { inTransaction } from './transaction.js';

export function scheduleStepRetry(pool: Pool, scope: StepScope, profile: DurableProfile, claim: ClaimIdentity, code: string) {
  scope = checkScope(scope, claim.stepId);
  const { stepId, workerId, epoch } = claim;
  return inTransaction(pool, async client => {
    const run = await lockRun(client, scope);
    if (run.status !== 'queued') return false;
    const { spec } = checkPin(profile, run.execution_digest, run.adapter_digest);
    const { rows: [step] } = await client.query<{ node_id: string }>(`
      SELECT s.node_id FROM nodeflow_durable.steps s
      WHERE s.run_id=$1 AND s.step_id=$2 AND s.lease_owner=$3 AND s.epoch=$4
        AND s.status='ready' AND s.lease_expires_at > clock_timestamp()
        AND NOT EXISTS (SELECT 1 FROM nodeflow_durable.external_step_operations e WHERE e.step_id=s.step_id)
      FOR UPDATE OF s`, [scope.runId, stepId, workerId, epoch]);
    if (!step) throw new FlowError('STALE_CLAIM');
    const retry = spec.nodes.find(node => node.id === step.node_id)?.retry;
    if (!retry || !retry.codes.includes(code)) return false;
    const remaining = await remainingBudget(client, scope.runId);
    if (remaining !== null && remaining <= retry.delayMs) return false;
    const { rowCount } = await client.query(`
      UPDATE nodeflow_durable.steps SET lease_owner=NULL, lease_expires_at=NULL,
        not_before=clock_timestamp()+$2::bigint*interval '1 millisecond'
      WHERE step_id=$1 AND epoch < max_claims AND lease_expires_at > clock_timestamp()`, [stepId, retry.delayMs]);
    return rowCount === 1;
  });
}
