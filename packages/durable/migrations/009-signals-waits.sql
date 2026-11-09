ALTER TABLE nodeflow_durable.workflow_runs ADD UNIQUE (workspace_id, run_id);

CREATE TABLE nodeflow_durable.waits (
  run_id uuid NOT NULL,
  generation uuid NOT NULL,
  trigger_packet_id uuid NOT NULL,
  node_id text NOT NULL,
  signal_name text NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  state text NOT NULL DEFAULT 'waiting',
  PRIMARY KEY (run_id, generation),
  CHECK ((state='waiting' AND revision=1) OR (state IN ('consumed','closed') AND revision=2)),
  FOREIGN KEY (run_id, generation) REFERENCES nodeflow_durable.steps(run_id, step_id),
  FOREIGN KEY (run_id, trigger_packet_id) REFERENCES nodeflow_durable.step_packets(run_id, packet_id)
);

CREATE TABLE nodeflow_durable.signal_inbox (
  run_id uuid NOT NULL,
  generation uuid NOT NULL,
  command_key text NOT NULL,
  workspace_id text NOT NULL,
  node_id text NOT NULL,
  signal_name text NOT NULL,
  expected_revision integer NOT NULL CHECK (expected_revision=1),
  actor_id text NOT NULL,
  fingerprint text NOT NULL,
  payload text,
  state text NOT NULL DEFAULT 'pending',
  admitted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (run_id, generation, command_key),
  CHECK ((state='pending' AND payload IS NOT NULL) OR
    (state IN ('consumed','expired','closed') AND payload IS NULL)),
  FOREIGN KEY (workspace_id, run_id) REFERENCES nodeflow_durable.workflow_runs(workspace_id, run_id),
  FOREIGN KEY (run_id, generation) REFERENCES nodeflow_durable.steps(run_id, step_id)
);

CREATE UNIQUE INDEX signal_pending_generation ON nodeflow_durable.signal_inbox(run_id,generation) WHERE state='pending';
CREATE INDEX signal_workspace_pending ON nodeflow_durable.signal_inbox(workspace_id,expires_at) WHERE state='pending';
CREATE INDEX signal_run_expiry ON nodeflow_durable.signal_inbox(run_id,expires_at) WHERE state='pending';
