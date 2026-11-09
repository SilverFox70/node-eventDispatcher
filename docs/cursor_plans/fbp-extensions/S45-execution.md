# S45 — Durable time policy

PR #63 merged to master at `2e69a224c65a3426bd236975edd493577a583ee5` after all five CI checks passed. The user requested S45. Migration 006 adds optional database-time workflow deadlines, earliest start and terminal state to existing runs.

- X45.1. PostgreSQL persists scheduling and the prior lease epoch. Fixtures reject invalid time and retry limits and reject node policies that exceed the flow budget before work starts. Crash takeover and planned retry use the same claim count.
- X45.2. The first worker schedules one eligible retry and stops. A new store and worker cannot claim it before it is due. The fixture moves the database due time to the present, runs one attempt, and verifies exhaustion is terminal. The worker uses the database's remaining budget and the store fences late commits.
- X45.3. A provider intent crosses the deadline. Recovery preserves it as uncertain, the late result cannot advance the workflow, and a second invocation is refused. Cancellation and stale retries cannot change an existing terminal state.

Timing is optional for older submissions. In-process code only reports retry evidence for a settled failure code in the pinned allowlist. An interrupted attempt with no remaining allowance stays held. This slice handles the existing bounded pure profile and the S43 provider ledger. See the [package guide](../../../packages/durable/README.md#persist-workflow-time-and-retry-policy). S46 owns durable routing.

Local verification passed with repository build, type and lint checks, all 311 core tests and per-file coverage, all 23 PostgreSQL tests and coverage, the installed PostgreSQL suite, durable profile tests and guidance checks.
