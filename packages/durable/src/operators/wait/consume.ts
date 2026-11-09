import { admitPacket, derivePacket } from 'event-driven-design';
import type { PoolClient } from 'pg';
import type { Definition } from '../../delivery/model.js';
import { materializeRoute } from '../../postgres/routing-materialize.js';
import { serialize } from '../../steps/model.js';

/** Consume one exact, live inbox row under the run lock. */
export async function consumeWait(client: PoolClient, runId: string, definition: Definition, generation: string) {
  const { rows: [match] } = await client.query<{
    node_id: string; input_packet_id: string; envelope: string; payload: string; fingerprint: string; command_key: string;
  }>(`SELECT w.node_id,w.trigger_packet_id AS input_packet_id,p.envelope,i.payload,i.fingerprint,i.command_key
    FROM nodeflow_durable.waits w
    JOIN nodeflow_durable.signal_inbox i USING (run_id,generation)
    JOIN nodeflow_durable.step_packets p ON (p.run_id,p.packet_id)=(w.run_id,w.trigger_packet_id)
    WHERE w.run_id=$1 AND w.generation=$2 AND w.state='waiting'
      AND i.state='pending' AND i.expires_at>clock_timestamp() AND i.expected_revision=w.revision
      AND i.node_id=w.node_id AND i.signal_name=w.signal_name`, [runId, generation]);
  if (!match) return false;
  const packet = derivePacket(JSON.parse(match.payload), [admitPacket(JSON.parse(match.envelope))]);
  const outputs = serialize([{ port: 'out', packet }]);
  await client.query("UPDATE nodeflow_durable.waits SET state='consumed',revision=2 WHERE run_id=$1 AND generation=$2", [runId, generation]);
  await client.query(`UPDATE nodeflow_durable.signal_inbox SET state='consumed',payload=NULL
    WHERE run_id=$1 AND generation=$2 AND command_key=$3`, [runId, generation, match.command_key]);
  await client.query("UPDATE nodeflow_durable.steps SET status='routing' WHERE run_id=$1 AND step_id=$2", [runId, generation]);
  await client.query('INSERT INTO nodeflow_durable.routing_commits (step_id,run_id,fingerprint,outputs) VALUES ($1,$2,$3,$4)',
    [generation, runId, match.fingerprint, outputs]);
  await materializeRoute(client, runId, definition, { ...match, step_id: generation, outputs });
  return true;
}
