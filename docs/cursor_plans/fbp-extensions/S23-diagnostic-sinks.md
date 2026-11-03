# S23 — Export bounded diagnostics without making logging a business dependency.

Plan revision EXT1-r2. Status **blocked-on-decision**; execution approval **none**.
Phase: diagnostics. Proposed branch: `codex/fbp-23-diagnostic-sinks`.
Order: S22 → S23 → S24.

## Story and boundaries

Export bounded diagnostics without making logging a business dependency.

Add bounded sink delivery, drop counters, explicit flush/dispose and JSONL export with a versioned redacted envelope. Sink errors are observer failures, never task retry signals.

Contract: [diagnostics.md](diagnostics.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S22 merged and its proof handoff verified; D1 diagnostic policy accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S23.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X23.1](conditions.md); Construct sink limit128 events/256KiB with one batch in flight → accept valid limits and reject zero/negative/unbounded settings before subscribing. JSONL schema round-trips retained event sequence and marks capture-gap metadata.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S23.B — Implement the bounded feature

- Allowed: src/diagnostics/**; src/model/diagnostics/**; src/runtime/diagnostics/**; public export barrels.
- Prerequisite: S23.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Add bounded sink delivery, drop counters, explicit flush/dispose and JSONL export with a versioned redacted envelope. Sink errors are observer failures, never task retry signals.
- Condition: [X23.2](conditions.md). Block a sink, emit beyond its event/byte ceiling, and release it: the run completes, bounded memory and exact drop counters are observable; exported retained records preserve sequence gaps.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S23.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S23.B; immutable candidate identity before final receipts.
- Obligation/condition: [X23.3](conditions.md). Reject a sink write and then dispose twice: business handler executes once, no unhandled rejection, no lingering scheduled delivery, and disposal is idempotent.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

No task is approved for execution. G1–G7 implementation readiness is blocked by the named decisions and predecessor evidence; revalidate at handoff rather than treating future commands as delivered.
