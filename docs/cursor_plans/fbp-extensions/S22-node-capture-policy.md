# S22 — Turn input/output capture on for a selected node and turn it off again safely.

Plan revision EXT1-r2. Status **complete-for-review**; user requested S22.A–C on2026-11-04. Exact declarations refined in [DG1-r2](contracts/diagnostics-v1.md#s22a-declaration-freeze--2026-11-04); [execution receipt](S22-execution.md).
Phase: diagnostics. Proposed branch: `codex/fbp-22-node-capture-policy`.
Order: S21 → S22 → S23.

## Story and boundaries

Turn input/output capture on for a selected node and turn it off again safely.

Resolve host ceilings, denies and requested per-node/per-port/job capture with session epochs, expiry and byte/event budgets. Capture only actual validated transfers, never queued intent.

Contract: [diagnostics.md](diagnostics.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S21 merged and its proof handoff verified; D1 diagnostic policy accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S22.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X22.1](conditions.md); Resolve input-only rule for node stats with host output deny → exact effective input-only policy; reject unknown node/port and expired-session update atomically with unchanged prior policy. No retrospective capture or restart.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S22.B — Implement the bounded feature

- Allowed: src/model/diagnostics/**; src/runtime/diagnostics/**; src/runtime/trace.ts; src/runtime.ts.
- Prerequisite: S22.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Resolve host ceilings, denies and requested per-node/per-port/job capture with session epochs, expiry and byte/event budgets. Capture only actual validated transfers, never queued intent.
- Condition: [X22.2](conditions.md). Enable input-only for stats/job-A: capture its next receive, never its output or job-B; after expiry, later inputs have metadata only. A deny from the host defeats a client enable request.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S22.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S22.B; immutable candidate identity before final receipts.
- Obligation/condition: [X22.3](conditions.md). Replace a diagnostic session while a request is in flight: old callbacks cannot populate the new session; truncation is explicit and ledger duplicate protection survives diagnostic eviction.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

S22.A–C are authorized by the explicit execution request; S21 merge verified. S22 readiness uses verified predecessor merge and the DG1-r2 declaration freeze; see the execution receipt for actual proof and gates. Later slices retain their own readiness gates.
