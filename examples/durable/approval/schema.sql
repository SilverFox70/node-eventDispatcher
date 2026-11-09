CREATE TABLE IF NOT EXISTS approval_artifacts (
  revision_id text PRIMARY KEY,
  document text NOT NULL
);
CREATE TABLE IF NOT EXISTS approval_requests (
  job_id text PRIMARY KEY,
  run_id uuid NOT NULL UNIQUE REFERENCES nodeflow_durable.workflow_runs(run_id)
);
