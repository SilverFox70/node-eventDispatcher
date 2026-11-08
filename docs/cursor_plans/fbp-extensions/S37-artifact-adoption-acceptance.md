# S37 — Take a visually authored graph into a separate project and maintain it there.

Plan revision EXT1-r2. Status **approved-for-execution**. See the [execution receipt](S37-execution.md).
Phase: artifacts. Proposed branch: `codex/fbp-37-artifact-adoption-acceptance`.
Order: S36 → S37 → S38.

## Story and boundaries

Take a visually authored graph into a separate project and maintain it there.

Ship the draft→test→lock→bundle/TS export→installed consumer journey, storage backup/restore and schema-version guide, and a runnable demonstration with no editor in production runtime.

Contract: [artifacts.md](artifacts.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S36 merged and its proof handoff verified; D1 artifact schema; D2 packaging; D3 storage accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

Consumption contract: [local workspace](local-workspace.md). Repeat exported TS/JSON acceptance with a local npm workspace runtime/registry; local implementation changes invalidate pinned digests/receipts.

## Tasks

### S37.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X37.1](conditions.md); Compare export manifest/receipt to installed runtime/registry versions → compatible graph validates; missing contract or implementation version refuses BINDING_MISMATCH without selecting latest or changing saved content.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S37.B — Implement the bounded feature

- Allowed: examples/**; templates/**; packages/artifacts/** acceptance only; packages/editor/** acceptance only; scripts/**; docs/**; README.md.
- Prerequisite: S37.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Ship the draft→test→lock→bundle/TS export→installed consumer journey, storage backup/restore and schema-version guide, and a runnable demonstration with no editor in production runtime.
- Condition: [X37.2](conditions.md). In a fresh project consume exported TS and JSON via pinned registry, run fixtures and compare output/contract failures to editor test receipts; production installation omits editor and authoring database.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S37.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S37.B; immutable candidate identity before final receipts.
- Obligation/condition: [X37.3](conditions.md). Restore saved graph storage into a fresh process and inspect locked history; missing registry versions fail clearly without silently selecting newer code or mutating an existing revision.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

The user approved S37.A–C after PR #55 merged with green CI. The acceptance uses the existing editor model, SQLite authoring store, portable bundle, and TypeScript export contracts.
