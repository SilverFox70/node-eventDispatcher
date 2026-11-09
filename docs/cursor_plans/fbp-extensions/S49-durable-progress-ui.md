# S49 — Show recoverable workflow progress and safe operator actions in an app.

Plan revision EXT1-r3. Status **approved-for-execution**. See the [approved design and execution receipt](S49-execution.md).
Phase: durable. Proposed branch: `codex/fbp-49-durable-progress-ui`.
Order: S48 → S49 → S50.

## Story and boundaries

Show recoverable workflow progress and safe operator actions in an app.

Expose authorized persisted query/command adapters and bounded cursor updates, using graph origin maps and existing inspector/editor. Separate durable status from ephemeral diagnostics and transport connection state.

Contract: [durable-contract.md](durable-contract.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S48 merged and its proof handoff verified; D1 pinned artifacts; D3 PostgreSQL; D4 shared kernel/provider safety accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S49.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X49.1](conditions.md); Query authorized persisted run snapshot at cursor C → return graph/code revision, step/wait/uncertain state and bounded cursor; nonexistent/other workspace is concealed and diagnostic payload is not included by default.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S49.B — Implement the bounded feature

- Allowed: packages/durable/src/query/**; packages/durable/src/commands/**; packages/editor/src/durable/**; fixtures/next-consumer/**.
- Prerequisite: S49.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Expose authorized persisted query/command adapters and bounded cursor updates, using graph origin maps and existing inspector/editor. Separate durable status from ephemeral diagnostics and transport connection state.
- Condition: [X49.2](conditions.md). Start a multi-step obligation, disconnect browser, kill/restart worker, reconnect: UI converges to persisted state and shows waiting/uncertain/succeeded accurately without reload or a new submission.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S49.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S49.B; immutable candidate identity before final receipts.
- Obligation/condition: [X49.3](conditions.md). Repeat refresh/reconnect/cancel/resolve commands with stale revisions: zero repeated provider mutations and explicit conflicts; cross-workspace queries reveal no run/payload and disconnected is never labeled failed.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

The user approved S49.A–C. The execution receipt records predecessor merge evidence, scope and verification.
