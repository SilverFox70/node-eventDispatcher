# Update a person and stage its workflow

The example's `stagePersonUpdate` function uses a transaction supplied by the server host. It stages the obligation and increments the person's revision using an expected revision check. An identical submission returns the original run without updating the person again. A stale person revision rolls back the staged obligation.

The [PostgreSQL package guide](../../packages/durable/README.md#stage-a-workflow-in-the-business-transaction) shows how to open the store and submit. Run the real database suite with `npm run test:postgres` to see this example exercise commit, rollback, replay and a competing submission.
