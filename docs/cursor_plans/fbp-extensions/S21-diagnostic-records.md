# S21 — See safe, correlated error and operation records without enabling payload logging.

Plan revision EXT1-r2. Status **ready-for-review**; execution approval **none**.
Phase: diagnostics. Proposed branch: `codex/fbp-21-diagnostic-records`.
Order: S20 → S21 → S22.

## Story and boundaries

See safe, correlated error and operation records without enabling payload logging.

Introduce versioned diagnostic envelopes and stable error codes; adapt existing trace/task lifecycle once at the actual runtime boundary. Preserve EX1 behavior and emission order.

Contract: [diagnostics.md](diagnostics.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S20 merged and its proof handoff verified; D1 diagnostic policy accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

Canonical contract: [DG1-r1](contracts/diagnostics-v1.md). Review disposition: S21 proposal settled by S20; execution still requires actual S20 acceptance/merge and a slice request. No S21 implementation is approved by S20.

DG1 extends the production allowlist to src/component.ts, src/function.ts, src/components/** (known-input binding only), src/runtime/task-attempt.ts, src/runtime/ports.ts and src/runtime.ts, with focused test/types. No capture/sink/editor implementation.

## Tasks

### S21.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X21.1](conditions.md); Parse diagnostic-v1 received(packet P/job J/node N/port in) and operation-error(operation O/attempt1) fixtures → accept required fields; reject unknown version, missing required correlation and unsafe error-object fields before observer delivery. Existing EX1 records keep their shape.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S21.B — Implement the bounded feature

- Allowed: src/model/diagnostics/**; src/runtime/diagnostics/**; src/runtime/tasks.ts; src/runtime/trace.ts; src/errors.ts; public export barrels.
- Prerequisite: S21.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Introduce versioned diagnostic envelopes and stable error codes; adapt existing trace/task lifecycle once at the actual runtime boundary. Preserve EX1 behavior and emission order.
- Condition: [X21.2](conditions.md). Run a handler that throws an Error containing a fake secret: one correlated error record carries code/run/node/attempt, no message/stack/payload by default; ordinary completion is attributed to the same operation.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S21.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S21.B; immutable candidate identity before final receipts.
- Obligation/condition: [X21.3](conditions.md). Run two jobs through one node and throw on one: the record identifies the failing job and immediate packet lineage; no error from job A appears in job B and no diagnostic observer changes run outcome.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

No task is approved for execution. The DG1 proposal is settled for review. S20 acceptance/merge and actual execution authorization remain required; future commands are not delivered behavior.
