# S40 — PostgreSQL submission store

PR #58 merged to master at `d98025bb4a86c96eec46d312e857df689788fdc6` after Ubuntu, macOS, Windows and Next.js CI passed. The user approved S40 on that predecessor. D3 selects PostgreSQL and D4 requires atomic domain and obligation submission.

The optional package uses node-postgres 8.23.1 and PostgreSQL 18. Migration 001 creates the versioned schema and queued workflow row. The transaction owns one checked-out connection, restricts the callback to data queries and staging, and invalidates both capabilities at scope exit. A separate PostgreSQL CI service owns the real integration and coverage gate.

- X40.1. The integration reads the backend PID around domain and stage operations, observes no uncommitted row from another session, and rejects capabilities used after commit, rollback or from a different live transaction. Direct and stacked transaction-control SQL are refused.
- X40.2. The sample person revision and queued run commit together. Callback failure, stale person revision, a failed query caught by the caller, pending work and backend loss all leave no queued run. Repeating the original input returns the original run and leaves the person revision unchanged. The same job ID in a different workspace creates a distinct run.
- X40.3. The losing backend waits on the winning backend's uncommitted insert, verified with `pg_blocking_pids`. It sees the committed fingerprint and returns `INPUT_CONFLICT`. Exactly one run remains. No worker participates in submission.

The fingerprint includes the canonical input packet envelopes, revision ID and profile pin. The host supplies the authorized workspace and trusted revision pin. The database preserves JSON input as canonical text so payloads representable by core JSON, including escaped NUL characters, remain round-trippable. A migration fixture validates unsupported schema refusal. The integration uses a unique temporary database per run and drops it at cleanup.

See the [PostgreSQL package guide](../../../packages/durable/README.md#stage-a-workflow-in-the-business-transaction). S41 starts atomic step outcomes and successor readiness.

Local verification passed on PostgreSQL 18.6 with `npm run check`, `npm run test:postgres` (five tests, installed migration and runtime proof, and 100% reported coverage), `npm run test:durable`, guidance and diff checks. `npm audit --omit=dev` reported zero vulnerabilities.
