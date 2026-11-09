# S41 — Retain a finished step and its next work atomically.

Plan revision EXT1-r2. Status **approved-for-execution**. See the [execution receipt](S41-execution.md).
Phase: durable. Proposed branch: `codex/fbp-41-atomic-step-continuations`.
Order: S40 → S41 → S42.

## Story and boundaries

Retain a finished step and its next work atomically.

Persist immutable step outcomes, packets/parents, successor readiness and notification outbox in a single transaction with unique commit keys; notification delivery is advisory and repeatable.

Contract: [durable-contract.md](durable-contract.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S40 merged and its proof handoff verified; D1 pinned artifacts; D3 PostgreSQL; D4 shared kernel/provider safety accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S41.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X41.1](conditions.md); Apply a validated outcome with matching step epoch and unique commit key → outcome/packets/readiness/outbox are one transaction; duplicate identical commit returns same result and conflicting result cannot overwrite it.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S41.B — Implement the bounded feature

- Allowed: packages/durable/src/steps/**; packages/durable/src/postgres/**; packages/durable/migrations/**; shared task-kernel adapters.
- Prerequisite: S41.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Persist immutable step outcomes, packets/parents, successor readiness and notification outbox in a single transaction with unique commit keys; notification delivery is advisory and repeatable.
- Condition: [X41.2](conditions.md). Commit step A then kill before notification: restart sweep finds B ready and eventually completes; one committed outcome and one logical successor remain after duplicate notification.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S41.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S41.B; immutable candidate identity before final receipts.
- Obligation/condition: [X41.3](conditions.md). Crash before outcome transaction commits: neither outcome nor successor exists; wrong epoch cannot commit. Result schema failure creates a terminal failure, never a downstream success packet.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

The user approved proceeding with S41 after the S40 handoff. The scope is the bounded function profile and atomic persisted continuation. S42 owns production worker claims, lease recovery and epoch changes.
