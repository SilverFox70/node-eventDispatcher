# S32 — Represent editable documents and immutable content identities consistently.

Plan revision EXT1-r2. Status **blocked-on-decision**; execution approval **none**.
Phase: artifacts. Proposed branch: `codex/fbp-32-graph-document-identities`.
Order: S31 → S32 → S33.

## Story and boundaries

Represent editable documents and immutable content identities consistently.

Implement versioned document/layout/registry-lock/fixture schemas and canonical semantic SHA256 rules, with deterministic serialization and strict size limits.

Contract: [artifacts.md](artifacts.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S31 merged and its proof handoff verified; D1 artifact schema; D2 packaging; D3 storage accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S32.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X32.1](conditions.md); Canonicalize graph objects with reordered keys and identical arrays → identical tagged UTF-8 bytes/hash; negative zero follows explicit normalization and arrays preserve order. Reject NaN/Infinity/unsupported values and conflicting registry meanings.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S32.B — Implement the bounded feature

- Allowed: packages/artifacts/src/model/**; packages/artifacts/src/canonical/**; src/model/** only approved shared JSON primitives; public artifact exports.
- Prerequisite: S32.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Implement versioned document/layout/registry-lock/fixture schemas and canonical semantic SHA256 rules, with deterministic serialization and strict size limits.
- Condition: [X32.2](conditions.md). Hash equivalent object-key orders equally; moving a node changes layout hash only; changing config, edge or implementation digest changes semantic release content. Existing GraphSpec remains independently compilable.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S32.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S32.B; immutable candidate identity before final receipts.
- Obligation/condition: [X32.3](conditions.md). Pass nonfinite values, duplicate node IDs, unknown formats or mismatched contract meanings: deterministic refusal before persistence/code loading; object property order never changes behavior.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

No task is approved for execution. G1–G7 implementation readiness is blocked by the named decisions and predecessor evidence; revalidate at handoff rather than treating future commands as delivered.
