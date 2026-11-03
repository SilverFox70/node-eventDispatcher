# S47 — Recover partially collated results and never reopen a completed join.

Plan revision EXT1-r2. Status **blocked-on-decision**; execution approval **none**.
Phase: durable. Proposed branch: `codex/fbp-47-durable-keyed-joins`.
Order: S46 → S47 → S48.

## Story and boundaries

Recover partially collated results and never reopen a completed join.

Persist keyed join partial slots, exact expected inputs, capacity and completion tombstones with transactional output. Preserve existing job/key semantics and 2–256 input bound.

Contract: [durable-contract.md](durable-contract.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S46 merged and its proof handoff verified; D1 pinned artifacts; D3 PostgreSQL; D4 shared kernel/provider safety accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S47.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X47.1](conditions.md); Create join with two named inputs and job/key identity → distinct slots; counts1/257 refuse and duplicate slot name refuses. Equal key in another job is a different group; immutable completion record is distinct from partial storage.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S47.B — Implement the bounded feature

- Allowed: packages/durable/src/operators/join/**; packages/durable/src/postgres/**; migrations; durable DB fixtures.
- Prerequisite: S47.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Persist keyed join partial slots, exact expected inputs, capacity and completion tombstones with transactional output. Preserve existing job/key semantics and 2–256 input bound.
- Condition: [X47.2](conditions.md). Store stats, crash before species, restart and receive species: exactly one collated result contains both correct parents. Different jobs with equal keys never mix.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S47.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S47.B; immutable candidate identity before final receipts.
- Obligation/condition: [X47.3](conditions.md). Redeliver a filled slot or address a completed group: explicit refusal, no overwrite/reopen/second output; overflow and terminal incomplete groups produce documented failure and cleanup without deleting anti-reuse evidence.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

No task is approved for execution. G1–G7 implementation readiness is blocked by the named decisions and predecessor evidence; revalidate at handoff rather than treating future commands as delivered.
