CREATE TABLE nodeflow_durable.external_resources (
  workspace_id text NOT NULL,
  provider text NOT NULL,
  resource_key text NOT NULL,
  PRIMARY KEY (workspace_id, provider, resource_key)
);

CREATE TABLE nodeflow_durable.external_operations (
  operation_id uuid PRIMARY KEY,
  workspace_id text NOT NULL,
  provider text NOT NULL,
  business_key text NOT NULL,
  resource_key text NOT NULL,
  resource_revision integer NOT NULL CHECK (resource_revision > 0),
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
  policy_version text NOT NULL,
  state text NOT NULL DEFAULT 'prepared' CHECK (state IN ('prepared', 'invocation-intent', 'uncertain', 'succeeded')),
  intent_step_id uuid REFERENCES nodeflow_durable.steps(step_id),
  intent_epoch integer,
  intent_worker text,
  intent_at timestamptz,
  result_json text,
  UNIQUE (workspace_id, provider, business_key),
  UNIQUE (workspace_id, provider, resource_key, resource_revision),
  FOREIGN KEY (workspace_id, provider, resource_key)
    REFERENCES nodeflow_durable.external_resources(workspace_id, provider, resource_key),
  CHECK ((state = 'prepared') = (intent_step_id IS NULL)),
  CHECK ((state = 'succeeded') = (result_json IS NOT NULL))
);

CREATE TABLE nodeflow_durable.external_step_operations (
  step_id uuid PRIMARY KEY REFERENCES nodeflow_durable.steps(step_id),
  operation_id uuid NOT NULL REFERENCES nodeflow_durable.external_operations(operation_id)
);
