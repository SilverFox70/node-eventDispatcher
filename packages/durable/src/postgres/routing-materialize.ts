import { ok as assert } from 'node:assert/strict';
import type { Packet } from 'event-driven-design';
import type { PoolClient } from 'pg';
import type { Definition } from '../delivery/model.js';
import { claimBudget } from '../steps/model.js';
import { addReady, storePacket } from './ready.js';

export type PendingRoute = {
  step_id: string; node_id: string; input_packet_id: string; outputs: string;
};

/** The run row is locked by the caller. Check all capacities before writing any branch. */
export async function materializeRoute(client: PoolClient, runId: string, definition: Definition, pending: PendingRoute) {
  const { rowCount: earlier } = await client.query(`
    SELECT 1 FROM nodeflow_durable.routing_commits older
    JOIN nodeflow_durable.steps s ON s.step_id=older.step_id
    JOIN nodeflow_durable.routing_commits current ON current.step_id=$2
    WHERE older.run_id=$1 AND s.node_id=$3 AND NOT older.admitted
      AND (older.created_at,older.step_id)<(current.created_at,current.step_id) LIMIT 1`,
  [runId, pending.step_id, pending.node_id]);
  if (earlier) return false;
  const outputs = JSON.parse(pending.outputs) as { port: string; packet: Packet }[];
  const destinations = [];
  for (const output of outputs) {
    const edgeIndex = definition.spec.edges.findIndex(edge => edge.from.node === pending.node_id && edge.from.port === output.port);
    const edge = definition.spec.edges[edgeIndex];
    if (!edge) {
      const exposed = Object.entries(definition.spec.outputs).find(([, endpoint]) =>
        endpoint.node === pending.node_id && endpoint.port === output.port);
      assert(exposed, 'Compiled output must have an edge or exposure');
      destinations.push({ output, exposed: exposed[0] } as const);
      continue;
    }
    const { rows: [state] } = await client.query<{ outstanding: number; sequence: string }>(`
      SELECT count(*) FILTER (WHERE s.status='ready')::integer AS outstanding,
        (coalesce(max(d.sequence),0)+1)::text AS sequence
      FROM nodeflow_durable.deliveries d JOIN nodeflow_durable.steps s ON s.step_id=d.target_step_id
      WHERE d.run_id=$1 AND d.edge_index=$2`, [runId, edgeIndex]);
    if (state!.outstanding >= (edge.capacity ?? 16)) return false;
    destinations.push({ output, edge, edgeIndex, sequence: state!.sequence } as const);
  }

  for (const destination of destinations) {
    const { packet } = destination.output;
    if (packet.packetId !== pending.input_packet_id) await storePacket(client, runId, packet, pending.input_packet_id);
    if ('exposed' in destination) {
      await client.query('INSERT INTO nodeflow_durable.routed_outputs (run_id,step_id,port,packet_id) VALUES ($1,$2,$3,$4)',
        [runId, pending.step_id, destination.exposed, packet.packetId]);
    } else {
      const { edge, edgeIndex, sequence } = destination;
      const stepId = await addReady(client, runId, edge.to.node, packet.packetId, claimBudget(definition, edge.to.node), edge.to.port);
      await client.query(`INSERT INTO nodeflow_durable.deliveries
        (run_id,edge_index,sequence,source_step_id,target_step_id,packet_id) VALUES ($1,$2,$3,$4,$5,$6)`,
      [runId, edgeIndex, sequence, pending.step_id, stepId, packet.packetId]);
    }
  }
  await client.query("UPDATE nodeflow_durable.steps SET status='completed' WHERE step_id=$1", [pending.step_id]);
  await client.query('UPDATE nodeflow_durable.routing_commits SET admitted=true WHERE step_id=$1', [pending.step_id]);
  return true;
}
