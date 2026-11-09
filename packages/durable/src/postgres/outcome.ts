import { randomUUID } from 'node:crypto';
import { admitPacket, FlowError } from 'event-driven-design';
import type { Pool } from 'pg';
import { checkPin, checkScope, claimBudget, interpretResult, readCommit } from '../steps/model.js';
import type { CommittedStep, DurableProfile, StepCommit, StepScope } from '../steps/model.js';
import { addReady, storePacket } from './ready.js';
import { inTransaction } from './transaction.js';

type OutcomeRow = {
  outcome_id: string; commit_key: string; fingerprint: string;
  output_packet_id: string | null; failure_code: string | null; successor_id: string | null;
};
const receipt = (row: OutcomeRow): CommittedStep => Object.freeze({
  outcomeId: row.outcome_id, outputPacketId: row.output_packet_id,
  failureCode: row.failure_code, successorId: row.successor_id,
});

export function commitStep(pool: Pool, scope: StepScope, profile: DurableProfile, command: StepCommit) {
  const { stepId, epoch, workerId, commitKey, result } = readCommit(command);
  scope = checkScope(scope, stepId);
  return inTransaction(pool, async client => {
    const { rows: [step] } = await client.query<{
      node_id: string; epoch: number; lease_owner: string | null; execution_digest: string; adapter_digest: string; envelope: string;
    }>(`SELECT s.node_id, s.epoch, s.lease_owner, r.execution_digest, r.adapter_digest, p.envelope
      FROM nodeflow_durable.steps s
      JOIN nodeflow_durable.workflow_runs r USING (run_id)
      JOIN nodeflow_durable.step_packets p ON (p.run_id, p.packet_id) = (s.run_id, s.input_packet_id)
      WHERE r.workspace_id = $1 AND s.run_id = $2 AND s.step_id = $3 FOR UPDATE OF s`,
    [scope.workspaceId, scope.runId, stepId]);
    if (!step) throw new FlowError('STEP_NOT_FOUND');
    if (step.epoch !== epoch || step.lease_owner !== workerId) throw new FlowError('STALE_CLAIM');
    const definition = checkPin(profile, step.execution_digest, step.adapter_digest);
    const input = admitPacket(JSON.parse(step.envelope));
    const outcome = interpretResult(definition, step.node_id, input, result);
    const { rows: [existing] } = await client.query<OutcomeRow>(
      'SELECT * FROM nodeflow_durable.step_outcomes WHERE step_id = $1', [stepId]);
    if (existing) {
      if (existing.commit_key !== commitKey || existing.fingerprint !== outcome.fingerprint) throw new FlowError('OUTCOME_CONFLICT');
      return receipt(existing);
    }

    const linked = await client.query('SELECT 1 FROM nodeflow_durable.external_step_operations WHERE step_id=$1', [stepId]);
    if (linked.rowCount) throw new FlowError('EXTERNAL_OPERATION_HELD');
    const successor = definition.spec.edges.find(edge => edge.from.node === step.node_id)?.to;
    let successorId = null;
    if (outcome.packet) {
      await storePacket(client, scope.runId, outcome.packet, input.packetId);
      if (successor) successorId = await addReady(client, scope.runId, successor.node, outcome.packet.packetId, claimBudget(definition, successor.node));
    }
    const { rows: [row] } = await client.query<OutcomeRow>(`
      INSERT INTO nodeflow_durable.step_outcomes
        (outcome_id, run_id, step_id, commit_key, fingerprint, output_packet_id, failure_code, successor_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (run_id, commit_key) DO NOTHING RETURNING *
    `, [randomUUID(), scope.runId, stepId, commitKey, outcome.fingerprint,
      outcome.packet?.packetId ?? null, outcome.failureCode, successorId]);
    if (!row) throw new FlowError('OUTCOME_CONFLICT');
    await client.query('INSERT INTO nodeflow_durable.notification_outbox (outcome_id) VALUES ($1)', [row.outcome_id]);
    const changed = await client.query(`UPDATE nodeflow_durable.steps SET status = $2
      WHERE step_id = $1 AND status = 'ready' AND lease_expires_at > clock_timestamp()`,
    [stepId, outcome.packet ? 'completed' : 'failed']);
    if (changed.rowCount !== 1) throw new FlowError('STALE_CLAIM');
    return receipt(row);
  });
}

/** A notification can be lost or repeated. Ready rows remain the source of truth. */
export async function publishStepWake(pool: Pool, scope: StepScope, outcomeId: string): Promise<boolean> {
  scope = checkScope(scope, outcomeId);
  const { rowCount } = await pool.query(`
    SELECT pg_notify('nodeflow_step_ready', o.outcome_id::text)
    FROM nodeflow_durable.notification_outbox n
    JOIN nodeflow_durable.step_outcomes o USING (outcome_id)
    JOIN nodeflow_durable.workflow_runs r USING (run_id)
    WHERE r.workspace_id = $1 AND o.run_id = $2 AND o.outcome_id = $3
  `, [scope.workspaceId, scope.runId, outcomeId]);
  return rowCount === 1;
}
