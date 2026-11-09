import { readFile } from 'node:fs/promises';
import { FlowError } from 'event-driven-design';
import type { Pool } from 'pg';
import { inTransaction } from './transaction.js';

export async function migrate(pool: Pool): Promise<void> {
  await inTransaction(pool, async client => {
    await client.query('SELECT pg_advisory_xact_lock(17320968, 40)');
    await client.query('CREATE SCHEMA IF NOT EXISTS nodeflow_durable');
    await client.query(`CREATE TABLE IF NOT EXISTS nodeflow_durable.schema_version (
      singleton boolean PRIMARY KEY CHECK (singleton),
      version integer NOT NULL CHECK (version > 0)
    )`);
    const { rows } = await client.query<{ version: number }>('SELECT version FROM nodeflow_durable.schema_version');
    if (rows[0]?.version === 1) return;
    if (rows.length) throw new FlowError('UNSUPPORTED_DURABLE_SCHEMA');
    const sql = await readFile(new URL('../../migrations/001-submissions.sql', import.meta.url), 'utf8');
    await client.query(sql);
    await client.query('INSERT INTO nodeflow_durable.schema_version VALUES (true, 1)');
  });
}
