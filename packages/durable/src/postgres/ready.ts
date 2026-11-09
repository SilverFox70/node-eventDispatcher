import { randomUUID } from 'node:crypto';
import { admitPacket, FlowError } from 'event-driven-design';
import type { Packet } from 'event-driven-design';
import type { Pool, PoolClient } from 'pg';
import { checkPin, checkScope, claimBudget, contractAt, serialize } from '../steps/model.js';
import type { DurableProfile, ReadyStep, StepScope } from '../steps/model.js';
import { inTransaction } from './transaction.js';

export async function storePacket(client: PoolClient, runId: string, input: Packet, parentId: string | null) {
  await client.query(`INSERT INTO nodeflow_durable.step_packets (run_id, packet_id, parent_packet_id, envelope)
    VALUES ($1, $2, $3, $4)`, [runId, input.packetId, parentId, serialize(input)]);
}

export async function addReady(client: PoolClient, runId: string, nodeId: string, packetId: string, maxClaims: number) {
  const stepId = randomUUID();
  await client.query(`INSERT INTO nodeflow_durable.steps (step_id, run_id, node_id, input_packet_id, max_claims)
    VALUES ($1, $2, $3, $4, $5)`, [stepId, runId, nodeId, packetId, maxClaims]);
  return stepId;
}

export function initializeSteps(pool: Pool, scope: StepScope, profile: DurableProfile) {
  scope = checkScope(scope);
  return inTransaction(pool, async client => {
    const { rows: [run] } = await client.query<{
      execution_digest: string; adapter_digest: string; input_json: string; steps_initialized: boolean;
    }>(`SELECT execution_digest, adapter_digest, input_json, steps_initialized FROM nodeflow_durable.workflow_runs
      WHERE workspace_id = $1 AND run_id = $2 FOR UPDATE`, [scope.workspaceId, scope.runId]);
    if (!run) throw new FlowError('RUN_NOT_FOUND');
    const definition = checkPin(profile, run.execution_digest, run.adapter_digest);
    if (run.steps_initialized) return;
    const inputs = JSON.parse(run.input_json) as Record<string, Packet[]>;
    for (const [port, packets] of Object.entries(inputs)) {
      const endpoint = Object.hasOwn(definition.spec.inputs, port) && definition.spec.inputs[port];
      if (!endpoint) throw new FlowError('UNKNOWN_PORT');
      const contract = contractAt(definition, endpoint.node, 'in');
      for (const input of packets) {
        if (!contract.validate(input.value)) throw new FlowError('INPUT_CONTRACT');
        await storePacket(client, scope.runId, input, null);
        await addReady(client, scope.runId, endpoint.node, input.packetId, claimBudget(definition, endpoint.node));
      }
    }
    await client.query('UPDATE nodeflow_durable.workflow_runs SET steps_initialized = true WHERE run_id = $1', [scope.runId]);
  });
}

export async function sweepReady(pool: Pool, scope: StepScope): Promise<readonly ReadyStep[]> {
  scope = checkScope(scope);
  const { rows } = await pool.query<{ step_id: string; node_id: string; epoch: number; envelope: string }>(`
    SELECT s.step_id, s.node_id, s.epoch, p.envelope
    FROM nodeflow_durable.steps s
    JOIN nodeflow_durable.workflow_runs r USING (run_id)
    JOIN nodeflow_durable.step_packets p ON (p.run_id, p.packet_id) = (s.run_id, s.input_packet_id)
    WHERE r.workspace_id = $1 AND s.run_id = $2 AND s.status = 'ready'
      AND s.not_before <= clock_timestamp() AND s.epoch < s.max_claims
      AND (s.lease_expires_at IS NULL OR s.lease_expires_at <= clock_timestamp())
    ORDER BY s.created_at, s.step_id LIMIT 100
  `, [scope.workspaceId, scope.runId]);
  return rows.map(row => Object.freeze({
    stepId: row.step_id, nodeId: row.node_id, epoch: row.epoch, input: admitPacket(JSON.parse(row.envelope)),
  }));
}
