# Saved graphs and export — proposed EXT1-r2

Owners S32–S38. See [S32’s document format and package confirmation](S32-execution.md). SQLite local graph storage is **user selected**. This does not persist running JavaScript. [Shared rules](shared-contract.md), [durable execution](durable-contract.md).

S20 [PK1](contracts/packages-and-storage.md) selects package/storage boundaries and [EV1](contracts/evidence-v1.md) the shared build-identity primitive; those refinements supersede earlier illustrative digest/driver alternatives. Exact SQL migration/codegen fixtures remain the owning preflight gates.

## Data contracts

All forms are strict, size-bounded JSON, version1 envelopes. `GraphDocument = {format:'nodeflow.document',version:1,workspaceId,documentId,draftRevision,graph,layout,registryLock}`. `graph` is the reviewed GraphSpec v1/v2; `layout` contains node coordinates, groups and viewport only. No service instances, tokens, closures or arbitrary code. Workspace is trusted host scope; client-supplied IDs alone never authorize access.

`RegistryLock = {version:1,bindings:[{component,implementationDigest,contractsDigest,moduleBindingId}],representations:[{id,version}],policyVersion}`. Bindings sorted by component identity, unique meanings mandatory. `moduleBindingId` resolves in a trusted host manifest to static package/module/export names. Host build computes implementationDigest from the declared packaged implementation bundle and pinned transitive dependency lock, not function.toString(). Exact build-manifest recipe is a D1/D2 acceptance item before S32; same component ID/version with changed bytes is a mismatch.

Semantic hash preimage: `{format:'nodeflow.semantic',version:1,graph:normalizedGraph,registryLock}`. Canonical JSON sorts object keys, preserves array order, rejects nonfinite/unsupported values and uses UTF-8 with no insignificant whitespace. Graph arrays preserve authored order so no accidental equivalence claim about scheduling is introduced. SHA256 lowercase hex. Separate layout hash uses `{format:'nodeflow.layout',version:1,layout}`. No Unicode normalization or schema coercion; number serialization follows the reviewed JSON algorithm, including explicit negative-zero normalization. Cross-platform fixtures pin exact bytes/digests.

`TestReceipt = {version:1,semanticHash,fixtureHash,serviceProfileHash,runtimeVersion,policyVersion,assertionSetHash,outcome:'passed',receiptId}` issued and stored by the trusted test host; lock resolves receiptId in that host store and verifies the exact hashes, never an editable client success flag. Imported receipt metadata is explanatory only until the destination host reruns fixtures and issues its own receipt. A receipt proves these fixtures only; no remote-service guarantee. Fixture inputs/results carry their own capture/secret policy. Initial store budgets: document/bundle max10MiB, max1000 nodes/4096 channels as current compiler, layout groups max1000, import dependencies max1000; host may lower.

`LockedRevision = {format:'nodeflow.revision',version:1,revisionId,documentId,semanticHash,graph,registryLock,testReceipt,createdAt,actorId}`; immutable. Layout is an optional separately hashed view attachment so presentation can change without redefining semantic code. Release ID is host allocated, content digest independently verifies it. No latest-version fallback.

## Repository operations and transaction behavior

Host-scoped interface proposals:

- `createDraft({workspaceId,documentId,graph,layout,registryLock})` creates revision0 or refuses duplicate ID.
- `loadDraft({workspaceId,documentId})` returns a detached snapshot or not-found within authorized scope.
- `saveDraft({workspaceId,documentId,expectedRevision,content})` performs one atomic CAS and returns new revision, else `DRAFT_CONFLICT/currentRevision`; no overwrite fallback.
- `lockRevision({documentId,expectedDraftRevision,receiptId})` validates exact semantic/registry/fixture hashes and atomically creates or returns the identical locked content. Stale receipts refuse.
- `forkDraft({lockedRevisionId,newDocumentId})` creates independent mutable state.

S33 owns SQLite migrations, transactions, crash reopen and documented backup/restore. Use a supported driver/API compatible with pinned Node, reverified before installation. Pinned Node26.13.0 exposes native sqlite symbols, but symbol availability alone does not establish API stability or maintenance; D3 driver evidence must decide whether native or supported adapter is appropriate. No deprecated package merely to avoid investigation. Desktop/local host only initially; do not claim SQLite files solve multi-machine authoring/collaboration.

Local autosave debounces250ms with one in-flight save, sends the last acknowledged revision and retains unsaved edits on error/conflict. Newer edits are never marked saved by an older response. Conflicts show reopen/fork choices; no silent merge. Closing prompts only when edits remain unsaved; storage errors are visible, not fake success. Durable write success means committed transaction, not queued debounce.

## Bundle and code export

`GraphBundle = {format:'nodeflow.bundle',version:1,revision,layout?,bindingManifest,integrity}`. Integrity covers canonical unsigned bundle, with `integrity` excluded from its own preimage; digest integrity is not authenticity. Import requires authorized trusted registry bindings and an explicit destination; it does not import code or fetch npm packages. Validate full bundle/hash/bounds before transaction, then resolve conflict or save atomically. Unknown format and component versions refuse.

TypeScript output is generated from the graph and a **trusted** module/export manifest, not source recovered from factories. Emit deterministic ordinary imports and named builder/config calls with readable formatting, stable node names and a graph/origin comment. Use a trusted resolver for import paths and literal escaping for values. Pair it with portable JSON and a dependency/ownership manifest, plus installation instructions. No arbitrary metadata-to-import interpolation or shell commands.

Generated ownership manifest lists file paths and prior hashes. Export refuses absolute/traversal paths and files changed since previous generation (`EXPORT_CONFLICT`); provide preview/new-directory export instead. Handwritten modules remain owned by humans/agents and never overwritten. TypeScript-to-editor arbitrary reverse parsing is excluded; round-trip works through the artifact, with TS as an export. Source-only changes require rebuilt registry digests/new version and revalidation.

## Version-pinned subflows

S38 adds a document-level reference `{instanceId,revisionId,bindings}` to an immutable child revision. Resolve before compiler, check exposed port/config contracts, namespace physical IDs deterministically and retain logical origin map `{physicalNodeId,parentInstancePath,sourceRevisionId,sourceNodeId}`. Core GraphSpec remains a flattened DAG. No recursive references; maxdepth16 plus global existing node/channel bounds after expansion. Missing child, incompatible interface, expansion overflow or cycle refuses before factories. Child updates never rewrite pinned parents.

## Proof and lifecycle

X32.1–X38.3 own canonical byte fixtures, actual SQLite crash/CAS tests, lock/receipt races, integrity tamper refusal, clean installed generated-code builds and subflow attribution. S37 demonstrates editor→save→test→lock→export→independent project. Revision/registry storage schema migrations require explicit version maps and backup compatibility, not in-place rewriting of historical content. Execution state retention belongs to the durable host, not graph-document cleanup.
