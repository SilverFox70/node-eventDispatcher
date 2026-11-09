# S43 — External operation ledger

PR #61 merged to master at `0f1b1d3e7e3be6fc718021ff50ba9a10d2d3c280` after all five CI checks passed. The user requested S43. Migration 004 adds resource locks, operation records, and links from steps.

- X43.1. A scoped business key and canonical request fingerprint resolve to one operation across jobs. Changing the request or reusing the resource revision with another key returns `INPUT_CONFLICT`. Registration makes zero provider calls.
- X43.2. A real HTTP server receives the request from a child process and withholds its response. PostgreSQL already holds the invocation intent. The test kills the child, expires its lease, and recovers the operation as uncertain. The replacement cannot dispatch and the provider count stays one. The ordinary worker cannot claim the held step.
- X43.3. Two claim holders compete to send the same operation and only one callback runs. The later resource revision waits until its predecessor succeeds. Expired claims cannot obtain a new permit or save a late response.

The explicit host adapter supports reconciliation-required operations. It executes outside the SQL transaction after the permit commits. The host validates the provider response. There is no automatic re-dispatch of uncertain intent. S44 owns provider evidence, resolution and downstream continuation. See the [package guide](../../../packages/durable/README.md#record-an-external-provider-call).

Local verification passed with repository build and type checks, final lint, all 16 PostgreSQL tests and coverage thresholds, the installed-package suite, durable profile tests, and guidance and diff checks.
