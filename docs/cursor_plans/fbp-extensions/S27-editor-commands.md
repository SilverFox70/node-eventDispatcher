# S27 — Wire, rearrange and undo graph edits without accidentally executing them.

Plan revision EXT1-r2. Status **approved-for-execution**. See the [execution receipt](S27-execution.md).
Phase: editor. Proposed branch: `codex/fbp-27-editor-commands`.
Order: S26 → S27 → S28.

## Story and boundaries

Wire, rearrange and undo graph edits without accidentally executing them.

Implement one document command reducer for add/remove/connect/disconnect/move/group/expose-port, copy/paste with fresh identities, undo/redo and dirty state; keep layout separate from graph semantics.

Contract: [editor.md](editor.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S26 merged and its proof handoff verified; D1 model compatibility; D2 package/canvas compatibility accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S27.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X27.1](conditions.md); Apply removeNode to a selected node with incident wire and exposed input → all three disappear in one command and one undo restores them exactly; stale expected revision refuses without modifying command history.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S27.B — Implement the bounded feature

- Allowed: packages/editor/src/document/**; packages/editor/src/canvas/**; packages/editor/src/model.ts and packages/editor/src/model/**. The existing client entry, card and styles wire the commands to the S26 canvas.
- Prerequisite: S27.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Implement one document command reducer for add/remove/connect/disconnect/move/group/expose-port, copy/paste with fresh identities, undo/redo and dirty state; keep layout separate from graph semantics.
- Condition: [X27.2](conditions.md). Create a two-node connection, undo, redo and move it: topology updates immediately, undo restores exact semantic content, and moving only changes layout hash.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S27.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S27.B; immutable candidate identity before final receipts.
- Obligation/condition: [X27.3](conditions.md). Try an incompatible port, duplicate ID, excessive capacity and cycle: invalid actions are refused with field/edge feedback and unchanged semantic state; copying nodes creates no identity collision or execution.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

The user approved S27.A–C after the S26 merge and requested the two-Alert browser regression.
