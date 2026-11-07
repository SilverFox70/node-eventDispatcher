# Graph artifacts

The optional `event-driven-design-artifacts` workspace package validates graph documents and identifies their contents. Install it alongside `event-driven-design` at the matching version.

- `event-driven-design-artifacts/model` parses strict, detached document and regression fixture JSON and exposes the canonical fingerprint preimages. It is safe to import in browser code.
- `event-driven-design-artifacts` adds `fingerprintGraphDocument(document)`, returning lowercase SHA-256 `semanticHash` and `layoutHash` strings.

The semantic hash covers GraphSpec and the registry lock. The layout hash covers positions, groups and optional viewport. Workspace ID, document ID and draft revision belong to host storage and are outside both hashes. Object keys sort lexically. Arrays preserve their order. Negative zero becomes zero. The document and fixture limit is 10 MiB of canonical UTF-8 JSON.

The host must independently supply its trusted registry lock to `assertRegistryLockMatches` before using a stored graph. Parsing and hashing do not load component code. Use the ordinary compiler to validate executable wiring and registered contracts.

From the repository, run `npm run build` then `npm run test:artifacts` to build and verify the optional package, including a packed installation.

## Local SQLite drafts

The server-only `event-driven-design-artifacts/sqlite` export provides `openDraftRepository(path)`. The host supplies an authorized workspace and document ID to load, create, or save. Create starts at revision zero. Save uses the expected revision and returns the current revision on conflict. Call `close()` when the owning host shuts down. The adapter uses the built-in `Database` API on the pinned Node version in a dedicated worker.

Close all database handles before making a file-copy backup or restoring one. After an unclean shutdown, reopen and close the database first so SQLite can recover its journal. Keep the backup separate from the live path. Reopen a restored copy and confirm its draft revision and fingerprints before replacing the live file. SQLite stores graph drafts here. Running workflows are owned by the later durable host.

## Lock a tested revision

The trusted server host supplies a reviewed offline regression fixture, the verified registry lock, a runtime version, and a service profile digest. Use the existing core `executionIdentity` function to bind the fixture to those inputs. Build the registry from the host's pinned implementation and the fixture's scripted services.

1. Call `testDraft(scope, expectedRevision, verification)`. A receipt is stored only after the ordinary regression assertions pass.
2. Call `lockRevision(scope, expectedRevision, receipt.receiptId, actorId, profile)` with the current trusted test profile. Layout-only edits can reuse the receipt by supplying the new draft revision. Changes to graph semantics, implementation, fixture, runtime, or service profile need matching evidence.
3. Read the record with `loadLockedRevision(scope, revisionId)`. Use `compileLockedRevision(revision, trustedLock, resolveRegistry)` from the package root to verify content and bindings before the registry is resolved.
4. Use `forkDraft(scope, revisionId, newDocumentId)` to start a new editable draft at revision zero.

These methods belong in a trusted host. A successful browser run or an imported receipt is insufficient to lock a local revision. The SQLite store upgrades v1 draft databases transactionally on first open.
