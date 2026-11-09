CREATE TABLE nodeflow_durable.workflow_runs (
  run_id uuid PRIMARY KEY,
  workspace_id text NOT NULL CHECK (workspace_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  job_id text NOT NULL CHECK (job_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  revision_id text NOT NULL CHECK (revision_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  execution_digest text NOT NULL CHECK (execution_digest ~ '^[0-9a-f]{64}$'),
  adapter_digest text NOT NULL CHECK (adapter_digest ~ '^[0-9a-f]{64}$'),
  input_fingerprint text NOT NULL CHECK (input_fingerprint ~ '^[0-9a-f]{64}$'),
  input_json text NOT NULL CHECK (octet_length(input_json) BETWEEN 2 AND 10485760),
  status text NOT NULL DEFAULT 'queued' CHECK (status = 'queued'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (workspace_id, job_id)
);
