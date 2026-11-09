# S46 — Recover asynchronous fan-out and merge without losing packets.

Plan revision EXT1-r2. Status **approved-for-execution**. See the [execution receipt](S46-execution.md).
Phase: durable. Proposed branch: `codex/fbp-46-durable-routing`.
Order: S45 → S46 → S47.

## Story and boundaries

Recover asynchronous fan-out and merge without losing packets.

Implement versioned durable broadcast/map/filter/merge adapters, transactional deliveries and per-edge FIFO sequence admission, persisted capacity/backpressure and bounded batch materialization.

Contract: [durable-contract.md](durable-contract.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S45 merged and its proof handoff verified; D1 pinned artifacts; D3 PostgreSQL; D4 shared kernel/provider safety accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S46.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X46.1](conditions.md); Persist one edge sequence with packet P and immediate parents → identical duplicate delivery cannot create another logical admission; invalid target/contract/sequence refuses atomically and leaves source unacknowledged.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S46.B — Implement the bounded feature

- Allowed: packages/durable/src/operators/**; packages/durable/src/delivery/**; packages/durable/src/postgres/**; migrations.
- Prerequisite: S46.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Implement versioned durable broadcast/map/filter/merge adapters, transactional deliveries and per-edge FIFO sequence admission, persisted capacity/backpressure and bounded batch materialization.
- Condition: [X46.2](conditions.md). Fork three jobs to two branches and kill after one branch commit: restart retains completed results, finishes remaining work and emits expected merge packets once with correct parents.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S46.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S46.B; immutable candidate identity before final receipts.
- Obligation/condition: [X46.3](conditions.md). Redeliver a packet or fill a downstream edge: no duplicate process admission, bounded persisted outstanding work and no silent drop; a failed branch obeys first-terminal policy and cannot revive siblings.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

The user approved S46 after PR #64 merged green. This slice uses versioned built-in operators and transactional bounded fan-out. S47 owns persisted keyed joins.
