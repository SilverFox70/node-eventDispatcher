# S44 — Resolve uncertain provider outcomes with evidence and an audit trail.

Plan revision EXT1-r2. Status **approved-for-execution**. See the [execution receipt](S44-execution.md).
Phase: durable. Proposed branch: `codex/fbp-44-reconciliation-resolution`.
Order: S43 → S44 → S45.

## Story and boundaries

Resolve uncertain provider outcomes with evidence and an audit trail.

Implement provider reconciliation adapters, inconclusive state, validated recovered results and authorized CAS manual resolution. Safe replay requires the exact evidence specified by the provider policy.

Contract: [durable-contract.md](durable-contract.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S43 merged and its proof handoff verified; D1 pinned artifacts; D3 PostgreSQL; D4 shared kernel/provider safety accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S44.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X44.1](conditions.md); Parse reconciliation evidence tied to exact operation/provider/resource/fingerprint → matching validated success admissible; wrong resource, malformed result and inconclusive absence never become succeeded or replayable.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S44.B — Implement the bounded feature

- Allowed: packages/durable/src/operations/**; packages/durable/src/reconciliation/**; packages/durable/src/commands/**; provider fixtures.
- Prerequisite: S44.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Implement provider reconciliation adapters, inconclusive state, validated recovered results and authorized CAS manual resolution. Safe replay requires the exact evidence specified by the provider policy.
- Condition: [X44.2](conditions.md). Reconciliation finds the original operation succeeded: attach validated outcome and continue once without new call. Inconclusive lookup stays blocked with explicit reason and next-review time.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S44.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S44.B; immutable candidate identity before final receipts.
- Obligation/condition: [X44.3](conditions.md). Return absent while a paused original worker might still invoke: no replay permit. Wrong actor/revision/resource evidence or duplicate resolution is refused/audited and produces zero calls or successor duplicates.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

The user approved S44 after PR #62 merged green. The supported policy attaches authoritative success and holds inconclusive evidence for review. A provider policy with independently verified safe replay evidence remains future work.
