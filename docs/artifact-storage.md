# Back up and restore graph authoring storage

The SQLite authoring database holds drafts, test receipts, and immutable locked revisions. Back it up separately from the exported bundles you distribute to runtime projects. Preserve the trusted node implementations and registry pins alongside your backups so you can still verify and run older revisions.

1. Stop the authoring host and close all database handles. Copy the closed database to a dated backup. For a live backup or an installation that enables WAL, use SQLite's backup tooling to capture a consistent snapshot.
2. Restore into a fresh path and start a fresh authoring process against that copy. Load a known draft and locked revision using their original workspace, document and revision IDs. Compare the receipt and layout with the previously exported bundle.
3. Verify that the corresponding runtime and node packages still match the recorded pins. If a binding is missing, recover the pinned code or create a new draft and test it against the replacement before locking another revision.

The repository creates SQLite schema version 2 and upgrades version 1 when it opens the database. Keep a pre-upgrade backup. An unsupported SQLite schema version fails with `UNSUPPORTED_DRAFT_SCHEMA`. The database schema version is separate from the document, revision and portable bundle formats, which each currently use version 1. Use the corresponding format reader before compiling, and preserve original exports if a future format requires migration.

The [adoption demo](../examples/adoption/README.md) exercises an offline backup and restores the saved draft and locked revision in a separate Node process.
