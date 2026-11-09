import type { PoolClient } from 'pg';

export async function expireGeneration(client: PoolClient, runId: string, generation: string) {
  await client.query(`UPDATE nodeflow_durable.signal_inbox SET state='expired',payload=NULL
    WHERE run_id=$1 AND generation=$2 AND state='pending' AND expires_at<=clock_timestamp()`, [runId, generation]);
}

/** Scope and run locking are owned by the caller. */
export async function expireSignals(client: PoolClient, runId: string) {
  const { rowCount } = await client.query(`WITH due AS (
    SELECT generation,command_key FROM nodeflow_durable.signal_inbox
    WHERE run_id=$1 AND state='pending' AND expires_at<=clock_timestamp()
    ORDER BY expires_at,generation,command_key LIMIT 100)
    UPDATE nodeflow_durable.signal_inbox i SET state='expired',payload=NULL FROM due
    WHERE i.run_id=$1 AND (i.generation,i.command_key)=(due.generation,due.command_key)`, [runId]);
  return rowCount!;
}

export async function closeWaits(client: PoolClient, runId: string) {
  await client.query("UPDATE nodeflow_durable.waits SET state='closed',revision=2 WHERE run_id=$1 AND state='waiting'", [runId]);
  await client.query(`UPDATE nodeflow_durable.signal_inbox SET state='closed',payload=NULL
    WHERE run_id=$1 AND state='pending'`, [runId]);
}
