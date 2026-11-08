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

## Move a locked graph between workspaces

Use `writeGraphBundle(revision, bindingManifest, layout)` to export canonical JSON. The binding manifest lists the static package specifier and named export for each pinned module binding ID. Layout is optional. `inspectGraphBundle(textOrBytes)` validates the bundle and returns its source revision, binding manifest, and layout without touching storage.

To import, pass the inspected file's bytes to `importGraphBundle(bytes, destination, trust, repository)`. The server supplies an authorized workspace/document destination and an independently trusted registry lock and manifest. Import creates an editable draft and refuses an existing ID. It returns the source revision and receipt for reference. Keep the original bundle to retain that provenance. A destination host must run its own trusted fixture before it can lock the imported draft.

The checksum detects content changes. It does not authenticate the sender. Inspection and import never load modules or fetch dependencies.

## Reuse a version-pinned subflow

Use `compileSubflowGraph(document, trust)` on the server. The document has a `graph` with local nodes and wiring, and a separate `subflows` list. Each instance names a locked revision ID. Wire to the instance ID and its local port names as you would wire to a node. Each local port maps to a child's exposed port and carries its expected contract descriptor.

```ts
const result = compileSubflowGraph({
  graph: {
    version: 2, nodes: [], edges: [],
    inputs: { request: { node: 'lookup', port: 'in' } },
    outputs: { result: { node: 'lookup', port: 'out' } },
  },
  subflows: [{
    instanceId: 'lookup',
    revisionId: lockedLookupId,
    bindings: {
      inputs: { in: { port: 'request', contract: requestDescriptor } },
      outputs: { out: { port: 'result', contract: resultDescriptor } },
    },
  }],
}, {
  registry,
  registryLock,
  resolve: id => trustedRevisionIndex.get(id),
});
```

The resolver supplies the original bundle for each exact revision ID. For a child that was itself composed, it also supplies the original `composition` data. Save that data alongside the locked flat revision in your host's revision index. The compiler expands it again and checks that it matches the locked graph. Local node IDs and instance IDs share a namespace. The `subflow:` prefix is reserved for generated IDs.

Check `result.compiled.ok` before running. Use `result.origins` to look up the physical node IDs on runtime events. Each row gives the instance path, source revision, and source node ID. To test and lock the new parent, save `result.spec` through the ordinary authoring APIs. A host can override a configured child node with `bindings.configuration[childNodeId]`. The child's receipt covers its original settings, so test the parent with its selected settings before locking it.

Expansion rejects empty, missing, or substituted revisions, mismatched registry pins, incompatible exposed ports, recursion, and graphs beyond the size limits. The limit is 16 nested levels, 1,000 expanded nodes, 4,096 channels, and 10 MiB of resolved source data per compilation. The ordinary compiler checks final wiring and configuration. Applications can adopt this server API directly. The visual editor and SQLite schema keep their existing document formats.
