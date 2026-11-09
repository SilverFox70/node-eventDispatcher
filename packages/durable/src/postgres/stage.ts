import { randomUUID } from 'node:crypto';
import { FlowError } from 'event-driven-design';
import type { PoolClient } from 'pg';
import { prepareSubmission } from '../submission/input.js';
import type { StagedRun, Submission } from '../submission/input.js';

export async function stageRun(client: PoolClient, workspaceId: string, input: Submission): Promise<StagedRun> {
  const { jobId, revisionId, pin, inputJson, fingerprint, timing } = prepareSubmission(input);
  const created = await client.query<{ run_id: string }>(`
    INSERT INTO nodeflow_durable.workflow_runs
      (run_id, workspace_id, job_id, revision_id, execution_digest, adapter_digest, input_fingerprint, input_json, timeout_ms, deadline_at, not_before)
    SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,
      stamp + $9::integer * interval '1 millisecond', stamp + $10::integer * interval '1 millisecond'
    FROM (SELECT clock_timestamp() AS stamp) clock
    ON CONFLICT (workspace_id, job_id) DO NOTHING
    RETURNING run_id
  `, [randomUUID(), workspaceId, jobId, revisionId, pin.executionDigest, pin.adapterDigest, fingerprint, inputJson, timing?.timeoutMs ?? null, timing?.notBeforeMs ?? null]);
  if (created.rows[0]) return Object.freeze({ runId: created.rows[0].run_id, created: true });

  // Under Read Committed this statement sees the winning row after a concurrent insert commits.
  const { rows } = await client.query<{ run_id: string; input_fingerprint: string }>(`
    SELECT run_id, input_fingerprint FROM nodeflow_durable.workflow_runs
    WHERE workspace_id = $1 AND job_id = $2
  `, [workspaceId, jobId]);
  if (rows[0]?.input_fingerprint !== fingerprint) throw new FlowError('INPUT_CONFLICT');
  return Object.freeze({ runId: rows[0].run_id, created: false });
}
