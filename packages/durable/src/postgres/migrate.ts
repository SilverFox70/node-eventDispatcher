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
    const version = rows[0]?.version ?? 0;
    const migrations = ['001-submissions.sql', '002-step-continuations.sql', '003-worker-leases.sql', '004-external-operations.sql', '005-reconciliation.sql', '006-run-timing.sql', '007-routing.sql', '008-keyed-joins.sql'];
    if (version > migrations.length) throw new FlowError('UNSUPPORTED_DURABLE_SCHEMA');
    for (const [index, file] of migrations.entries()) {
      if (index < version) continue;
      const sql = await readFile(new URL('../../migrations/' + file, import.meta.url), 'utf8');
      await client.query(sql);
      await client.query(`INSERT INTO nodeflow_durable.schema_version VALUES (true, $1)
        ON CONFLICT (singleton) DO UPDATE SET version = EXCLUDED.version`, [index + 1]);
    }
  });
}
