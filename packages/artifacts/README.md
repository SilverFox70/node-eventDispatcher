# Graph artifacts

The optional `event-driven-design-artifacts` workspace package validates graph documents and identifies their contents. Install it alongside `event-driven-design` at the matching version.

- `event-driven-design-artifacts/model` parses strict, detached document and regression fixture JSON and exposes the canonical fingerprint preimages. It is safe to import in browser code.
- `event-driven-design-artifacts` adds `fingerprintGraphDocument(document)`, returning lowercase SHA-256 `semanticHash` and `layoutHash` strings.

The semantic hash covers GraphSpec and the registry lock. The layout hash covers positions, groups and optional viewport. Workspace ID, document ID and draft revision belong to host storage and are outside both hashes. Object keys sort lexically. Arrays preserve their order. Negative zero becomes zero. The document and fixture limit is 10 MiB of canonical UTF-8 JSON.

The host must independently supply its trusted registry lock to `assertRegistryLockMatches` before using a stored graph. Parsing and hashing do not load component code. Use the ordinary compiler to validate executable wiring and registered contracts. SQLite draft storage follows in S33.

From the repository, run `npm run build` then `npm run test:artifacts` to build and verify the optional package, including a packed installation.
