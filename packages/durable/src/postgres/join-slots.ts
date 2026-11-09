import { admitPacket, derivePacket, FlowError } from 'event-driven-design';
import type { Packet } from 'event-driven-design';
import { joinValue } from 'event-driven-design/task-profile';
import type { PoolClient } from 'pg';
import type { Definition } from '../delivery/model.js';
import { contractAt } from '../steps/model.js';

export type JoinDelivery = { node_id: string; input_port: string; step_id: string };

const groupMatch = 'run_id=$1 AND node_id=$2 AND job_id=$3 AND group_key=$4';

/** Called under the run lock in the same transaction that acknowledges the delivery. */
export async function acceptJoinSlot(client: PoolClient, runId: string, definition: Definition,
  step: JoinDelivery, input: Packet) {
  const policy = definition.joins.get(step.node_id)!;
  if (input.key === undefined) throw new FlowError('INVALID_PACKET');
  if (!policy.names.includes(step.input_port)) throw new FlowError('INVALID_DELIVERY');
  const group = [runId, step.node_id, input.jobId, JSON.stringify(input.key)];
  const completed = await client.query('SELECT 1 FROM nodeflow_durable.join_completions WHERE ' + groupMatch, group);
  if (completed.rowCount) throw new FlowError('JOIN_GROUP_COMPLETED');

  const { rows: [partial] } = await client.query<{ expected_ports: string[] }>(
    'SELECT expected_ports FROM nodeflow_durable.join_groups WHERE ' + groupMatch, group);
  const names = partial?.expected_ports ?? policy.names;
  if (!partial) {
    const { rows: [capacity] } = await client.query<{ full: boolean }>(
      'SELECT count(*) >= $3 AS full FROM nodeflow_durable.join_groups WHERE run_id=$1 AND node_id=$2',
      [runId, step.node_id, policy.maxKeys]);
    if (capacity!.full) throw new FlowError('JOIN_CAPACITY');
    await client.query('INSERT INTO nodeflow_durable.join_groups VALUES ($1,$2,$3,$4,$5)', [...group, names]);
  }

  const { rows } = await client.query<{ input_port: string; envelope: string }>(`
    SELECT s.input_port,p.envelope FROM nodeflow_durable.join_slots s
    JOIN nodeflow_durable.step_packets p USING (run_id,packet_id)
    WHERE s.run_id=$1 AND s.node_id=$2 AND s.job_id=$3 AND s.group_key=$4`, group);
  const parents = new Map(rows.map(row => [row.input_port, admitPacket(JSON.parse(row.envelope))]));
  if (parents.has(step.input_port)) throw new FlowError('DUPLICATE_KEY');
  parents.set(step.input_port, input);

  if (parents.size !== names.length) {
    await client.query('INSERT INTO nodeflow_durable.join_slots VALUES ($1,$2,$3,$4,$5,$6)',
      [...group, step.input_port, input.packetId]);
    return [];
  }

  const { rows: [history] } = await client.query<{ full: boolean }>(
    'SELECT count(*) >= $3 AS full FROM nodeflow_durable.join_completions WHERE run_id=$1 AND node_id=$2',
    [runId, step.node_id, policy.completedGroupLimit]);
  if (history!.full) throw new FlowError('JOIN_HISTORY_CAPACITY');
  const ordered = names.map(port => parents.get(port)!);
  const value = joinValue(names, ordered);
  if (!contractAt(definition, step.node_id, 'out').validate(value)) throw new FlowError('OUTPUT_CONTRACT');
  const packet = derivePacket(value, ordered);
  await client.query(`INSERT INTO nodeflow_durable.join_completions
    (run_id,node_id,job_id,group_key,final_step_id) VALUES ($1,$2,$3,$4,$5)`, [...group, step.step_id]);
  await client.query('DELETE FROM nodeflow_durable.join_groups WHERE ' + groupMatch, group);
  return [{ port: 'out', packet }];
}
