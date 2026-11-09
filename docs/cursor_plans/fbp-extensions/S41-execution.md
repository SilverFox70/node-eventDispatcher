# S41 — Atomic step continuations

PR #59 merged to master at `3a4487b03f1de27d52e29d75206ba7c4349d686f` after all five required checks passed. The user requested proceeding with the next slice. The S40 submission and S39 pinned profile remain the prerequisites.

Migration 002 adds step, packet, outcome and wake outbox records. The adapter initializes ready work from the staged input and exact profile, then validates and commits one step on a checked-out PostgreSQL transaction. Unique keys cover logical readiness, step outcome and the run's commit key. Epoch comparison is enforced before replay or writes. Wake delivery is advisory.

- X41.1. A valid result is admitted using the actual pinned function contract and immediate-parent lineage. Its output packet, successor, outcome and wake are written atomically. The same command returns the same receipt. A conflicting result or reused key refuses and leaves all row counts unchanged.
- X41.2. A child process runs A with the shared task runtime, commits, and is killed before it sends a wake. A fresh store finds B through a database sweep and commits it. Two actual PostgreSQL notifications carry the same outcome ID while leaving a single B step.
- X41.3. A PostgreSQL trigger holds the outbox insert with an advisory lock after earlier writes. The test verifies the wait and kills the producer before commit. The database rolls back all new rows. A stale epoch and invalid lineage refuse before changes. A valid envelope with an invalid output payload records a terminal step failure and creates no success packet or successor.

The source and packed suites use disposable databases. The migration test stages a run in the S40 schema and initializes it after upgrading. This slice handles pure single-input and single-output function graphs. Production claims, lease recovery, and scan scheduling across runs belong to S42. See the [package guide](../../../packages/durable/README.md#commit-a-step-and-its-continuation).

Local verification passed with `npm run check`, `npm run test:postgres` (nine real database tests, installed migration and crash proof, and all coverage thresholds), `npm run test:durable`, focused core task-profile tests, guidance and diff checks.
