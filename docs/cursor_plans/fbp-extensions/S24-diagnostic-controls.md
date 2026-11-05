# S24 — Use node capture controls and inspect correlated inputs, outputs and errors in the installed demo.

Plan revision EXT1-r2. Status **complete-for-review**; user explicitly requested S24.A–C now. [UI24-r1 declaration/proof](S24-execution.md).
Phase: diagnostics. Proposed branch: `codex/fbp-24-diagnostic-controls`.
Order: S23 → S24 → S24A.

## Story and boundaries

Use node capture controls and inspect correlated inputs, outputs and errors in the installed demo.

Add per-node controls, capture status/expiry, bounded scrollable records and JSONL download to existing node dialogs; keep metadata-only defaults and automatic updates.

Contract: [diagnostics.md](diagnostics.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S23 merged and its proof handoff verified; D1 diagnostic policy accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S24.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X24.1](conditions.md); Mount the node dialog with payload capture off → show uncaptured reason and usable keyboard controls; enable inputs only → request names exact source/run/node/session epoch. An unrelated node receives no policy update.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S24.B — Implement the bounded feature

- Allowed: fixtures/next-consumer/app/**; fixtures/next-consumer/lib/**; templates/next/**; docs/nextjs.md; examples/README.md.
- Prerequisite: S24.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Add per-node controls, capture status/expiry, bounded scrollable records and JSONL download to existing node dialogs; keep metadata-only defaults and automatic updates.
- Condition: [X24.2](conditions.md). In production Next, enable one Pokémon branch only and run three jobs: its actual input/output are selectable by job, sibling payloads remain off, and backend errors appear with safe attribution.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S24.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S24.B; immutable candidate identity before final receipts.
- Obligation/condition: [X24.3](conditions.md). Navigate/reconnect/change source during a run: old source records never enter the selected source, listener counts return to baseline, and keyboard users can operate controls and dismiss the dialog.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

S24.A–C are authorized after verified S23/PR35 merge. UI24-r1 settles the owning local host/client declaration gate over DG1-r3; actual proof/gates are recorded separately from merge. No S24A or visual-authoring execution is authorized.
