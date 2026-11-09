# S49 execution preflight

PR #67 passed the PostgreSQL and Next.js consumer jobs and verification on macOS, Linux and Windows. GitHub squash-merged it at `5f8d1d046aceb7f81bbddc53f26aac3ed46ca37d`. The S49 branch starts at that commit. See the [S48 verification receipt](S48-execution.md).

The user approved this query, cursor and operator-command design and authorized publication after the reconnect, progress, authorization and stale-command tests passed.

## Snapshot and cursor

Expose a server-only `queryRun(scope, request, authorize)` adapter. The application supplies the authenticated actor and a workspace/run-scoped authorization callback. Check authorization before the scoped database read. Unauthorized, nonexistent and other-workspace targets have the same public not-found response. Do not read application payloads for this query.

Read the summary and requested page within one read-only repeatable-read transaction. Return run ID, durable lifecycle status, job ID, immutable graph revision and execution/adapter digests, safe timing fields, and a bounded step page. Each step carries its node ID, generation/step ID, attempt count, durable stage and safe failure or wait code. A provider step can show a safe operation ID, uncertainty state and resolution revision. Keep payloads, actor details, provider evidence and resource keys outside the response. Use the graph origin map from the exact pinned artifact to map runtime node IDs to editor nodes. When the artifact is unavailable, show persisted node IDs with an explicit unavailable version.

Default to 50 rows and cap at 100. Order by the immutable step creation timestamp and ID. Encode the sort key and run ID in a validated opaque page cursor. Reapply scope and authorization for every page. A cursor requests a page of the current projection and does not promise event history or a historical read. Return a digest of each safe page and summary as its read version. A reconnect or invalidated cursor triggers a fresh snapshot, never an inferred event replay.

## Reconnect and operator actions

The Next.js server keeps the database store and authorization callbacks on the server. The browser uses a bounded read poll while viewing a run and refreshes immediately when the connection recovers. Abort obsolete requests when the selected run changes. Keep the last successful snapshot during a disconnect and label it as stale. Render connection health separately from run and step status. Refresh and reconnect use read endpoints only.

- Cancel uses a separately authorized command and checks the displayed run lifecycle revision under the run lock. Derive this revision from run identity and persisted lifecycle state, including terminal transition time. Step-page changes do not invalidate a lifecycle-only command. A stale revision returns an explicit conflict without changing the run.
- Signal uses the existing S48 command with the displayed wait generation and expected wait revision. A wait row supplies identifiers and its signal name. The application still binds the actor and validates authorization.
- Resolve uses the S44 reconciliation command and its existing operation revision, authorization and evidence checks. The browser cannot submit provider evidence as a substitute for the trusted adapter. Retrying a held provider invocation remains governed by the existing recovery policy.
- Show a retry hold and available policy information. This slice adds no new permission to replay interrupted work or reset its attempt budget. Refresh after a command result or conflict.

## Acceptance fixtures

Use the installed Next.js consumer against real PostgreSQL and a controlled provider fixture. The routed wait example and the linear provider example use separate pinned profiles because the delivered runtime fences provider continuation out of routed graphs. The browser can switch between them.

- X49.1 verifies pinned revision, bounded pages, stable sort, safe metadata, authorization, and same public response for a missing or other-workspace run.
- X49.2 disconnects the browser after observing an active obligation, restarts the worker, and reconnects without reloading or staging a new run. Assert a persisted wait becomes successful and a provider uncertainty remains visible until authoritative resolution.
- X49.3 races stale cancel/resolve requests and verifies no repeat provider mutation. Verify disconnect preserves the last known durable status and that cross-workspace reads and commands reveal no run or payload.

## Implementation and proof

The PostgreSQL adapter exposes `queryRun` and lifecycle-checked `cancelProgress`. The editor exports the browser-only `DurableRunInspector`. The Next.js fixture mounts it alongside the existing inspector and keeps the PostgreSQL and trusted provider adapters on the server. It supplies known run IDs and a fixture operator cookie. Application hosts supply their own authorized run discovery and authentication.

- X49.1 passed against PostgreSQL. The query returned bounded, repeatable-read pages without payloads, preserved pinned revisions, and concealed missing, unauthorized and cross-workspace targets. Invalid and cross-run cursors refused.
- X49.2 passed in installed Chromium. The browser observed a committed wait, disconnected, then the worker was killed. A replacement continued after the authorized signal. The same browser document converged to completed without issuing a command on reconnect. The separate provider run displayed persisted uncertainty and completed after an authoritative lookup.
- X49.3 passed at the SQL and installed HTTP boundaries. Concurrent cancellations advanced once. Stale and unauthorized commands refused, the provider recorded one mutation and one successful lookup, and connection loss preserved the last durable state. Separate browser response fixtures exercised cursor reset and action/failure feedback.

`npm run check` passed. `npm run test:postgres` passed 40 tests, per-file coverage and the installed package. The production Next run passed all 56 tests. The first Next coverage pass found missing feedback branches. The expanded durable Chromium case passed against the same installed build and the combined fixture coverage passed the per-file 95% gate. Logs are in `/tmp/s49-check.log`, `/tmp/s49-pg-exact.log`, `/tmp/s49-next-final.log`, `/tmp/s49-focus-final.log` and `/tmp/s49-coverage-final.log`. The composed browser fixture stays together to share the database, provider and browser lifecycle. The Next CI job now provides a disposable PostgreSQL service.
