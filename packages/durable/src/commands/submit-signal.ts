import { createHash } from 'node:crypto';
import { FlowError } from 'event-driven-design';
import type { Json } from 'event-driven-design';
import { canonicalJson } from 'event-driven-design/model';
import type { Pool, PoolClient } from 'pg';
import { consumeWait } from '../operators/wait/consume.js';
import { finishRunIfDone, lockRun, remainingBudget } from '../postgres/run-timing.js';
import { inTransaction } from '../postgres/transaction.js';
import { expireGeneration, expireSignals } from '../signals/inbox.js';
import { pendingSignalsPerWorkspace, signalRetentionHours } from '../signals/model.js';
import type { SignalAuthorization, SignalCommand, SignalReceipt } from '../signals/model.js';
import { checkPin, checkScope, contractAt } from '../steps/model.js';
import type { DurableProfile, StepScope } from '../steps/model.js';
import { validIdentifier } from '../submission/input.js';

const conflict = () => new FlowError('SIGNAL_CONFLICT');
const commandLimit = 1024 * 1024;

function readCommand(scope: StepScope, input: SignalCommand) {
  try {
    const encoded = canonicalJson(input, commandLimit);
    const command = JSON.parse(encoded) as SignalCommand;
    if (Object.keys(command).length !== 7 ||
      ![command.actorId, command.nodeId, command.signalName, command.commandKey].every(validIdentifier) ||
      typeof command.generation !== 'string' || command.expectedRevision !== 1 || !Object.hasOwn(command, 'payload')) throw conflict();
    return { scope: checkScope(scope, command.generation), command,
      fingerprint: createHash('sha256').update(encoded).digest('hex') };
  } catch { throw conflict(); }
}

function freezePayload(value: Json): Json {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freezePayload(child);
    Object.freeze(value);
  }
  return value;
}

async function target(db: Pool | PoolClient, scope: StepScope, profile: DurableProfile, command: SignalCommand) {
  const { rows: [row] } = await db.query<{
    node_id: string; status: string; execution_digest: string; adapter_digest: string; revision: number | null;
  }>(`SELECT s.node_id,s.status,r.execution_digest,r.adapter_digest,w.revision
    FROM nodeflow_durable.workflow_runs r JOIN nodeflow_durable.steps s USING (run_id)
    LEFT JOIN nodeflow_durable.waits w ON (w.run_id,w.generation)=(s.run_id,s.step_id)
    WHERE r.workspace_id=$1 AND r.run_id=$2 AND s.step_id=$3`, [scope.workspaceId, scope.runId, command.generation]);
  if (!row || row.node_id !== command.nodeId) throw conflict();
  const definition = checkPin(profile, row.execution_digest, row.adapter_digest);
  if (definition.waits.get(row.node_id) !== command.signalName ||
      !contractAt(definition, row.node_id, 'out').validate(command.payload)) throw conflict();
  return { row, definition };
}

/** Authorize a scoped command before locking, then recheck persisted state before mutation. */
export async function submitSignal(pool: Pool, inputScope: StepScope, profile: DurableProfile,
  input: SignalCommand, authorize: SignalAuthorization): Promise<SignalReceipt> {
  const { scope, command, fingerprint } = readCommand(inputScope, input);
  freezePayload(command.payload);
  Object.freeze(command);
  await target(pool, scope, profile, command);
  if (await authorize(Object.freeze(scope), command) !== true) throw new FlowError('SIGNAL_FORBIDDEN');

  return inTransaction(pool, async client => {
    await client.query('SELECT pg_advisory_xact_lock(17320969,hashtext($1))', [scope.workspaceId]);
    const run = await lockRun(client, scope, 'SIGNAL_CONFLICT');
    const { row, definition } = await target(client, scope, profile, command);
    const { generation, commandKey } = command;
    const identity = [scope.runId, generation];
    await expireGeneration(client, scope.runId, generation);
    const { rows: [existing] } = await client.query<{ fingerprint: string; state: SignalReceipt['state'] }>(
      'SELECT fingerprint,state FROM nodeflow_durable.signal_inbox WHERE run_id=$1 AND generation=$2 AND command_key=$3',
      [...identity, commandKey]);
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw conflict();
      return Object.freeze({ generation, commandKey, state: existing.state });
    }
    const remaining = await remainingBudget(client, scope.runId);
    if (run.status !== 'queued' || remaining === 0 ||
        (row.revision ?? 1) !== command.expectedRevision || (row.revision === null && row.status !== 'ready')) throw conflict();
    const { rows: [capacity] } = await client.query<{ busy: boolean; full: boolean }>(`SELECT
      coalesce(bool_or(run_id=$2 AND generation=$3),false) AS busy, count(*) FILTER (WHERE expires_at>clock_timestamp()) >= $4 AS full
      FROM nodeflow_durable.signal_inbox WHERE workspace_id=$1 AND state='pending'`,
    [scope.workspaceId, ...identity, pendingSignalsPerWorkspace]);
    if (capacity!.busy) throw conflict();
    if (capacity!.full) throw new FlowError('SIGNAL_CAPACITY');

    await client.query(`INSERT INTO nodeflow_durable.signal_inbox
      (run_id,generation,command_key,workspace_id,node_id,signal_name,expected_revision,actor_id,fingerprint,payload,admitted_at,expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,statement_timestamp(),statement_timestamp()+$11::integer*interval '1 hour')`,
    [...identity, commandKey, scope.workspaceId, command.nodeId, command.signalName, command.expectedRevision,
      command.actorId, fingerprint, canonicalJson(command.payload, commandLimit), signalRetentionHours]);
    const consumed = await consumeWait(client, scope.runId, definition, generation);
    if (await remainingBudget(client, scope.runId) === 0) throw conflict();
    await finishRunIfDone(client, scope.runId);
    return Object.freeze({ generation, commandKey, state: consumed ? 'consumed' : 'pending' });
  });
}

export function sweepExpiredSignals(pool: Pool, scope: StepScope) {
  scope = checkScope(scope);
  return inTransaction(pool, async client => {
    await lockRun(client, scope, 'SIGNAL_CONFLICT');
    return expireSignals(client, scope.runId);
  });
}
