# S51 installed adoption preflight

PR #69 passed all five CI checks, including the S50 crash matrix, and squash-merged at `ff58b8016ae8f71832e4ff0752930523915e19b3`. The S51 branch starts there. See the [S50 verification receipt](S50-execution.md).

The user approved this retention, packaging and operational compatibility contract and authorized opening a PR once the adoption and recovery tests pass.

## Retention guard

Migration 010 adds one PostgreSQL trigger function that raises SQLSTATE `23514` with a stable `DURABLE_RETENTION_REQUIRED` message on DELETE or TRUNCATE of retained workflow runs, external operations, join completions, or signal inbox receipts. Protect all provider operation identities, including confirmed outcomes, because a retained business key still fences replay. Protect join completion markers for the lifetime of the run. Protect signal receipts while permitting the existing expiry path to clear payloads and update state. Existing run, operation and step state updates and terminal partial-slot cleanup continue through their current paths.

Install statement-level triggers so even a bulk operation cannot partially erase protected evidence. Migration 010 does not update historical data. Direct DDL and privileged recovery commands sit outside the application guard. Document separate migration-owner and runtime privileges, prohibit manual destructive DDL against a live namespace, and require a separate reviewed retirement policy before removing protected identities. Restoring to a new database is the supported backup drill. A stale restore must stay isolated until operators establish which effects could have happened after the recovery point.

## Installed example and workspace proof

Provide one small host example using public imports from core, artifacts and durable. Keep application graph and handler source with the host. Persist an immutable graph revision using the existing artifact format and supply a real code digest for the fixture handler. Stage a domain mutation and a pinned obligation together. Run a worker until it durably registers a wait, stop the worker, then back up the database. Restore into a fresh database, reopen the exact artifact and code binding, deliver an authorized approval, restart the worker and verify one continuation with the original run/job identity. Repeat the approval and verify that it produces no additional output. Verify that backup and provider evidence absence are reported as recovery limits. A wait-based demo avoids implying that a provider effect can be reconstructed from a database backup alone.

The installed acceptance uses a clean temporary consumer with three package tarballs and the locked npm dependency graph. Run a separate core-only install and inspect its dependency graph for database and optional host package isolation. For the local path, use a fresh npm workspace with framework packages and a separate host package consuming the same public exports. Build dependencies first. Rebuild a changed host handler and show that the replacement binding refuses the existing run. Demonstrate a compatible pinned artifact/code pair still resumes the run. Rebuilds require the normal server restart boundary when existing processes have loaded old modules.

## Backup, upgrade and support evidence

Use actual `pg_dump` custom-format and `pg_restore` into a separate disposable database. Pass connection details through protected environment configuration and avoid logging secrets. Record the PostgreSQL server and client versions. Test migration from a real pre-010 schema with existing pinned obligations, provider evidence and join tombstones. Record before/after hashes of retained immutable artifact and run bindings. Verify a database newer than the package's supported schema and a missing code pin both refuse. Keep the source and restored host isolated from the same live provider until any post-backup effects have been reconciled.

Document initial install/migrate, backup and restore rehearsal, upgrade and rollback limits, retained data and privilege separation, and recovery from uncertain provider outcomes. The support matrix names only combinations actually exercised, including the repository-pinned Node/npm, PostgreSQL major and native PostgreSQL utilities, and npm tarball/workspace composition. It does not certify a Realberry integration or arbitrary provider guarantees.

- X51.1 proves migration preserves historical bindings and protected evidence, unsafe deletion fails, and incompatible schema/code refuses.
- X51.2 proves isolated packed and local workspace consumers, core-only isolation and actual backup/restore resumption.
- X51.3 attempts retention bypasses through ordinary DELETE/TRUNCATE, verifies one continuation after restoration, and surfaces missing backup or authoritative provider evidence without replay.

## Verification receipt

- X51.1 passed. An isolated installed host staged an approval and produced real unresolved provider evidence and a completed join on schema 009. Migration 010 preserved the hash of the graph document, run pins and retained evidence. The newer schema refused to open. DELETE and TRUNCATE refused on all four protected tables, including after restore.
- X51.2 passed. Core-only installation used neither PostgreSQL nor the optional packages. The packed core/artifacts/durable consumer migrated a fresh database and completed an approval. A native PostgreSQL custom-format dump restored into a separate empty database. The restored run used its original graph and handler binding, and repeated approval returned the same receipt with one signal consumption and one continuation. A clean npm workspace built all dependencies from source and ran the same host. Rebuilding a changed handler refused the existing run without consuming a signal. Rebuilding the original handler resumed it.
- X51.3 passed. Missing backup raised BACKUP_UNAVAILABLE. An inconclusive provider lookup preserved the uncertain state and created no ready continuation. The SQL guard and incompatible code refusal did not alter retained state.

The standard PostgreSQL suite passed 40 tests, per-file coverage and installed declarations. The adoption drill passed on Node v26.13.0, npm 11.20.0 and PostgreSQL server and native clients 18.6. See `/tmp/s51-pg.log` and `/tmp/s51-final.log`. CI runs the adoption drill in the PostgreSQL service job.

The existing Next.js workspace fixture now resolves the durable package locally as well. Its clean build, browser check and framework rebuild test passed. Lint and agent guidance checks passed.
