# Durable task profile

The optional `event-driven-design-durable` package prepares a pinned profile for bounded JSON functions. It uses the existing graph compiler and runtime to invoke one task with one packet. Install it alongside the matching `event-driven-design` package.

Use `defineFunction` for ordinary functions or `defineConfiguredFunction` when a graph node needs validated JSON configuration. Both receive the same task context and derive output packets from the admitted input.

```ts
import { prepareDurableProfile, resumeDurableProfile } from 'event-driven-design-durable';

const options = {
  graph, registry, identity,
  adapters: [{
    component: 'adjust@1',
    implementationDigest: reviewedImplementationDigest,
    adapterVersion: 1 as const,
    replayPolicy: 'pure' as const,
  }],
};

const profile = prepareDurableProfile(options);
const pinned = profile.pin;
const reopened = resumeDurableProfile(pinned, options);
const result = await reopened.invoke('adjust', inputPacket, { timeoutMs: 1000 });
```

`identity` contains the core execution identity fields other than the graph. The host supplies reviewed implementation and contract digests, runtime and policy versions, and service profile digest. Register one adapter per used component. The pin also covers the actual port and configuration descriptors and the adapter version and policy. Keep the pin with the run and use it when reopening. If the exact graph or binding is unavailable, resume refuses with `VERSION_UNAVAILABLE`.

Only functions reviewed as pure are eligible in v1. The declaration is the application's assurance that the function can be recomputed without changing external state. Arbitrary streaming factories and provider policies are refused. Retries default to zero and use the ordinary graph policy when explicitly configured.

A computed result carries an output packet and the attempt IDs from that invocation. Input contract violations reject the invocation. A failed or cancelled run returns a stopped result with its terminal code. Recomputing may allocate new packet, run, and attempt IDs while preserving the input job and immediate parent. The result is compute evidence. The PostgreSQL host owns claims and outcome commits. S45 adds persisted retry scheduling and deadline policy.

The passive `event-driven-design-durable/model` entry reads a profile pin without loading runtime or SQL code. From the repository, run `npm run build` and `npm run test:durable` for the coverage gate and installed-package verification.

## Stage a workflow in the business transaction

The server-only `event-driven-design-durable/postgres` entry provides `openPostgresStore(connectionString)`. Run `await store.migrate()` during host setup against PostgreSQL 18. The migration owns the `nodeflow_durable` schema. Use the same database for the application's tables and the obligation. Close the pool when the host shuts down.

```ts
const staged = await store.withDurableTransaction(authorizedWorkspaceId, async tx => {
  const run = await tx.stage({ jobId, revisionId, profilePin, inputs: { request: [inputPacket] } });
  if (run.created) {
    const { rowCount } = await tx.query(
      'UPDATE person SET revision = revision + 1 WHERE id = $1 AND revision = $2',
      [personId, expectedRevision],
    );
    if (rowCount !== 1) throw Error('PERSON_REVISION_CONFLICT');
  }
  return run;
});
```

Supply the workspace ID from host authorization and the revision and pin from the host's trusted revision registry. The callback gets a scoped capability with parameterized data queries and staging. Await all operations inside the callback. Nested transactions, transaction-control statements and calls made using another callback's capability refuse. An operation failure aborts the transaction even if the callback catches it. The outer promise resolves only after PostgreSQL confirms commit.

The uniqueness key is workspace plus job ID. For the same key, replay the original input envelopes, revision and pin. An identical submission returns the existing run ID with `created: false`. A different fingerprint returns `INPUT_CONFLICT`. Retain the original request for retry if the connection is lost while committing. Reusing `created` as shown prevents a replay from applying the domain mutation again.

The adapter stores a queued obligation. S41 adds atomic step continuation and S42 adds worker recovery. The real database suite is `npm run test:postgres`. Set `FBP_POSTGRES_TEST_URL` to a disposable PostgreSQL 18 server with permission to create and drop test databases. Build core first with `npm run build`. The suite tests the source workspace and the installed package.

## Commit a step and its continuation

After staging, pass the authorized workspace and run ID as `scope`. Reopen the exact durable profile and call `store.initializeSteps(scope, profile)`. This idempotent operation validates stored input packets and creates the initial ready steps. `store.sweepReady(scope)` lists up to 100 ready steps for that run in creation order. The sweep reads persisted readiness directly.

For an owned step, invoke the profile using its node ID and packet. Pass the result, step ID, worker ID, epoch, and a stable commit key to `store.commitStep(scope, profile, command)`. Successful output must match the pinned contract and reference exactly the input packet as its immediate parent. The transaction stores the outcome, derived packet, any successor, and an outbox row. A terminal task error or output contract failure stores a failure without a successor. Repeating the exact command returns the original receipt. A stale epoch, reused key, or different result is refused.

After commit, a caller may send an advisory wake with `store.publishStepWake(scope, receipt.outcomeId)`. A lost wake leaves the successor visible to a sweep. Duplicate wakes leave the same ready row. This slice supports the bounded single-input and single-output function profile. A worker must claim the step before committing it.

## Claim and recover work

After initialization, run `startStepWorker` from `event-driven-design-durable` with a store, an authorized run scope, the pinned profile, a unique worker ID, and a task timeout. Each worker periodically claims up to its configured concurrency. PostgreSQL orders due work by creation time and step ID. The worker renews its leases while tasks run. Call `await worker.stop()` before closing the store to stop polling and abort local work.

Hosts that manage their own worker can call `store.claimSteps(scope, profile, { workerId, leaseMs, limit })` and `store.heartbeatStep(scope, claim, leaseMs)`. Claiming increments the epoch. A commit must carry the claim's worker ID and epoch. After expiry, an old worker cannot renew its lease or commit. Retrying the exact command after a successful commit still returns that worker's receipt.

Each lease consumes one invocation allowance. The worker uses `profile.invokeOnce` so in-process retries cannot multiply the recovery budget. By default an expired claim is held. A node's explicit retry allowance permits a bounded number of takeovers of its reviewed pure computation. Returned task failures are terminal in this slice. Persisted retry delays and deadline policy belong to S45. Existing S41 rows upgrade with one claim allowance.

S42 workers sweep one authorized run. A notification can prompt a sweep, and periodic polling still works if the listener disappears. The worker can recompute eligible work, while the outcome store accepts at most one committed result.

## Record an external provider call

Use a dedicated host for runs containing external operations. The host claims the step, then calls `prepareExternalOperation(scope, claim, request)` with the provider, business key, resource key, revision, policy version, and JSON payload. The business key and fingerprint identify one operation across jobs. Revisions are registered in ascending order per resource, and earlier unresolved revisions block later calls.

S43 supports the conservative `reconcile-required` policy. Call `invokeExternalOperation(scope, claim, operationId, request, send)` with the same request. The store commits a single invocation permit before it calls `send`. The callback owns one provider request and validates the response before returning JSON. A lost or invalid response holds the operation as uncertain. An expired worker cannot obtain a permit or save a late result.

Use `recoverExternalOperation(scope, operationId)` to inspect the linked operation and mark expired intent uncertain. Recovery does not dispatch a request. A dedicated host can claim a still-prepared operation with `external: true` within the original claim budget. Linked steps stay out of the ordinary worker pool. S44 owns evidence-backed reconciliation and continuation from the ledger.

## Reconcile an external outcome

After recording uncertainty, read the linked step with `getReconciliationTarget(scope, stepId, operationId)`. It returns the exact provider binding, the operation's revision, and any hold reason or review time. Submit that revision to `reconcileExternalOperation(scope, profile, command, adapter)`.

The command identifies the actor, step, operation, command key, and lookup or manual mode. The host's pinned adapter authorizes the actor for that scope and returns provider evidence. For manual decisions, the adapter verifies the operator's evidence independently. Evidence carries the complete binding and a safe reference. A successful result must satisfy the pinned output contract and match any previously recorded result.

The operation change, step output, successor, wake, and accepted audit record commit together. A stale, unauthorized, conflicting or duplicate scoped decision is refused and audited. An inconclusive result records a reason and a database-time review timestamp while leaving the operation held. Provider absence gives no new invocation permit. The supported policy requires provider evidence to continue.

## Persist workflow time and retry policy

Pass `timing: { timeoutMs, notBeforeMs }` when staging a run. PostgreSQL computes the absolute deadline and earliest start from its clock. Timing is part of the submission fingerprint. Existing submissions without timing retain their previous behavior. The host must initialize the pinned profile before execution. A node timeout, retry delay or settlement budget incompatible with the flow budget is refused before a claim.

A worker schedules another attempt only for a settled failure code in the pinned retry policy. It persists the next due time and releases the lease in one transaction. The persisted claim count covers both planned retries and crash takeover. The default is zero retries. Each leased invocation runs once, and a delayed attempt cannot start after the workflow deadline. A returned failure with no allowance becomes terminal when the run finishes. An interrupted attempt with no remaining allowance stays held for operator review.

Use `getRunTiming(scope)` to read and refresh deadline state and `cancelRun(scope)` to stop a queued run. The first terminal state wins. A deadline or cancellation fences new claims and commits, and preserves unresolved provider intent as uncertain. Applications can still inspect that evidence.

## Recover fan-out and merge

Register the built-in broadcast, filter, and merge as version 1 pure adapters with their matching `operator` names. Bounded map functions keep their pure adapter declaration. The compiler checks the real component identity and pins the adapter, graph wiring and contracts. A routed worker invokes the existing runtime for each named input port.

An invocation's complete output batch is recorded once. PostgreSQL admits all branches together when every target edge has capacity. A full edge holds the computed batch for a later sweep, without running its source again. Sequence numbers preserve admission order per edge. Independent branches can finish in either order. Filter drops are recorded as consumed, and filter and merge forwards preserve the original packet envelope.

`readRoutedOutputs(scope, afterSequence)` returns up to 1,000 exposed packets in persisted arrival order. Pass the last returned sequence to read the next page. A terminal branch failure fences sibling commits. This profile caps each operator at 32 ports and uses bounded batches. Provider continuation remains available through the linear profile.

## Recover a keyed join

Register the built-in `joinByKey` with `operator: 'join-by-key'` in the routed profile. A join accepts 2–256 distinct named ports. Its port order and capacity limits are part of the profile pin. The worker records each accepted input in PostgreSQL under the run, node, job and packet key.

The final input closes the group and records a packet with every immediate parent in declared port order. A full downstream edge can delay delivery of that saved packet. The completion record stays for the lifetime of the retained run, including after cancellation or failure. An identical step commit retry returns its existing receipt. A distinct delivery to a filled slot or completed group fails with `DUPLICATE_KEY` or `JOIN_GROUP_COMPLETED`.

The built-in partial and completed-group limits apply. An overflow fails the run and releases partial slots. If no work remains to fill a partial group, `getRunTiming(scope)` reports a failed run with `failureCode: 'JOIN_INCOMPLETE'`. Partial slots are also cleared on cancellation and timeout. Slot commits follow the existing claim policy. A crash after a claim but before its transaction commits can leave that delivery held when it has no remaining claim allowance.
