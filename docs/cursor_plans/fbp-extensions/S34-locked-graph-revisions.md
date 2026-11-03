# S34 — Lock an immutable tested graph revision and keep later edits separate.

Plan revision EXT1-r2. Status **blocked-on-decision**; execution approval **none**.
Phase: artifacts. Proposed branch: `codex/fbp-34-locked-graph-revisions`.
Order: S33 → S34 → S35.

## Story and boundaries

Lock an immutable tested graph revision and keep later edits separate.

Create immutable revision records pinned to semantic graph, registry/module digests, fixture receipt and policy versions; fork a new draft for edits and preserve actor/time provenance.

Contract: [artifacts.md](artifacts.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S33 merged and its proof handoff verified; D1 artifact schema; D2 packaging; D3 storage accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S34.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X34.1](conditions.md); Request lock using trusted persisted receipt for semantic H → accepted; forged client success flag or imported receipt without local trusted record refuses. Layout-only edits preserve H; config/fixture/profile changes invalidate the receipt.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S34.B — Implement the bounded feature

- Allowed: packages/artifacts/src/revisions/**; packages/artifacts/src/store/**; packages/editor/src/documents/**; fixtures/next-consumer/**.
- Prerequisite: S34.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Create immutable revision records pinned to semantic graph, registry/module digests, fixture receipt and policy versions; fork a new draft for edits and preserve actor/time provenance.
- Condition: [X34.2](conditions.md). Test content H, lock it with matching receipt, then edit the draft: locked H remains byte-for-byte unchanged and runnable under its pinned bindings; no test receipt is reused for changed content.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S34.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S34.B; immutable candidate identity before final receipts.
- Obligation/condition: [X34.3](conditions.md). Race lock requests and change a registry implementation under the same id/version: exactly one identical revision is retained, conflicting implementation or stale receipt is refused before execution.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

No task is approved for execution. G1–G7 implementation readiness is blocked by the named decisions and predecessor evidence; revalidate at handoff rather than treating future commands as delivered.
