# S48 execution preflight

PR #66 passed all five CI jobs and squash-merged to master at `37ca8a19d998b22306b6ccf274062068701cd610`. The S48 branch starts at that commit. The [S47 receipt](S47-execution.md) records the PostgreSQL and installed-package proof.

The user approved this RC1-r1 wait and inbox design, including seven-day expiry, and authorized PR publication after PostgreSQL restart, early signal, duplicate delivery and authorization passed.

## Wait binding and signal command

Admit an explicit built-in wait adapter on the routed profile. Its factory declares one trigger input and one output typed by the signal payload contract. Pin its signal name, contract and inbox policy with the adapter identity. Registering a wait consumes the trigger, releases its lease, and stores the trigger packet reference. The output is the validated signal payload derived from the trigger packet and inherits its job and key. Existing flow deadlines still run while a wait is open.

Use the persisted wait step UUID as the generation. It exists before the worker registers the wait, so the authorized host can correlate an early signal without guessing a future generation. Early signals are accepted only after the exact pinned wait step exists and while the run is active. No cross-run event names or speculative entries for nonexistent steps.

Proposed server command `submitSignal(scope, profile, command, authorize)` takes a scope containing workspace and run, the exact profile, and a command containing actor ID, node ID, generation, expected revision, signal name, caller idempotency key and JSON payload. Expected revision is 1 for a newly registered or not-yet-registered wait. It advances to 2 on consumption or closure. The trusted host binds the actor ID to its authenticated principal. The host authorization callback receives the exact immutable target and request, including actor, payload and expected revision. Validate request shape and scope, validate the pinned payload contract, and authorize outside the SQL transaction. Recheck the same binding, profile pin, revision and run lifecycle under lock immediately before writing. Conceal missing and wrong-workspace targets. Never write an inbox row for an unauthorized request.

Exact idempotent replay of an accepted command returns its current receipt after authorization, even after consumption or expiry. A different actor, payload or expected revision using the same key conflicts. A new command with wrong generation, wrong name, stale revision or invalid contract returns `SIGNAL_CONFLICT`. Return a bounded receipt containing the command state, never the stored payload.

## Proposed migration 009

| Table | Primary key | Stored fields and constraints |
| --- | --- | --- |
| waits | run_id, generation | Same-run step and trigger packet FKs, node ID, name, revision 1 or 2, state waiting/consumed/closed. |
| signal_inbox | run_id, generation, command_key | Same-run step FK, workspace ID checked against the run, node ID, name, expected revision, actor ID, request fingerprint, nullable canonical payload, state pending/consumed/expired/closed, admission and expiry timestamps. |

Use a unique partial index on pending signals per generation. A generation accepts only one pending decision at a time. Serialize inbox admission for a workspace under a transaction advisory lock before acquiring the run lock, so a 1,000 pending-row limit cannot race across runs. Registration and continuation only take the run lock. Index workspace-scoped pending admission and expiry. Use a seven-day database-clock expiry. Expiry removes the payload and keeps the command receipt for the lifetime of the run. A bounded sweep expires due rows; signal and registration commands check expiry against database time even when no sweep has run. Expiry does not resume the wait. A subsequent fresh command can fill a still-open wait.

## Transaction and recovery

- Register under the existing run lock and active claim fence. Insert the wait and acknowledge the trigger together. A registered wait counts as outstanding work for run completion but has no ready or leased task. Consume any matching unexpired inbox row in the same transaction.
- When an authorized signal reaches an existing wait, close the wait, mark the inbox row consumed and record the derived packet in the existing routed continuation transaction. A full edge leaves one persisted output pending for the routing sweep. Replays never derive another packet.
- Cancellation, deadline expiry or terminal branch failure close outstanding waits and revoke pending inbox entries under the same run lock. Retain the receipt without its payload. Commands that lose the lifecycle race cannot create a successor.

## Proof targets

- X48.1 checks actual compiler/profile pinning and refuses stale revision, wrong generation/name/schema, authorization failure and conflicting replay before inbox mutation.
- X48.2 registers a wait, stops or kills its worker, restarts and submits one approval twice. Verify one consumption, one successor, correct trigger lineage and no wait lease. Repeat with approval admitted after step creation and before registration.
- X48.3 exercises cross-workspace denial, cancellation, database-clock expiry, payload removal, preserved receipt and no continuation. Race cancellation against signal delivery and assert the run lock enforces the first terminal state.

## Implementation and proof

The durable package exports the branded `durableWait` factory. The PostgreSQL store exposes the signal command, wait registration used by the worker and a bounded expiry sweep. It reuses the routed continuation queue and run lifecycle. Registration releases the step lease, and a waiting row keeps the run active. Host code binds the authenticated actor and retains the step generation. Persisted wait discovery in the inspector belongs to S49.

- X48.1 uses the actual compiler and profile pin to reject an incorrect adapter or changed name. The PostgreSQL suite checks wrong workspace, generation, node, signal name, expected revision, payload and unauthorized commands, and verifies no inbox mutation.
- X48.2 kills the worker after it reports a committed wait with no lease. Concurrent identical submissions return the same consumed receipt and leave one successor. The early case checks inbox persistence before registration through both manual and worker registration paths. A capacity-one edge proves the continuation remains persisted while blocked.
- X48.3 checks cancellation during authorization, pending payload cleanup, seven-day expiry, retained expired receipts, fresh approval after expiry, and the 1,000 pending-signal workspace limit.

Node v26.13.0 and PostgreSQL 16. The PostgreSQL gate ran 38 tests with per-file coverage and the installed consumer. The core suite ran 314 tests with per-file coverage. The durable package gate ran six profile cases with installed-package verification. Local logs are in `/tmp/s48-pg-exact.log`, `/tmp/s48-core.log` and `/tmp/s48-durable.log`. The integration suite keeps its scenarios together so they share one PostgreSQL lifecycle fixture.
