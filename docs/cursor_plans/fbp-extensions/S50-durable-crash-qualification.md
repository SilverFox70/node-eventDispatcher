# S50 — Prove the composed host survives adversarial failures instead of relying on unit claims.

Plan revision EXT1-r3. Status **approved-for-execution**. See the [approved matrix and execution receipt](S50-execution.md).
Phase: durable. Proposed branch: `codex/fbp-50-durable-crash-qualification`.
Order: S49 → S50 → S51.

## Story and boundaries

Prove the composed host survives adversarial failures instead of relying on unit claims.

Compose real PostgreSQL, two OS workers and a controllable HTTP provider; inject crashes at every owned transaction/call boundary and run deterministic recovery/concurrency suites with invariant receipts.

Contract: [durable-contract.md](durable-contract.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S49 merged and its proof handoff verified; D1 pinned artifacts; D3 PostgreSQL; D4 shared kernel/provider safety accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S50.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X50.1](conditions.md); Validate crash-fixture manifest with explicit barrier labels, pinned versions, seed and effect ledger → every case reaches intended owned boundary; missing provider-accepted barrier or untracked worker makes qualification incomplete, never green.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S50.B — Implement the bounded feature

- Allowed: packages/durable/test/**; fixtures/durable-provider/**; scripts/** durable qualification; docs/cursor_plans/fbp-extensions/** execution evidence only.
- Prerequisite: S50.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Compose real PostgreSQL, two OS workers and a controllable HTTP provider; inject crashes at every owned transaction/call boundary and run deterministic recovery/concurrency suites with invariant receipts.
- Condition: [X50.2](conditions.md). Run domain mutation→sync→conditional verification→projection refresh with repeated wakes and crashes: committed obligation is never lost, stale revisions never overwrite current, independent resources progress, uncertain calls remain held.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S50.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S50.B; immutable candidate identity before final receipts.
- Obligation/condition: [X50.3](conditions.md). Exercise provider success/result-loss, delayed old worker, database rollback/unavailability, version mismatch, duplicate signals and join completion replay: count actual effects and prove no unsupported exactly-once claim; terminate all owned resources.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

The user approved S50.A–C and authorized publication after the crash matrix passed. The execution receipt records predecessor evidence and the qualified boundaries.
