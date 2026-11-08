# S36 — Export a graph as readable TypeScript that another project can build and run.

Plan revision EXT1-r2. Status **approved-for-execution**; see the [execution receipt](S36-execution.md).
Phase: artifacts. Proposed branch: `codex/fbp-36-readable-typescript-export`.
Order: S35 → S36 → S37.

## Story and boundaries

Export a graph as readable TypeScript that another project can build and run.

Generate deterministic formatted TypeScript using a trusted static module/export binding manifest and ordinary builder calls, plus portable JSON and generated-file ownership hashes. Never serialize closures or credentials.

Contract: [artifacts.md](artifacts.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S35 merged and its proof handoff verified; D1 artifact schema; D2 packaging; D3 storage accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S36.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X36.1](conditions.md); Resolve static binding ID to an allowlisted package export → emit ordinary escaped literal/config builder syntax; metadata-supplied import path, path traversal and missing binding refuse before filesystem writes.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S36.B — Implement the bounded feature

- Allowed: packages/artifacts/src/typescript/**; packages/editor/src/documents/**; scripts/** packed acceptance; docs/node-authoring.md; templates/**.
- Prerequisite: S36.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Generate deterministic formatted TypeScript using a trusted static module/export binding manifest and ordinary builder calls, plus portable JSON and generated-file ownership hashes. Never serialize closures or credentials.
- Condition: [X36.2](conditions.md). Export split→async branches→join, typecheck/build in clean CJS/ESM consumers and run matching fixtures through the production runtime; output clearly names nodes/config/ports and maps errors to original IDs.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S36.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S36.B; immutable candidate identity before final receipts.
- Obligation/condition: [X36.3](conditions.md). Use malicious titles/import strings or an edited generated file: emitted data stays data, untrusted import paths are refused, and overwrite fails with EXPORT_CONFLICT; unrelated handwritten code is never rewritten.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

The user approved S36.A–C after PR #54 merged with green CI. The server-only artifact package consumes the S35 bundle and host trust contract. Export previews in memory or writes into a fresh directory; this slice does not change revision storage.
