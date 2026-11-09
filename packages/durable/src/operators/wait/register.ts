import { FlowError } from 'event-driven-design';
import type { Pool } from 'pg';
import { finishRunIfDone, lockRun, requireActiveRun } from '../../postgres/run-timing.js';
import { inTransaction } from '../../postgres/transaction.js';
import { expireGeneration } from '../../signals/inbox.js';
import { checkPin, checkScope } from '../../steps/model.js';
import type { ClaimIdentity, DurableProfile, StepScope } from '../../steps/model.js';
import { consumeWait } from './consume.js';

export function registerWait(pool: Pool, scope: StepScope, profile: DurableProfile, claim: ClaimIdentity) {
  const { stepId, workerId, epoch } = claim;
  scope = checkScope(scope, stepId);
  return inTransaction(pool, async client => {
    const run = await lockRun(client, scope);
    const definition = checkPin(profile, run.execution_digest, run.adapter_digest);
    await requireActiveRun(client, scope);
    const { rows: [step] } = await client.query<{ node_id: string; input_packet_id: string }>(`
      UPDATE nodeflow_durable.steps SET status='completed',lease_owner=NULL,lease_expires_at=NULL
      WHERE run_id=$1 AND step_id=$2 AND lease_owner=$3 AND epoch=$4
        AND status='ready' AND lease_expires_at>clock_timestamp()
      RETURNING node_id,input_packet_id`, [scope.runId, stepId, workerId, epoch]);
    if (!step) throw new FlowError('STALE_CLAIM');
    const name = definition.waits.get(step.node_id);
    if (!name) throw new FlowError('INVALID_DELIVERY');
    await client.query(`INSERT INTO nodeflow_durable.waits (run_id,generation,trigger_packet_id,node_id,signal_name)
      VALUES ($1,$2,$3,$4,$5)`, [scope.runId, stepId, step.input_packet_id, step.node_id, name]);
    await expireGeneration(client, scope.runId, stepId);
    await consumeWait(client, scope.runId, definition, stepId);
    await requireActiveRun(client, scope);
    await finishRunIfDone(client, scope.runId);
  });
}
