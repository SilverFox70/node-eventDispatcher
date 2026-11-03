# S30 — Follow real packet transfers and relationships while testing a graph.

Plan revision EXT1-r2. Status **blocked-on-decision**; execution approval **none**.
Phase: editor. Proposed branch: `codex/fbp-30-editor-live-debug`.
Order: S29 → S30 → S31.

## Story and boundaries

Follow real packet transfers and relationships while testing a graph.

Bind node/edge activity, operation state, scoped diagnostics, selectable stage output and bounded timeline to live run identity; preserve defined/publisher/subscription distinctions and pause-display semantics.

Contract: [editor.md](editor.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S29 merged and its proof handoff verified; D1 model compatibility; D2 package/canvas compatibility accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S30.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X30.1](conditions.md); Feed debug adapter actual received/sent events plus scheduling intent and a sequence gap → animate only actual transfers and show gap/uncaptured markers; selecting job A never displays job B payload.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S30.B — Implement the bounded feature

- Allowed: packages/editor/src/debug/**; packages/editor/src/canvas/**; fixtures/next-consumer/**.
- Prerequisite: S30.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Bind node/edge activity, operation state, scoped diagnostics, selectable stage output and bounded timeline to live run identity; preserve defined/publisher/subscription distinctions and pause-display semantics.
- Condition: [X30.2](conditions.md). Delay one async branch: the other branch lights on actual delivery, join remains waiting, then emits once; selecting a node shows its own input/output by job while the final stage remains selectable.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S30.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S30.B; immutable candidate identity before final receipts.
- Obligation/condition: [X30.3](conditions.md). Disconnect/reconnect live delivery and remove a publisher: display reconciles from current snapshot without reload; missing history is marked, no replayed animation is asserted to be fresh execution.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

No task is approved for execution. G1–G7 implementation readiness is blocked by the named decisions and predecessor evidence; revalidate at handoff rather than treating future commands as delivered.
