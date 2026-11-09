import { runTiming } from './run-timing.js';
import { scheduleStepRetry } from './retry.js';
import { getReconciliationTarget } from './reconciliation-target.js';
import { reconcileExternalOperation } from './reconcile.js';
import type { ReconciliationAdapter, ReconciliationCommand } from '../reconciliation/model.js';
import { prepareExternalOperation } from './external-prepare.js';
import { invokeExternalOperation, recoverExternalOperation } from './external-invoke.js';
import type { ExternalOperationRequest } from '../operations/model.js';
import type { Json } from 'event-driven-design';
import { AsyncLocalStorage } from 'node:async_hooks';
import { FlowError } from 'event-driven-design';
import pg from 'pg';
import { validIdentifier } from '../submission/input.js';
import type { StagedRun, Submission } from '../submission/input.js';
import { migrate } from './migrate.js';
import { stageRun } from './stage.js';
import { commitStep, publishStepWake } from './outcome.js';
import { claimSteps, heartbeatStep } from './leases.js';
import { initializeSteps, sweepReady } from './ready.js';
import type { ClaimIdentity, ClaimOptions, DurableProfile, StepCommit, StepScope } from '../steps/model.js';
import { inTransaction } from './transaction.js';

export type { Submission, StagedRun };
export type { RunTiming, RunStatus } from '../scheduling/policy.js';
export type { ReconciliationAdapter, ReconciliationBinding, ReconciliationCommand, ReconciliationEvidence, ReconciliationResult } from '../reconciliation/model.js';
export type { ExternalOperation, ExternalOperationRequest } from '../operations/model.js';
export type { ClaimIdentity, ClaimOptions, StepClaim } from '../steps/model.js';
export type { CommittedStep, ReadyStep, StepCommit, StepResult, StepScope } from '../steps/model.js';
export type DurableTransaction = Readonly<{
  query<Row extends Record<string, unknown> = Record<string, unknown>>(sql: string, values?: readonly unknown[]):
    Promise<Readonly<{ rows: Row[]; rowCount: number | null }>>;
  stage(input: Submission): Promise<StagedRun>;
}>;

const transactionScope = new AsyncLocalStorage<object>();
const domainStatement = /^\s*(?:SELECT|INSERT|UPDATE|DELETE|WITH)\b/i;

/** Own a pool and bind domain statements and submission to one checked-out connection. */
export function openPostgresStore(connectionString: string) {
  const pool = new pg.Pool({ connectionString });
  // pg removes the failed idle client. Report the loss without printing connection details.
  pool.on('error', () => process.emitWarning('PostgreSQL idle connection lost', { code: 'POSTGRES_IDLE_CONNECTION' }));
  async function withDurableTransaction<T>(workspaceId: string, work: (tx: DurableTransaction) => T | Promise<T>) {
    if (!validIdentifier(workspaceId)) throw new FlowError('INVALID_WORKSPACE');
    if (transactionScope.getStore()) throw new FlowError('TRANSACTION_NESTED');
    return inTransaction(pool, async client => {
      const owner = {};
      let active = true;
      const pending = new Set<Promise<unknown>>();
      let failed = false;
      function operation<R>(start: () => Promise<R>): Promise<R> {
        if (!active || transactionScope.getStore() !== owner) throw new FlowError('TRANSACTION_SCOPE');
        const promise = Promise.resolve().then(start);
        pending.add(promise);
        void promise.then(
          () => pending.delete(promise),
          () => { failed = true; pending.delete(promise); },
        );
        return promise;
      }

      const tx: DurableTransaction = Object.freeze({
        query<Row extends Record<string, unknown>>(sql: string, values: readonly unknown[] = []) {
          return operation(async () => {
            if (typeof sql !== 'string' || !domainStatement.test(sql)) throw new FlowError('DOMAIN_STATEMENT_REFUSED');
            const statement = { text: sql, values: [...values], queryMode: 'extended' };
            const { rows, rowCount } = await client.query<Row>(statement);
            return { rows, rowCount };
          });
        },
        stage: (input: Submission) => operation(() => stageRun(client, workspaceId, input)),
      });
      try {
        const result = await transactionScope.run(owner, () => work(tx));
        if (pending.size) throw new FlowError('TRANSACTION_WORK_PENDING');
        if (failed) throw new FlowError('TRANSACTION_ABORTED');
        return result;
      } finally {
        active = false;
        await Promise.allSettled([...pending]);
      }
    });
  }
  return Object.freeze({
    migrate: () => migrate(pool), withDurableTransaction,
    initializeSteps: (scope: StepScope, profile: DurableProfile) => initializeSteps(pool, scope, profile),
    claimSteps: (scope: StepScope, profile: DurableProfile, options: ClaimOptions) => claimSteps(pool, scope, profile, options),
    heartbeatStep: (scope: StepScope, claim: ClaimIdentity, leaseMs: number) => heartbeatStep(pool, scope, claim, leaseMs),
    sweepReady: (scope: StepScope) => sweepReady(pool, scope),
    commitStep: (scope: StepScope, profile: DurableProfile, command: StepCommit) => commitStep(pool, scope, profile, command),
    publishStepWake: (scope: StepScope, outcomeId: string) => publishStepWake(pool, scope, outcomeId),
    prepareExternalOperation: (scope: StepScope, claim: ClaimIdentity, input: ExternalOperationRequest) =>
      prepareExternalOperation(pool, scope, claim, input),
    invokeExternalOperation: (scope: StepScope, claim: ClaimIdentity, id: string, input: ExternalOperationRequest,
      send: (payload: Json) => Promise<Json>) => invokeExternalOperation(pool, scope, claim, id, input, send),
    recoverExternalOperation: (scope: StepScope, id: string) => recoverExternalOperation(pool, scope, id),
    getReconciliationTarget: (scope: StepScope, stepId: string, id: string) => getReconciliationTarget(pool, scope, stepId, id),
    reconcileExternalOperation: (scope: StepScope, profile: DurableProfile, command: ReconciliationCommand,
      adapter: ReconciliationAdapter) => reconcileExternalOperation(pool, scope, profile, command, adapter),
    getRunTiming: (scope: StepScope) => runTiming(pool, scope),
    cancelRun: (scope: StepScope) => runTiming(pool, scope, true),
    scheduleStepRetry: (scope: StepScope, profile: DurableProfile, claim: ClaimIdentity, code: string) =>
      scheduleStepRetry(pool, scope, profile, claim, code),
    close: () => pool.end(),
  });
}
