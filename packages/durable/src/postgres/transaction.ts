import { ok as assert } from 'node:assert/strict';
import type { Pool, PoolClient } from 'pg';

type Isolation = 'read-committed' | 'repeatable-read-only';

async function commit<T>(client: PoolClient, work: (client: PoolClient) => Promise<T>, isolation: Isolation) {
  await client.query(isolation === 'repeatable-read-only'
    ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN ISOLATION LEVEL READ COMMITTED');
  const result = await work(client);
  assert((await client.query('COMMIT')).command === 'COMMIT', 'PostgreSQL must confirm the transaction commit');
  return result;
}

export async function inTransaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>,
  isolation: Isolation = 'read-committed'): Promise<T> {
  const client = await pool.connect();
  let discard = false;
  const disconnected = () => { discard = true; };
  client.on('error', disconnected);
  return commit(client, work, isolation).catch(async error => {
    await client.query('ROLLBACK').catch(disconnected);
    throw error;
  }).finally(() => {
    client.removeListener('error', disconnected);
    client.release(discard);
  });
}
