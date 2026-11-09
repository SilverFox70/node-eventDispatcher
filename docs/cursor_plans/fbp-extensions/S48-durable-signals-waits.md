# S48 — Pause a workflow for an authorized event or human decision and resume safely.

Plan revision EXT1-r3. Status **approved-for-execution**. See the [approved design and execution receipt](S48-execution.md).
Phase: durable. Proposed branch: `codex/fbp-48-durable-signals-waits`.
Order: S47 → S48 → S49.

## Story and boundaries

Pause a workflow for an authorized event or human decision and resume safely.

Add persisted wait registration, signal inbox/dedup, expected wait revision, schema/authorization checks and transactional signal consumption; waits release workers.

Contract: [durable-contract.md](durable-contract.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S47 merged and its proof handoff verified; D1 pinned artifacts; D3 PostgreSQL; D4 shared kernel/provider safety accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S48.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X48.1](conditions.md); Authorize signal against workspace/run/node/wait-generation and expected revision → matching schema accepted; unknown signal format, reused key with different payload and wrong generation refuse SIGNAL_CONFLICT before inbox mutation.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S48.B — Implement the bounded feature

- Allowed: packages/durable/src/signals/**; packages/durable/src/operators/wait/**; packages/durable/src/commands/**; migrations.
- Prerequisite: S48.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Add persisted wait registration, signal inbox/dedup, expected wait revision, schema/authorization checks and transactional signal consumption; waits release workers.
- Condition: [X48.2](conditions.md). Register a review wait, restart workers, then send an authorized signal twice: one consumption and one successor; a signal accepted before wait registration is matched from the persisted inbox by exact correlation.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S48.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S48.B; immutable candidate identity before final receipts.
- Obligation/condition: [X48.3](conditions.md). Send wrong tenant/wait revision/contract, or signal a cancelled run: no continuation. An unconsumed signal expires visibly under configured retention and does not leak a worker lease.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

The user approved S48.A–C, including the seven-day signal expiry. The execution receipt records merge evidence, implementation limits and verification.
