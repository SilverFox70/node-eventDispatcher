# Operate the optional durable host

The durable host is a server package. Keep the PostgreSQL connection, executable registry, authenticated actor and provider credentials on the server. Core-only consumers can install `event-driven-design` independently. Durable consumers install the compatible core and durable packages. Add the artifacts package when storing graph revisions. In an npm workspace, use the same public imports and one linked core instance. Build core before the optional packages, then build the application. Restart the server to load rebuilt code.

The [approval example](../../examples/durable/README.md) shows a minimal application transaction, persisted wait and authorized continuation. The application owns authentication, its version resolver and its provider policies.

## Install and upgrade

1. Keep the deployment lockfile, graph artifacts and versioned executable bindings alongside the backup policy. Record the durable package version, migration level, execution digest and adapter digest.
2. Use a migration owner to run `store.migrate()` against an empty database or an approved older schema. Application roles should have only the table permissions needed by their host commands. They should have no ownership, DDL, trigger management or direct destructive table privileges. Keep operator and migration credentials separate.
3. Before an upgrade, pause effects and quiesce writers, capture a recovery point and rehearse restoration into a separate database. Preserve old binding versions for live runs. Deploy the schema and compatible binaries in the reviewed order.
4. Verify a paused run with the exact artifact and binding, then restore normal processing. A newer unsupported schema or incompatible pin refuses. An application rollback alone does not revert the database. Reverting the database also reverts recorded effects, so reconcile the gap before restoring live access.

## Backup and restore

Use PostgreSQL utilities compatible with the server. The acceptance drill uses a custom-format dump of the entire database and restores into an empty database with `--single-transaction --exit-on-error`. Include application tables and artifact storage. Back up versioned executable bindings separately. Keep backup credentials out of shell history, store dumps with restricted access, and test that the recovery materials actually open.

```sh
# Set the connection with PGHOST, PGPORT, PGDATABASE, PGUSER and a protected PGPASSFILE.
pg_dump --format=custom --no-owner --no-privileges --file=approval.dump
pg_restore --dbname=isolated_restore --exit-on-error --single-transaction \
  --no-owner --no-privileges approval.dump
```

Restore in isolation. Keep workers and live provider credentials disconnected until the recovery point and effects since that point are reconciled. Use an authoritative provider lookup against the original operation identity. Missing or inconclusive evidence keeps the operation held. A backup does not reconstruct remote effects performed after its recovery point. If the backup, exact binding, or necessary provider evidence is missing, report the recovery limit before allowing work to resume.

## Retained identities

Migration 010 refuses DELETE or TRUNCATE of workflow runs, provider operation identities, join completion markers and signal receipts. It preserves workflow submission deduplication and the records that fence repeated effects. Signal expiry can still clear the payload, and run termination can still remove incomplete join state. A join completion marker stays for the lifetime of its retained run.

The guard covers normal SQL deletion. PostgreSQL administrators can change schema or disable triggers. Treat destructive DDL, backup rewind and namespace retirement as separate operations with an explicit review of which identities could be reused. This release has no automatic retirement policy.

## Verified combinations

| Boundary | Verified configuration |
| --- | --- |
| Optional package installation | Repository-pinned Node and npm, clean package tarballs |
| Local application development | npm workspaces, public package exports, rebuild and restart |
| Database recovery | PostgreSQL 18 with matching `pg_dump` and `pg_restore` |
| Provider recovery | Controlled fixture and evidence-based reconciliation |

Run the installed acceptance after building core, artifacts and durable. Set `FBP_POSTGRES_TEST_URL` to a disposable PostgreSQL server with database creation privileges, then run `node scripts/test-durable-adoption.cjs`. If the server runs in a local Docker container, `FBP_PG_CLIENT_CONTAINER` can select that same container for the matching client binaries.
