# S25 — Give registered node definitions typed per-instance configuration that the backend validates.

Plan revision EXT1-r2. Status **blocked-on-decision**; execution approval **none**.
Phase: editor. Proposed branch: `codex/fbp-25-configured-graph-contract`.
Order: S24F → S25 → S26.

## Story and boundaries

Give registered node definitions typed per-instance configuration that the backend validates.

Implement reviewed GraphSpec/Catalog v2 and defineConfiguredComponent alongside v1; fixed port contracts, immutable validated configuration and complete builder/compiler/runtime/testing metadata integration.

Contract: [CG2-r1](contracts/configuration-v2.md), [editor.md](editor.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S24F merged and its proof handoff verified; D1 model compatibility; D2 package/canvas compatibility accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

Before execution: review the application-proof checkpoint in explainability.md; if gains are not demonstrated, record a bounded roadmap decision before editor implementation.

## Tasks

### S25.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X25.1](conditions.md); Submit v1 unconfigured graph and v2 configured graph with factor2 → accepted by authoritative shape/config validation; v1 with config, v2 missing required config, factor string and unknown version refuse before factories.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S25.B — Implement the bounded feature

- Allowed: src/model/**; src/component.ts; src/builder.ts; src/graph.ts; src/runtime/**; src/runtime.ts; src/testing/**; src/inspection/**; public export barrels.
- Prerequisite: S25.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Implement reviewed GraphSpec/Catalog v2 and defineConfiguredComponent alongside v1; fixed port contracts, immutable validated configuration and complete builder/compiler/runtime/testing metadata integration.
- Condition: [X25.2](conditions.md). Compile two instances of one configured component with distinct valid values: each factory receives its own frozen config once. V1 components and their installed declarations still work.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S25.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S25.B; immutable candidate identity before final receipts.
- Obligation/condition: [X25.3](conditions.md). Submit invalid config through raw JSON and a stale catalog: backend refuses before either factory or dependency effect; no cast, fallback default or browser-only validation accepts it.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

No task is approved for execution. G1–G7 implementation readiness is blocked by the named decisions and predecessor evidence; revalidate at handoff rather than treating future commands as delivered.
