ALTER TABLE nodeflow_durable.workflow_runs ADD COLUMN steps_initialized boolean NOT NULL DEFAULT false;

CREATE TABLE nodeflow_durable.step_packets (
  run_id uuid NOT NULL REFERENCES nodeflow_durable.workflow_runs(run_id),
  packet_id uuid NOT NULL,
  parent_packet_id uuid,
  envelope text NOT NULL CHECK (octet_length(envelope) BETWEEN 2 AND 10485760),
  PRIMARY KEY (run_id, packet_id),
  FOREIGN KEY (run_id, parent_packet_id) REFERENCES nodeflow_durable.step_packets(run_id, packet_id)
);

CREATE TABLE nodeflow_durable.steps (
  step_id uuid PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES nodeflow_durable.workflow_runs(run_id),
  node_id text NOT NULL CHECK (char_length(node_id) BETWEEN 1 AND 128),
  input_packet_id uuid NOT NULL,
  epoch integer NOT NULL DEFAULT 0 CHECK (epoch >= 0),
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (run_id, step_id),
  UNIQUE (run_id, node_id, input_packet_id),
  FOREIGN KEY (run_id, input_packet_id) REFERENCES nodeflow_durable.step_packets(run_id, packet_id)
);

CREATE INDEX steps_ready ON nodeflow_durable.steps (run_id, created_at, step_id) WHERE status = 'ready';

CREATE TABLE nodeflow_durable.step_outcomes (
  outcome_id uuid PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES nodeflow_durable.workflow_runs(run_id),
  step_id uuid NOT NULL UNIQUE,
  commit_key text NOT NULL CHECK (char_length(commit_key) BETWEEN 1 AND 128),
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  output_packet_id uuid,
  failure_code text,
  successor_id uuid,
  CHECK ((output_packet_id IS NULL) <> (failure_code IS NULL)),
  CHECK (successor_id IS NULL OR output_packet_id IS NOT NULL),
  UNIQUE (run_id, commit_key),
  FOREIGN KEY (run_id, step_id) REFERENCES nodeflow_durable.steps(run_id, step_id),
  FOREIGN KEY (run_id, successor_id) REFERENCES nodeflow_durable.steps(run_id, step_id),
  FOREIGN KEY (run_id, output_packet_id) REFERENCES nodeflow_durable.step_packets(run_id, packet_id)
);

CREATE TABLE nodeflow_durable.notification_outbox (
  outcome_id uuid PRIMARY KEY REFERENCES nodeflow_durable.step_outcomes(outcome_id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
