ALTER TABLE nodeflow_durable.external_operations
  ADD COLUMN resolution_revision integer NOT NULL DEFAULT 0 CHECK (resolution_revision >= 0),
  ADD COLUMN hold_reason text,
  ADD COLUMN next_review_at timestamptz;

CREATE TABLE nodeflow_durable.reconciliation_audit (
  audit_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  operation_id uuid NOT NULL REFERENCES nodeflow_durable.external_operations(operation_id),
  step_id uuid NOT NULL REFERENCES nodeflow_durable.steps(step_id),
  command_key text NOT NULL,
  actor_id text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('lookup', 'manual')),
  expected_revision integer NOT NULL,
  observed_revision integer NOT NULL,
  decision text NOT NULL,
  evidence_ref text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE UNIQUE INDEX reconciliation_command_applied
  ON nodeflow_durable.reconciliation_audit(operation_id, command_key)
  WHERE decision IN ('SUCCEEDED', 'INCONCLUSIVE');
