# S33 — Save and reopen a draft without losing edits or overwriting someone else’s changes.

Plan revision EXT1-r2. Status **approved-for-execution**. See the [execution receipt](S33-execution.md).
Phase: artifacts. Proposed branch: `codex/fbp-33-saved-graph-drafts`.
Order: S32 → S33 → S34.

## Story and boundaries

Save and reopen a draft without losing edits or overwriting someone else’s changes.

Implement approved SQLite draft repository with transactional compare-and-swap revisions, autosave debounce/flush, workspace-scoped identities and crash-safe reopen. Final driver is a D3 gate.

Contract: [artifacts.md](artifacts.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S32 merged and its proof handoff verified; D1 artifact schema; D2 packaging; D3 storage accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S33.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X33.1](conditions.md); Use SQLite saveDraft expectedRevision4 with valid authorized content → atomically advance to5; expectedRevision3 refuses DRAFT_CONFLICT/currentRevision4 and writes nothing. Reusing a completed transaction handle refuses.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S33.B — Implement the bounded feature

- Allowed: packages/artifacts/src/store/**; packages/editor/src/documents/**; fixtures/next-consumer/**; artifact package manifests/lock; database test harness.
- Prerequisite: S33.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Implement approved SQLite draft repository with transactional compare-and-swap revisions, autosave debounce/flush, workspace-scoped identities and crash-safe reopen. Final driver is a D3 gate.
- Condition: [X33.2](conditions.md). Save revision 4, reopen after process exit and obtain identical semantic/layout content. Concurrent saves based on revision 4 yield one revision 5 and one DRAFT_CONFLICT containing current revision, never last-write-wins.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S33.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S33.B; immutable candidate identity before final receipts.
- Obligation/condition: [X33.3](conditions.md). Kill between SQL mutation and commit: reopen yields complete old or complete new draft, never a partial graph. A different workspace cannot read/update it and failed autosave remains visibly dirty.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

The user authorized S33 after PR #50 merged. The execution receipt records the pinned native SQLite driver and transaction boundary. The editor UX/UI cleanup is queued after this slice.
