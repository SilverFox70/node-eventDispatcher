ALTER TABLE nodeflow_durable.steps
  ADD COLUMN not_before timestamptz NOT NULL DEFAULT clock_timestamp(),
  ADD COLUMN lease_owner text,
  ADD COLUMN lease_expires_at timestamptz,
  ADD COLUMN max_claims integer NOT NULL DEFAULT 1 CHECK (max_claims BETWEEN 1 AND 6),
  ADD CONSTRAINT step_lease_pair CHECK ((lease_owner IS NULL) = (lease_expires_at IS NULL));

CREATE INDEX steps_due ON nodeflow_durable.steps (run_id, not_before, created_at, step_id) WHERE status = 'ready';
