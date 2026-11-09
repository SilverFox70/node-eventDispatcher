ALTER TABLE nodeflow_durable.workflow_runs ADD COLUMN routing_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE nodeflow_durable.steps
  DROP CONSTRAINT steps_status_check,
  ADD CONSTRAINT steps_status_check CHECK (status IN ('ready','routing','completed','failed')),
  ADD COLUMN input_port text NOT NULL DEFAULT 'in';

CREATE TABLE nodeflow_durable.routing_commits (
  step_id uuid PRIMARY KEY REFERENCES nodeflow_durable.steps(step_id),
  run_id uuid NOT NULL REFERENCES nodeflow_durable.workflow_runs(run_id),
  fingerprint text NOT NULL,
  outputs text NOT NULL,
  admitted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX routing_pending ON nodeflow_durable.routing_commits (run_id, created_at, step_id) WHERE NOT admitted;

CREATE TABLE nodeflow_durable.deliveries (
  run_id uuid NOT NULL REFERENCES nodeflow_durable.workflow_runs(run_id),
  edge_index integer NOT NULL CHECK (edge_index >= 0),
  sequence bigint NOT NULL CHECK (sequence > 0),
  source_step_id uuid NOT NULL,
  target_step_id uuid NOT NULL UNIQUE,
  packet_id uuid NOT NULL,
  PRIMARY KEY (run_id, edge_index, sequence),
  UNIQUE (run_id, edge_index, source_step_id),
  FOREIGN KEY (run_id, source_step_id) REFERENCES nodeflow_durable.steps(run_id, step_id),
  FOREIGN KEY (run_id, target_step_id) REFERENCES nodeflow_durable.steps(run_id, step_id),
  FOREIGN KEY (run_id, packet_id) REFERENCES nodeflow_durable.step_packets(run_id, packet_id)
);

CREATE TABLE nodeflow_durable.routed_outputs (
  output_sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  run_id uuid NOT NULL REFERENCES nodeflow_durable.workflow_runs(run_id),
  step_id uuid NOT NULL,
  port text NOT NULL,
  packet_id uuid NOT NULL,
  PRIMARY KEY (run_id, step_id, port),
  FOREIGN KEY (run_id, step_id) REFERENCES nodeflow_durable.steps(run_id, step_id),
  FOREIGN KEY (run_id, packet_id) REFERENCES nodeflow_durable.step_packets(run_id, packet_id)
);
