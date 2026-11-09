# Optional durable host — proposed EXT1-r2

Owners S39–S51. PostgreSQL is **user selected**; SQL driver, exact schema/API and integration adapter still need S20/D4 acceptance. This design is separate from SQLite graph documents. [Shared contract](shared-contract.md), [artifacts](artifacts.md), [condition ledger](conditions.md).

[RC1](contracts/recovery-boundaries.md) is the S20 canonical recovery/effect-boundary refinement; [PK1](contracts/packages-and-storage.md) selects adapters/package identities. Exact SQL/operator schema is still blocked on named future preflight artifacts.

## Eligible execution, not serialized JavaScript

Durable profile v1 accepts JSON/DAG graphs composed of registered bounded function tasks and supported versioned operator adapters. Reject arbitrary captured streaming processes/async iterators without an explicit state adapter before side effects. Persist only declared JSON state/outcomes; never promises, iterators, closures, sockets or injected services.

Each task registration binds `{component,implementationDigest,adapterVersion,replayPolicy}` to the same authoritative contracts and task invocation kernel. Proposed replayPolicy: `pure` (recomputable), `provider-idempotent` (stable provider key contract), or `reconcile-required` (uncertain effects held). Metadata does not prove safety; application adapter registration and tests must justify the policy. An ordinary side-effecting handler cannot opt into `pure` merely to resume.

S39 extracts minimum shared invocation/validation/identity logic from existing tasks. Existing in-memory runtime behavior remains; durable host owns scheduling and persisted state, core owns payload/config/port validation and task policy interpretation. No ad-hoc second graph compiler. The [S39 profile](../../../packages/durable/README.md) uses the core bounded function constructors and the shared finite invocation path. Profile pins cover the graph execution identity, adapter declarations, and observed port and configuration descriptors. S46–S48 add explicitly registered stateful adapters only after parity proofs.

Pin semantic graph hash, registry implementation/contract/representation versions and policy versions for the full run. Resume resolves exactly those versions or refuses `VERSION_UNAVAILABLE`, preserving waiting state for operator action. Automatic running-state migration or substitution of current code is excluded. A future migration needs its own state transform and effect-safety proof.

## Identity and persisted records

- `workflow_runs`: workspace/run/job IDs, graph hash, input fingerprint, lifecycle, database deadline, row revision and pinned versions. Unique `(workspaceId,jobId)`; duplicate same fingerprint returns original run, different input refuses `INPUT_CONFLICT`.
- `steps`: stable step ID (run/node/logical input), state, claim epoch/lease owner/expiry, attempt count, notBefore, validated input refs and unique committed outcome. Attempts have separate IDs; no conflation with job or packet IDs.
- `packets` and `deliveries`: immutable JSON/value hash, packet/job IDs, immediate parents, edge sequence and admission/consumption state. Unique logical delivery prevents accidental repeat processing.
- `outcomes` and `notification_outbox`: validated terminal step result plus downstream readiness in one transaction. Notifications can repeat; durable readiness is authoritative.
- `external_operations`: business operation key, payload fingerprint, resource key/revision, policy, immutable invocation intent, provider correlation, result/evidence and row revision.
- `join_groups`/`join_slots`/`join_completions`: job/key membership, unique named input slots, partial data and permanent-for-retention anti-reuse evidence.
- `waits`/`signal_inbox`: wait lifecycle/expected revision, signal correlation, authorization provenance, expiration and dedup consumption.
- `audit_events`: safe operation/command/transition IDs, actor and expected/resulting revisions. Payload retention/redaction is separate; audit alone is not a diagnostic full-payload log.

Names describe proposed SQL tables; S20 freezes DDL constraints, timestamp units and transaction isolation before implementation. Row-level authorization scopes every query/update. No tenant/workspace ID from an unauthenticated body grants access. Indexes cover due work, resource slots, unresolved operations and retention; no full-table polling requirement.

## Transactional submission and atomic progress

The [S40 adapter](../../../packages/durable/README.md#stage-a-workflow-in-the-business-transaction) uses `store.withDurableTransaction(authorizedWorkspaceId, callback)`. The callback receives `tx.query(sql, values)` and `tx.stage({jobId, revisionId, profilePin, inputs})` bound to one checked-out PostgreSQL client. The scope expires on callback exit and cannot be borrowed by a different transaction. The outer promise returns only after commit. Domain and durable tables reside in the same transactional database. The stage identity is `(workspaceId, jobId)`. Its fingerprint includes the pinned revision and exact original input envelopes.

For Realberry, do not assume Prisma/ORM integration from this signature: a future adapter must prove it uses the actual domain transaction and current DB constraints. S40 demonstrates atomic sample domain-row mutation plus obligation staging on real PostgreSQL; application adoption is separate.

A step commit checks `(runId,stepId,claimEpoch,expectedState)` under transaction, validates output and atomically stores outcome, derived packets, successor readiness and notification intent. Crash before commit means none exist; crash after commit means all exist even if wake fails. A rescan finds ready work without a notification. At most one committed outcome per logical step is the guarantee; computation may repeat only under its replay policy.

## Leases, scheduling and capacity

Workers claim due work using DB-time predicates, locked rows and monotonically increasing epochs. PostgreSQL documents [row locking and SKIP LOCKED](https://www.postgresql.org/docs/current/sql-select.html); these are scheduling primitives, not sufficient recovery correctness by themselves. Explicit queue order is `(notBefore,createdAt,id)`; no global completion ordering claim. Heartbeats renew only the current epoch. Expired claim recovery fences prior results and conservatively handles external invocation intents as uncertain.

Proposed worker defaults: concurrency8, claim batch16, lease30s/heartbeat10s, recovery sweep5s. These are configurable infrastructure defaults, not appropriate operation timeouts for every API. Controlled clocks/deferred barriers test boundaries, not sleep luck. Work queue and fan-out batches are bounded; persisted per-edge capacity applies to outstanding unconsumed deliveries, not a promise to retain unlimited work in RAM. Every process owns its connections/timers/claims and closes them on shutdown.

## Non-idempotent provider boundary

Business key identifies **the desired effect**, e.g. `(provider,partyId,personRevision,operationKind)`, not an arbitrary fresh run ID. Payload fingerprint must match; mismatched reuse refuses. A resource slot orders conflicting effects across different jobs/revisions for the same provider party; unique job IDs alone cannot prevent duplicate provider changes.

Operation state machine: `prepared → invocation-intent → succeeded | definitively-failed | uncertain`; uncertain → `reconciled-succeeded | proven-not-applied | manual-blocked`. Success requires validated provider result/evidence. A worker persists intent and wins a CAS invocation permit before making the call. Losing lease after this point cannot retract a call already authorized to an old process. Therefore takeover never automatically issues a new non-idempotent call while that intent is unresolved.

Crash before intent commit permits safe rescheduling. Crash after intent commit but before/after actual HTTP invocation is conservatively uncertain; the database cannot know whether the provider accepted it. A stale worker may still physically invoke after a pause: fencing stops stale SQL commits, **not a provider that ignores fencing**. Keep the resource slot blocked until policy-specific proof resolves this. Do not advertise exactly-once external execution.

Provider-idempotent adapters reuse the exact durable provider key, valid only within the provider’s documented retention/semantic contract. Reconcile-required adapters query authoritative evidence using correlation/fingerprint/resource revision. A found matching success supplies the original validated outcome; lookup failure/inconclusive stays uncertain. Absence alone is not proof while an old process might still call or provider visibility may lag.

A new call after `proven-not-applied` requires evidence of definitive nonapplication **and** that the original invocation cannot occur later (provider rejection/fencing or verified terminated original worker and provider-specific finality). If no such evidence is possible, remain manually blocked. Human choice cannot make an unknowable effect exactly-once.

Manual resolution: `resolveOperation({operationId,expectedRevision,decision,evidenceId})` through an authorized server command. Evidence is retained/audited, matched to resource/fingerprint/provider policy and validated result schema. Duplicate command IDs return the same result; stale/wrong evidence refuses `RESOLUTION_CONFLICT`. Resolution never blindly overwrites success or rewinds resource revision. Reconciliation fixes local knowledge, not arbitrary provider history.

## Retry, deadlines and cancellation

Default retries0; explicit retry count1–5. Retry after definite safe failure and policy match only. Persist attempts/notBefore and delay; an uncertain operation is not a retryable timeout. Logical duplicate delivery is not permission for another attempt. A claimed invocation records its attempt before entry. Crash-driven recomputation also consumes the same explicit total attempt budget (1 + configured retries), never an unlimited hidden recovery allowance; default0 retries holds an interrupted invocation for explicit safe operator action. A prepared step not yet invoked may be reclaimed without inventing an attempt. Registration as pure establishes replay safety, not an unbounded replay budget. Non-idempotent provider policy dominates a user’s retry count.

Persist absolute flow deadline against DB time; attempt budget is a local monotonic active-operation timeout bounded by remaining flow time. Reject configured flow/node combinations that violate the existing timeout contract rather than silently clip a node’s promised budget. Time spent waiting for a durable signal or retry counts toward the flow deadline when one is configured; long-running workflows may choose an explicit reviewed host maximum rather than an arbitrary demo value. Restart cannot reset elapsed deadline or retry counts.

Cancellation changes persisted lifecycle and cooperatively aborts owned work, prevents new successors and records unresolved external operations. It cannot undo a remote effect or release an uncertain resource slot for a new call. A durable wait releases its worker; timers/signals are persisted scheduling state. First terminal status wins; later callbacks/timers do not revive a run.

## Routing, joins and waits

S46 maps existing broadcast/map/filter/merge semantics onto transactional delivery records and shared validation. Per-edge FIFO admission survives restart; independent branches complete asynchronously. Merge remains readiness-ordered, not globally job-ordered. Pure filter false commits consumption with no output. Fan-out makes every branch delivery durable atomically or through a bounded resumable materialization cursor before acknowledging its source; S20 must freeze the exact batching transaction schema.

S47 join key remains `(runId,nodeId,jobId,key)` with2–256 named inputs. Partial slots unique per input, completed group never automatically reused. Filling final slot and writing outcome/completion are one transaction. Duplicate slot/completed group produces explicit refusal, never new output. Capacity/terminal incomplete groups obey the shared approved join policy; tombstones cannot be garbage-collected while valid late delivery/replay could reopen them.

S48 signal correlation uses run/node/wait-generation and caller idempotency key, not arbitrary global event names. Register wait and consume matching inbox signal transactionally; early valid signal may remain in bounded inbox. Strict schema, workspace/actor authorization and expected wait revision precede admission. Duplicate signal has one consumption. Stale/cancelled wait refuses. Proposed inbox retention7days/max1000 pending per workspace; limits and expirations are visible and cannot silently drop an acknowledged business obligation.

## Observability, retention and proof

S49 queries persisted run/step/operation state with safe codes, pinned revisions and origins; live diagnostics remain optional ephemeral observations. `queryRun` and cursor subscription are read-only. Cancel/resolve/retry commands are separately authorized CAS operations; reconnect/refresh never resubmits mutations. Delivery cursor gaps trigger snapshot reconciliation, not fabricated packet history.

Retain unresolved operation evidence, active runs and required version bindings; archive terminal payloads only under explicit policy. Default no automatic deletion of operation identity/tombstones. Retention must preserve the declared business dedup horizon or refuse future reuse of retired namespaces permanently; deleting data cannot silently permit old effects again. Backups/schema/code pins and provider evidence are part of recoverability. “Recover from any failure” cannot include destroyed databases/backups or unobservable external effects.

Each owning slice has real SQL/process/provider tests, not postponed to S50. S50 composes them into crash qualification; S51 clean installed consumer proves optional packaging and backup/upgrade/refusal paths. X39.1–X51.3 are planned proofs; none is claimed passed. Realberry replacement requires its own current-source integration and independent acceptance later.
