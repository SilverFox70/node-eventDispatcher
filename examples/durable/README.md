# Update a person and stage its workflow

The example's `stagePersonUpdate` function uses a transaction supplied by the server host. It stages the obligation and increments the person's revision using an expected revision check. An identical submission returns the original run without updating the person again. A stale person revision rolls back the staged obligation.

The [PostgreSQL package guide](../../packages/durable/README.md#stage-a-workflow-in-the-business-transaction) shows how to open the store and submit. Run the real database suite with `npm run test:postgres` to see this example exercise commit, rollback, replay and a competing submission.

## Pause and approve an obligation

The `approval/` example stages an application request and a durable obligation in the same PostgreSQL transaction. It runs the worker until the review wait is saved, then stops the worker. A later invocation resolves the stored graph and handler pin and resumes the run using one approval.

Copy `approval/` into a host with compatible installs of `event-driven-design`, `event-driven-design-artifacts`, `event-driven-design-durable` and `zod`, or use those packages as npm workspace links. Set `FBP_APPROVAL_DATABASE_URL` to a disposable database, and configure `psql` with the same database through PostgreSQL connection settings.

```sh
node approval/migrate.mjs
psql -v ON_ERROR_STOP=1 -f approval/schema.sql
node approval/cli.mjs stage first-request
node approval/cli.mjs approve "$APPROVAL_RUN_ID"
```

Set `APPROVAL_RUN_ID` to the run ID printed by `stage`. Run `approve` again with the same ID to retrieve the same receipt and output. The CLI is a local operator fixture. An application authenticates the actor and authorizes each command on the server.

For restore and retention procedures, see the [durable host runbook](../../docs/runbooks/operate-durable-host.md).
