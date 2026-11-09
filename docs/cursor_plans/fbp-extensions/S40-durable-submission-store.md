# S40 — Commit business state and the obligation to run together.

Plan revision EXT1-r2. Status **approved-for-execution**. See the [execution receipt](S40-execution.md).
Phase: durable. Proposed branch: `codex/fbp-40-durable-submission-store`.
Order: S39 → S40 → S41.

## Story and boundaries

Commit business state and the obligation to run together.

Implement approved PostgreSQL schema/migrations, transaction-bound submission and input fingerprints. Provide a same-connection transaction capability and concrete example domain mutation; no pretend ambient transaction.

Contract: [durable-contract.md](durable-contract.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S39 merged and its proof handoff verified; D1 pinned artifacts; D3 PostgreSQL; D4 shared kernel/provider safety accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S40.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X40.1](conditions.md); Open one host PostgreSQL transaction capability → stage uses exactly its connection; call after commit/rollback or pass another-connection capability → refusal and no durable row. Workspace/job/fingerprint keys remain distinct.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S40.B — Implement the bounded feature

- Allowed: packages/durable/src/postgres/**; packages/durable/src/submission/**; packages/durable/migrations/**; durable DB harness; examples/durable/**.
- Prerequisite: S40.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Implement approved PostgreSQL schema/migrations, transaction-bound submission and input fingerprints. Provide a same-connection transaction capability and concrete example domain mutation; no pretend ambient transaction.
- Condition: [X40.2](conditions.md). Within one transaction update a sample person revision and stage an obligation; commit produces both. Throw after staging: neither mutation nor run exists. Duplicate same job/fingerprint returns the same run.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S40.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S40.B; immutable candidate identity before final receipts.
- Obligation/condition: [X40.3](conditions.md). Race conflicting submissions with one job ID: one run persists and other gets INPUT_CONFLICT; a different connection cannot masquerade as the domain transaction and no job starts before commit.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

The user approved S40.A–C after PR #58 merged with green CI. The PostgreSQL adapter owns migration, connection lifetime and submission. S41 owns persisted step outcomes and successors.
