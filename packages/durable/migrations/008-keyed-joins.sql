ALTER TABLE nodeflow_durable.workflow_runs ADD COLUMN join_failure_code text CHECK (join_failure_code = 'JOIN_INCOMPLETE');

CREATE TABLE nodeflow_durable.join_groups (
  run_id uuid NOT NULL REFERENCES nodeflow_durable.workflow_runs(run_id),
  node_id text NOT NULL,
  job_id text NOT NULL,
  group_key text NOT NULL,
  expected_ports text[] NOT NULL CHECK (cardinality(expected_ports) BETWEEN 2 AND 256),
  PRIMARY KEY (run_id, node_id, job_id, group_key)
);

CREATE TABLE nodeflow_durable.join_slots (
  run_id uuid NOT NULL,
  node_id text NOT NULL,
  job_id text NOT NULL,
  group_key text NOT NULL,
  input_port text NOT NULL,
  packet_id uuid NOT NULL,
  PRIMARY KEY (run_id, node_id, job_id, group_key, input_port),
  FOREIGN KEY (run_id, node_id, job_id, group_key) REFERENCES nodeflow_durable.join_groups ON DELETE CASCADE,
  FOREIGN KEY (run_id, packet_id) REFERENCES nodeflow_durable.step_packets(run_id, packet_id)
);

CREATE TABLE nodeflow_durable.join_completions (
  run_id uuid NOT NULL,
  node_id text NOT NULL,
  job_id text NOT NULL,
  group_key text NOT NULL,
  final_step_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (run_id, node_id, job_id, group_key),
  FOREIGN KEY (run_id, final_step_id) REFERENCES nodeflow_durable.steps(run_id, step_id)
);
