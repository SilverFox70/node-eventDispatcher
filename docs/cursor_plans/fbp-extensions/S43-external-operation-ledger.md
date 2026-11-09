# S43 — Protect non-idempotent external calls across jobs and worker failures.

Plan revision EXT1-r2. Status **approved-for-execution**. See the [execution receipt](S43-execution.md).
Phase: durable. Proposed branch: `codex/fbp-43-external-operation-ledger`.
Order: S42 → S43 → S44.

## Story and boundaries

Protect non-idempotent external calls across jobs and worker failures.

Persist business operation key/fingerprint, per-resource revision slot and invocation intent before call. Enforce provider-policy-specific recovery; uncertain intent never automatically invokes again.

Contract: [durable-contract.md](durable-contract.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S42 merged and its proof handoff verified; D1 pinned artifacts; D3 PostgreSQL; D4 shared kernel/provider safety accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S43.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X43.1](conditions.md); Prepare operation businessKey K/fingerprint H/resource R/revision7 → same K/H returns existing identity, same K/different H refuses INPUT_CONFLICT, and job IDs cannot bypass resource ordering. No provider call occurs during preparation.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S43.B — Implement the bounded feature

- Allowed: packages/durable/src/operations/**; packages/durable/src/postgres/**; packages/durable/migrations/**; controlled HTTP provider test fixture.
- Prerequisite: S43.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Persist business operation key/fingerprint, per-resource revision slot and invocation intent before call. Enforce provider-policy-specific recovery; uncertain intent never automatically invokes again.
- Condition: [X43.2](conditions.md). Provider accepts request, worker dies before result commit: operation becomes uncertain, run waits, and a replacement worker makes zero new non-idempotent calls; provider count stays one.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S43.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S43.B; immutable candidate identity before final receipts.
- Obligation/condition: [X43.3](conditions.md). Submit different jobs for the same party revision plus a later revision: deduplicate same operation/fingerprint, reject mismatches and serialize resource revisions; an expired worker cannot authorize a fresh provider call.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

The user approved S43 after S42 merged. This slice implements the conservative reconciliation-required policy and its HTTP crash proof. S44 owns resolution and continuation.
