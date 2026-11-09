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
