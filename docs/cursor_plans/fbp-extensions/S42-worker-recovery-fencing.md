# S42 — Recover abandoned work without accepting stale worker results.

Plan revision EXT1-r2. Status **approved-for-execution**. See the [execution receipt](S42-execution.md).
Phase: durable. Proposed branch: `codex/fbp-42-worker-recovery-fencing`.
Order: S41 → S42 → S43.

## Story and boundaries

Recover abandoned work without accepting stale worker results.

Implement DB-time leases, monotonically increasing claim epochs, heartbeat/claim CAS, bounded sweeps, worker shutdown and resource cleanup. Claim fairness uses explicit createdAt/id order.

Contract: [durable-contract.md](durable-contract.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S41 merged and its proof handoff verified; D1 pinned artifacts; D3 PostgreSQL; D4 shared kernel/provider safety accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S42.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X42.1](conditions.md); Claim due step at epoch1 using DB time → heartbeat only extends current epoch; heartbeat at old epoch after takeover returns STALE_CLAIM and cannot extend new lease. Future notBefore step remains unclaimed.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S42.B — Implement the bounded feature

- Allowed: packages/durable/src/workers/**; packages/durable/src/postgres/**; durable process/DB test harness; runbooks.
- Prerequisite: S42.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Implement DB-time leases, monotonically increasing claim epochs, heartbeat/claim CAS, bounded sweeps, worker shutdown and resource cleanup. Claim fairness uses explicit createdAt/id order.
- Condition: [X42.2](conditions.md). Pause worker A beyond lease, claim with B, then release A: only B epoch can commit; A completion is STALE_CLAIM and causes no successor. Kill notification receiver: periodic sweep still progresses.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S42.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S42.B; immutable candidate identity before final receipts.
- Obligation/condition: [X42.3](conditions.md). Run two real OS worker processes against one database: one owns each claim; restart with a queue backlog stays bounded. Eligible compute may repeat but logical completion is unique.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

The user approved proceeding with S42 after S41. The worker handles reviewed pure work scoped to an authorized run. Provider calls and durable timing policy remain in their assigned later slices.
