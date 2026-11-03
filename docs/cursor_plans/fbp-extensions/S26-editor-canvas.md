# S26 — Install a usable palette and canvas alongside a Next application.

Plan revision EXT1-r2. Status **blocked-on-decision**; execution approval **none**.
Phase: editor. Proposed branch: `codex/fbp-26-editor-canvas`.
Order: S25 → S26 → S27.

## Story and boundaries

Install a usable palette and canvas alongside a Next application.

Create the optional editor package/client entry with catalog palette, typed port cards, viewport, selection and keyboard/text alternative; use React Flow only for presentation/interaction.

Contract: [editor.md](editor.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S25 merged and its proof handoff verified; D1 model compatibility; D2 package/canvas compatibility accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

Consumption contract: [local workspace](local-workspace.md). Also prove the local npm workspace editor/core path with one intended core instance and clean client/server isolation; retain isolated packed acceptance.

## Tasks

### S26.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X26.1](conditions.md); Inspect isolated editor package exports and production client imports → browser entry resolves model/UI only; importing client entry never resolves Node runtime/SQL/service bindings. Core-only tarball has no editor dependency.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S26.B — Implement the bounded feature

- Allowed: packages/editor/**; fixtures/next-consumer/**; scripts/build.mjs; scripts/test-next.mjs; package.json; package-lock.json.
- Prerequisite: S26.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Create the optional editor package/client entry with catalog palette, typed port cards, viewport, selection and keyboard/text alternative; use React Flow only for presentation/interaction.
- Condition: [X26.2](conditions.md). Install core and editor tarballs in an isolated Next consumer: add a registered node by pointer and keyboard, select it, inspect port descriptions, and render without hydration or server-import errors.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S26.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S26.B; immutable candidate identity before final receipts.
- Obligation/condition: [X26.3](conditions.md). Load malicious title text and an unavailable component descriptor: render text safely and mark unavailable; no handler/service code enters browser assets and opening the canvas invokes no factories.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

No task is approved for execution. G1–G7 implementation readiness is blocked by the named decisions and predecessor evidence; revalidate at handoff rather than treating future commands as delivered.
