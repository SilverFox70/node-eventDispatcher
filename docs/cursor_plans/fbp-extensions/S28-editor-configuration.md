# S28 — Configure a node and see authoritative errors on its actual fields and ports.

Plan revision EXT1-r2. Status **blocked-on-decision**; execution approval **none**.
Phase: editor. Proposed branch: `codex/fbp-28-editor-configuration`.
Order: S27 → S28 → S29.

## Story and boundaries

Configure a node and see authoritative errors on its actual fields and ports.

Implement safe schema-driven configuration fields and backend validation adapter. Preserve unsupported-schema refusal; show pending/stale verdict state and useful node purpose/config summaries.

Contract: [editor.md](editor.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S27 merged and its proof handoff verified; D1 model compatibility; D2 package/canvas compatibility accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S28.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X28.1](conditions.md); Use number/enum/optional-object config schema and unsupported schema fixture → render supported labeled controls, preserve explicit values, and show unsupported-schema refusal. Never coerce a string into a backend number.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S28.B — Implement the bounded feature

- Allowed: packages/editor/src/configuration/**; packages/editor/src/validation/**; fixtures/next-consumer/app/api/**; fixtures/next-consumer/lib/**.
- Prerequisite: S28.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Implement safe schema-driven configuration fields and backend validation adapter. Preserve unsupported-schema refusal; show pending/stale verdict state and useful node purpose/config summaries.
- Condition: [X28.2](conditions.md). Edit valid configuration and request validation: server verdict matches compiler path and the selected node shows the sanitized field issue for invalid input; no browser schema claim substitutes for backend evaluation.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S28.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S28.B; immutable candidate identity before final receipts.
- Obligation/condition: [X28.3](conditions.md). Deliver slow verdict A after newer edit B: A cannot enable Run or overwrite B errors; hidden/unknown config properties and fields reserved for host-only service bindings are rejected, not silently stripped.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

No task is approved for execution. G1–G7 implementation readiness is blocked by the named decisions and predecessor evidence; revalidate at handoff rather than treating future commands as delivered.
