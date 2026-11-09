CREATE FUNCTION nodeflow_durable.require_retained_evidence() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'DURABLE_RETENTION_REQUIRED';
END;
$$;

CREATE TRIGGER retain_workflow_runs
  BEFORE DELETE OR TRUNCATE ON nodeflow_durable.workflow_runs
  FOR EACH STATEMENT EXECUTE FUNCTION nodeflow_durable.require_retained_evidence();

CREATE TRIGGER retain_external_operations
  BEFORE DELETE OR TRUNCATE ON nodeflow_durable.external_operations
  FOR EACH STATEMENT EXECUTE FUNCTION nodeflow_durable.require_retained_evidence();

CREATE TRIGGER retain_join_completions
  BEFORE DELETE OR TRUNCATE ON nodeflow_durable.join_completions
  FOR EACH STATEMENT EXECUTE FUNCTION nodeflow_durable.require_retained_evidence();

CREATE TRIGGER retain_signal_receipts
  BEFORE DELETE OR TRUNCATE ON nodeflow_durable.signal_inbox
  FOR EACH STATEMENT EXECUTE FUNCTION nodeflow_durable.require_retained_evidence();
