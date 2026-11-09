ALTER TABLE nodeflow_durable.workflow_runs
  DROP CONSTRAINT workflow_runs_status_check,
  ADD CONSTRAINT workflow_runs_status_check CHECK (status IN ('queued','completed','failed','cancelled','timed-out')),
  ADD COLUMN timeout_ms integer CHECK (timeout_ms > 0),
  ADD COLUMN deadline_at timestamptz,
  ADD COLUMN not_before timestamptz,
  ADD COLUMN terminal_at timestamptz;
