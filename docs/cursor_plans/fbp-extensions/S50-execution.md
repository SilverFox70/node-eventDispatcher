# S50 qualification preflight

PR #68 passed all five CI checks and squash-merged at `e54358d2a5c8c10ee040b537efb2611befbdf83d`. The S50 branch starts at that commit. See the [S49 verification receipt](S49-execution.md).

The user approved the qualification fixture, evidence gate and modeled domain flow, with publication after the real crash matrix passed. This is a test of the delivered host, using production entry points. It does not change the runtime contract.

## Fixture and commands

Use a disposable database, a parent supervisor, two forked Node workers and a loopback HTTP provider. Run with the repository's pinned Node/npm, the CI PostgreSQL service, and actual locked profile bindings. The provider has separate mutation and lookup endpoints and keeps an effect ledger keyed by business intent and resource revision. It records acceptance before releasing the HTTP reply barrier. A lookup can return matching success or inconclusive evidence without sending a mutation.

Use a real linear pinned profile for domain mutation → sync → conditional verification → projection refresh. Stage the domain revision and obligation in the same transaction. The fixture invokes the existing provider permit and reconciliation paths from the sync step. The verification step makes its decision from the pinned result. The application-side projection uses a monotonic revision check and the composed test asserts both its visible revision and write count. Keep routed join and wait cases on their existing pinned profiles. The current host does not permit external operations inside routed profiles.

Standalone command: `node --import ./packages/durable/test/resolve-core.js --test packages/durable/test/qualification/*.test.js` after building core and durable. Supply `FBP_POSTGRES_TEST_URL` for a disposable PostgreSQL server and `FBP_QUALIFICATION_SEED` to replay the scheduler's deterministic case ordering. The default seed is fixed. Exercise the same matrix from the existing PostgreSQL CI gate, with unique database names and deterministic IPC barriers. Timeouts are fixture watchdogs and do not determine case ordering.

## Mandatory matrix

| Case | Barrier before fault | Recovery and invariant |
| --- | --- | --- |
| Domain transaction rollback | Domain mutation and obligation staged, transaction uncommitted | Kill its owner or explicitly roll back. Both rows are absent and provider mutations are zero. |
| Durable submission | Domain and obligation commit acknowledged, no worker notified | Kill the submitter. An independent worker finds the obligation through polling. Duplicate wakes preserve one logical continuation. |
| Prepared operation | Preparation committed and original invocation permit absent | Kill the original worker. Reclaim under the configured budget. The ledger records one authorized invocation. |
| Permit committed | Invocation intent recorded and original callback paused before HTTP | Force lease loss and let the other worker try. No second permit. Reconciliation with absent evidence holds the resource. Resume the old callback and fence its late SQL result. |
| Provider accepted | Provider ledger acknowledges mutation, reply deliberately withheld | Kill the worker after acceptance. Replacement holds without a second mutation. Matching authoritative lookup resumes once. |
| Outcome and continuation | Persisted outcome and successor committed before wake | Drop or repeat the wake. Polling resumes the successor once. An old claim or stale revision cannot overwrite state. |
| Competing resources | First resource held with unresolved invocation intent | Stage a later revision of that resource and a different resource. The later revision waits while the independent one makes progress. |
| Database unavailable | Controlled PostgreSQL connection interruption at an identified step | Record the failed database operation, restore connectivity and verify persisted invariants. Use an owned connection/backend or a fault proxy, without disabling the shared service. |
| Pin mismatch | Replacement starts with a different implementation or policy digest | Refuse before application or provider work. The original pinned profile can still resume. |
| Signal replay | Signal receipt committed and the worker interrupted | Repeat the signal and worker wake. One consumption, one continuation. |
| Join replay | Final slot and completion committed, before output is observed | Replay delivery. Completion stays closed and the ledger contains one output. |

## Evidence gate

The manifest names each case, pinned profile digest, fault, expected ordered barriers and invariant assertions. Every observed barrier carries a case ID, worker PID or provider receipt, and operation or run identity. Assert the exact ordered trace, a separately observed effect ledger, persisted row counts and terminal state. Reject unknown/missing barriers, a missing provider-accepted receipt, a worker outside the supervisor registry, or any incomplete invariant. Include regression tests that fail those invalid evidence sets.

The supervisor tracks and closes every worker, pool, HTTP listener, timer and temporary database even on failure. Save bounded redacted receipts with seed, versions, case outcomes and cleanup results. A timeout or a lost barrier fails qualification. Reconciliation proves recovery of a confirmed result without a repeated provider mutation in these scenarios. It cannot guarantee exactly-once behavior for an arbitrary remote service or qualify a Realberry migration.

## Verification receipt

- X50.1 passed. The manifest fixes the profile, fault, ordered barriers and provider mutation count for each case. Negative evidence tests reject missing acceptance, an untracked worker, a missing ledger record, extra mutations and incomplete invariants.
- X50.2 passed. The provider recorded acceptance and held its HTTP reply before worker A was killed. Worker B observed uncertainty, held the next revision of the same resource and completed the independent resource through projection before reconciling the original. The original, unrelated and later revisions each recorded one mutation. Reapplying the old projection was refused.
- X50.3 passed. The matrix exercises rollback, committed submission discovery, prepared takeover, a delayed old callback fenced after lease expiry, provider response loss, crash after outcome commit before a wake, terminated PostgreSQL backend, pin mismatch, signal replay and completed join replay. Each case drops its database and closes the provider, pools and child processes.

The default seed 2919 passed all 11 tests on Node v26.13.0 and PostgreSQL 18.6. Seed 3093 also passed all 11 on PostgreSQL 16.15 during development. The owning PostgreSQL suite passed 40 tests, per-file coverage and installed-package checks on PostgreSQL 18.6. Logs are in `/tmp/s50-final.log`, `/tmp/s50-alt.log` and `/tmp/s50-pg.log`. The matrix runs as a separate step in the PostgreSQL CI job. The outage test terminates an owned database backend. The domain fixture writes its application projection through a monotonic compare-and-set after the durable result commits.
