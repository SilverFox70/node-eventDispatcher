import { finishRunIfDone, lockRun, requireActiveRun } from './run-timing.js';
import { admitPacket, derivePacket, FlowError } from 'event-driven-design';
import type { Pool, PoolClient } from 'pg';
import { readCommand, readEvidence } from '../reconciliation/model.js';
import type { ReconciliationAdapter, ReconciliationCommand, ReconciliationEvidence, ReconciliationResult } from '../reconciliation/model.js';
import { checkPin, checkScope, contractAt, interpretResult, serialize } from '../steps/model.js';
import type { DurableProfile, StepScope } from '../steps/model.js';
import { saveStepOutcome } from './outcome.js';
import { readTarget } from './reconciliation-target.js';
import { inTransaction } from './transaction.js';

type Target = Awaited<ReturnType<typeof readTarget>>;

async function audit(client: PoolClient, command: ReconciliationCommand, revision: number, decision: string, evidenceRef?: string) {
  await client.query(`INSERT INTO nodeflow_durable.reconciliation_audit
    (operation_id, step_id, command_key, actor_id, mode, expected_revision, observed_revision, decision, evidence_ref)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
  [command.operationId, command.stepId, command.commandKey, command.actorId, command.mode,
    command.expectedRevision, revision, decision, evidenceRef ?? null]);
}

function refusal(target: Target, command: ReconciliationCommand) {
  if (target.row.step_status !== 'ready') return 'ALREADY_RESOLVED';
  if (target.row.resolution_revision !== command.expectedRevision) return 'STALE_RECONCILIATION';
  if (!['uncertain', 'succeeded'].includes(target.row.state)) return 'EXTERNAL_OPERATION_HELD';
}

export async function reconcileExternalOperation(pool: Pool, scope: StepScope, profile: DurableProfile,
  input: ReconciliationCommand, adapter: ReconciliationAdapter): Promise<ReconciliationResult> {
  const command = readCommand(input);
  const { operationId, stepId } = command;
  scope = Object.freeze(checkScope(checkScope(scope, stepId), operationId));
  const initial = await readTarget(pool, scope, stepId, operationId);
  let error = refusal(initial, command);
  let evidence: ReconciliationEvidence | undefined;
  if (!adapter.authorize(scope, command)) error = 'RECONCILIATION_FORBIDDEN';
  else if (adapter.provider !== initial.binding.provider || adapter.policyVersion !== initial.binding.policyVersion) {
    error = 'VERSION_UNAVAILABLE';
  }
  if (!error) {
    try { checkPin(profile, initial.row.execution_digest, initial.row.adapter_digest); }
    catch { error = 'VERSION_UNAVAILABLE'; }
  }
  if (!error) {
    try { evidence = readEvidence(await adapter.readEvidence(initial.binding, command), initial.binding); }
    catch { error = 'INVALID_PROVIDER_EVIDENCE'; }
  }

  const applied = await inTransaction(pool, async client => {
    await lockRun(client, scope);
    const target = await readTarget(client, scope, stepId, operationId, true);
    const { row } = target;
    const revision = row.resolution_revision;
    const refuse = async (code: string) => {
      await audit(client, command, revision, code);
      return { code };
    };
    if (error) return refuse(error);
    const currentRefusal = refusal(target, command);
    if (currentRefusal) return refuse(currentRefusal);
    const duplicate = await client.query(`SELECT 1 FROM nodeflow_durable.reconciliation_audit
      WHERE operation_id=$1 AND command_key=$2 AND decision IN ('SUCCEEDED','INCONCLUSIVE')`, [operationId, command.commandKey]);
    if (duplicate.rowCount) return refuse('DUPLICATE_RESOLUTION');
    const found = evidence!;
    if (found.kind === 'inconclusive') {
      if (row.state === 'succeeded') return refuse('INVALID_PROVIDER_EVIDENCE');
      const { rows: [updated] } = await client.query<{ next_review_at: Date }>(`
        UPDATE nodeflow_durable.external_operations SET resolution_revision=resolution_revision+1,
          hold_reason=$2, next_review_at=clock_timestamp()+$3::integer*interval '1 millisecond'
        WHERE operation_id=$1 RETURNING next_review_at`, [operationId, found.reason, found.reviewAfterMs]);
      await audit(client, command, revision, 'INCONCLUSIVE', found.evidenceRef);
      return { status: 'inconclusive' as const, revision: revision + 1, reason: found.reason,
        nextReviewAt: updated!.next_review_at.toISOString() };
    }

    await requireActiveRun(client, scope);
    const definition = checkPin(profile, row.execution_digest, row.adapter_digest);
    const resultJson = serialize(found.value);
    if (!contractAt(definition, row.node_id, 'out').validate(found.value) ||
        (row.result_json !== null && row.result_json !== resultJson)) return refuse('INVALID_PROVIDER_EVIDENCE');
    const packet = admitPacket(JSON.parse(row.envelope));
    const result = { kind: 'computed' as const, packet: derivePacket(found.value, [packet]) };
    const outcome = interpretResult(definition, row.node_id, packet, result);
    const receipt = await saveStepOutcome(client, scope.runId, stepId, row.node_id, packet.packetId, definition, outcome, stepId);
    await client.query("UPDATE nodeflow_durable.steps SET status='completed' WHERE step_id=$1", [stepId]);
    await client.query(`UPDATE nodeflow_durable.external_operations SET state='succeeded', result_json=$2,
      resolution_revision=resolution_revision+1, hold_reason=NULL, next_review_at=NULL WHERE operation_id=$1`,
    [operationId, resultJson]);
    await requireActiveRun(client, scope);
    await finishRunIfDone(client, scope.runId);
    await audit(client, command, revision, 'SUCCEEDED', found.evidenceRef);
    return { status: 'succeeded' as const, revision: revision + 1, receipt };
  });
  if ('code' in applied) throw new FlowError(applied.code!);
  return applied;
}
