# S31 — Build, wire and test a meaningful flow in a fresh installed Next project.

Plan revision EXT1-r2. Status **blocked-on-decision**; execution approval **none**.
Phase: editor. Proposed branch: `codex/fbp-31-editor-installed-acceptance`.
Order: S30 → S31 → S32.

## Story and boundaries

Build, wire and test a meaningful flow in a fresh installed Next project.

Ship authoring demo, human/agent node recipe, explicit service injection and acceptance covering the complete editing/test/debug path, root dependency isolation and accessible operation.

Ship a skippable, reopenable first-run walkthrough in the installed demo. Use a separate sample draft to add two nodes, move one, connect them, configure a node, run fixture inputs, inspect intermediate and final output, and undo an edit. Include keyboard steps and a visible explanation of session-only drafts.

Contract: [editor.md](editor.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S30 merged and its proof handoff verified; D1 model compatibility; D2 package/canvas compatibility accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S31.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X31.1](conditions.md); Install editor and core in a fresh production Next project using documented public imports → palette/config/test/debug routes build; clean core-only project resolves no optional canvas/SQL modules. No private source-path import is required.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S31.B — Implement the bounded feature

- Allowed: packages/editor/**; templates/next/**; fixtures/next-consumer/**; scripts/** acceptance only; docs/nextjs.md; examples/**; README.md.
- Prerequisite: S31.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Ship authoring demo, human/agent node recipe, explicit service injection and acceptance covering the complete editing/test/debug path, root dependency isolation and accessible operation.
- Condition: [X31.2](conditions.md). From installed tarballs create a configured enrichment flow, reject a bad edge, run fixture loads, inspect intermediate and final data, undo/redo and close the editor without reload or leaked runs.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S31.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S31.B; immutable candidate identity before final receipts.
- Obligation/condition: [X31.3](conditions.md). Attempt draft persistence/export before their owning features exist: UI labels session-only state honestly and does not imply recovery or generated code. Core-only consumer installs without editor dependencies.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

No task is approved for execution. G1–G7 implementation readiness is blocked by the named decisions and predecessor evidence; revalidate at handoff rather than treating future commands as delivered.
