# S45 — Keep retries, waits and deadlines meaningful across restarts.

Plan revision EXT1-r2. Status **approved-for-execution**. See the [execution receipt](S45-execution.md).
Phase: durable. Proposed branch: `codex/fbp-45-durable-time-policy`.
Order: S44 → S45 → S46.

## Story and boundaries

Keep retries, waits and deadlines meaningful across restarts.

Persist not-before scheduling, flow deadlines, attempt budgets, cancellation state and explicit retry policy; preserve zero retry default and configured 1–5 retries with replay-safety checks.

Contract: [durable-contract.md](durable-contract.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S44 merged and its proof handoff verified; D1 pinned artifacts; D3 PostgreSQL; D4 shared kernel/provider safety accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S45.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X45.1](conditions.md); Validate retries0 and explicit1–5 plus persistent deadline/notBefore → supported values accepted; retries6/negative, invalid timing and flow/node budget conflicts refuse before work. Crash recomputation consumes the same total attempt budget.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S45.B — Implement the bounded feature

- Allowed: packages/durable/src/scheduling/**; packages/durable/src/workers/**; packages/durable/src/commands/**; shared task-policy interpretation.
- Prerequisite: S45.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Persist not-before scheduling, flow deadlines, attempt budgets, cancellation state and explicit retry policy; preserve zero retry default and configured 1–5 retries with replay-safety checks.
- Condition: [X45.2](conditions.md). Schedule one safe retry, stop all workers, restart after due time: one next attempt executes; exhausted retries are terminal. Flow remaining budget never silently grants more than its deadline.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S45.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S45.B; immutable candidate identity before final receipts.
- Obligation/condition: [X45.3](conditions.md). Timeout an unresolved provider operation: cancellation does not claim rollback or release uncertainty for retry. Reject invalid budgets/counts, and a stale timer cannot revive a terminal run.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

The user approved S45 after S44 merged. This slice owns PostgreSQL timing and retry policy for the existing bounded worker profile.
