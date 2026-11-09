# S42 — Worker recovery and fencing

PR #60 merged to master at `a76dd0e5dc30fee3785df9070ece6d48863a2c56` after all five CI checks passed. The user requested the next slice. Migration 003 adds database-time due and lease fields, bounded claim allowances and owner/epoch fencing to the S41 step store.

- X42.1. PostgreSQL time gates the first claim and heartbeat. The fixture checks epoch 1, excludes a future row, extends the current lease and refuses an old epoch or mismatched owner. An expired claim at its budget limit stays held.
- X42.2. Two OS processes hold distinct claims. The test advances the first lease into the past through the database, lets a second process take it at epoch 2, and releases the old process. Its computation cannot commit an outcome or successor. The current owner can commit. Killing the PostgreSQL notification listener leaves the periodic sweep able to progress.
- X42.3. The surviving process sweeps a backlog in batches capped at two and completes all twelve unique logical steps. A separate fixture verifies heartbeat loss and shutdown stop local publishing. Shared invocation proves one execution attempt per lease even with an explicit retry allowance.

The worker uses the existing finite invocation kernel with retries removed from its one-attempt projection. The pinned graph's explicit retry allowance caps takeover claims. Default zero retries means an expired first claim is held. The worker polls a caller-authorized run. Migration defaults preexisting S41 rows to one claim. S43 owns external operation safety and S45 owns persisted time and retry scheduling. See the [package guide](../../../packages/durable/README.md#claim-and-recover-work).

Local verification passed with `npm run check`, all 13 PostgreSQL tests and per-file gates via `npm run test:postgres`, the same tests against the installed package, `npm run test:durable`, three focused core task-profile tests, and guidance and diff checks. The local PostgreSQL test container was disposable.
