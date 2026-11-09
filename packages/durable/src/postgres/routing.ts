import { createHash } from 'node:crypto';
import { admitPacket, FlowError } from 'event-driven-design';
import type { Pool } from 'pg';
import type { RoutingCommand, RoutingStatus } from '../delivery/model.js';
import { validateOutputs } from '../delivery/model.js';
import { checkPin, checkScope, serialize } from '../steps/model.js';
import type { DurableProfile, StepScope } from '../steps/model.js';
import { materializeRoute } from './routing-materialize.js';
import type { PendingRoute } from './routing-materialize.js';
import { finishRunIfDone, lockRun, remainingBudget, requireActiveRun } from './run-timing.js';
import { inTransaction } from './transaction.js';

export async function commitRoutingStep(pool: Pool, scope: StepScope, profile: DurableProfile,
  input: RoutingCommand): Promise<RoutingStatus> {
  const command = JSON.parse(serialize(input)) as RoutingCommand;
  const { stepId, workerId, epoch } = command;
  scope = checkScope(scope, stepId);
  if (Object.keys(command).length !== 4 || !profile.routed) throw new FlowError('INVALID_DELIVERY');
  const fingerprint = createHash('sha256').update(serialize(command.outputs)).digest('hex');
  return inTransaction(pool, async client => {
    const run = await lockRun(client, scope);
    const definition = checkPin(profile, run.execution_digest, run.adapter_digest);
    const { rows: [step] } = await client.query<{
      node_id: string; input_packet_id: string; envelope: string; epoch: number; lease_owner: string;
    }>(`SELECT s.node_id,s.input_packet_id,s.epoch,s.lease_owner,p.envelope FROM nodeflow_durable.steps s
      JOIN nodeflow_durable.step_packets p ON (p.run_id,p.packet_id)=(s.run_id,s.input_packet_id)
      WHERE s.run_id=$1 AND s.step_id=$2 FOR UPDATE OF s`, [scope.runId, stepId]);
    if (!step || step.epoch !== epoch || step.lease_owner !== workerId) throw new FlowError('STALE_CLAIM');
    const { rows: [existing] } = await client.query<{ fingerprint: string; admitted: boolean }>(
      'SELECT fingerprint,admitted FROM nodeflow_durable.routing_commits WHERE step_id=$1', [stepId]);
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new FlowError('OUTCOME_CONFLICT');
      return existing.admitted ? 'committed' : 'pending';
    }
    await requireActiveRun(client, scope);
    const packet = admitPacket(JSON.parse(step.envelope));
    const outputs = serialize(validateOutputs(definition, step.node_id, packet, command.outputs));
    const { rowCount } = await client.query(`UPDATE nodeflow_durable.steps SET status='routing'
      WHERE step_id=$1 AND status='ready' AND lease_expires_at > clock_timestamp()
        AND NOT EXISTS (SELECT 1 FROM nodeflow_durable.external_step_operations WHERE step_id=$1)`, [stepId]);
    if (rowCount !== 1) throw new FlowError('STALE_CLAIM');
    await client.query('INSERT INTO nodeflow_durable.routing_commits (step_id,run_id,fingerprint,outputs) VALUES ($1,$2,$3,$4)',
      [stepId, scope.runId, fingerprint, outputs]);
    const materialized = await materializeRoute(client, scope.runId, definition, { ...step, step_id: stepId, outputs });
    await requireActiveRun(client, scope);
    await finishRunIfDone(client, scope.runId);
    return materialized ? 'committed' : 'pending';
  });
}

export function flushRouting(pool: Pool, scope: StepScope, profile: DurableProfile) {
  scope = checkScope(scope);
  return inTransaction(pool, async client => {
    const run = await lockRun(client, scope);
    const remaining = await remainingBudget(client, scope.runId);
    if (run.status !== 'queued' || (remaining !== null && remaining <= 0)) return 0;
    const definition = checkPin(profile, run.execution_digest, run.adapter_digest);
    const { rows } = await client.query<PendingRoute>(`
      SELECT c.step_id,s.node_id,s.input_packet_id,c.outputs FROM nodeflow_durable.routing_commits c
      JOIN nodeflow_durable.steps s USING (step_id)
      WHERE c.run_id=$1 AND NOT c.admitted ORDER BY c.created_at,c.step_id LIMIT 100`, [scope.runId]);
    let admitted = 0;
    for (const pending of rows) if (await materializeRoute(client, scope.runId, definition, pending)) admitted++;
    await requireActiveRun(client, scope);
    await finishRunIfDone(client, scope.runId);
    return admitted;
  });
}

export async function readRoutedOutputs(pool: Pool, scope: StepScope, after = '0') {
  scope = checkScope(scope);
  if (!/^(0|[1-9][0-9]{0,17})$/.test(after)) throw new FlowError('INVALID_OUTPUT_CURSOR');
  const { rows } = await pool.query<{ port: string; envelope: string; output_sequence: string }>(`
    SELECT o.port,o.output_sequence,p.envelope FROM nodeflow_durable.routed_outputs o
    JOIN nodeflow_durable.workflow_runs r USING (run_id)
    JOIN nodeflow_durable.step_packets p ON (p.run_id,p.packet_id)=(o.run_id,o.packet_id)
    WHERE r.workspace_id=$1 AND o.run_id=$2 AND o.output_sequence>$3::bigint ORDER BY o.output_sequence LIMIT 1000`,
  [scope.workspaceId, scope.runId, after]);
  return rows.map(row => ({ sequence: row.output_sequence, port: row.port, packet: admitPacket(JSON.parse(row.envelope)) }));
}
