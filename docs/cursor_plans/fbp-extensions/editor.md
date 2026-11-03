# Visual authoring contract — proposed EXT1-r2

Owners S25–S31; S38 subflows later. [Shared rules](shared-contract.md), [artifact lifecycle](artifacts.md).

## Product shape

Reference [Node-RED’s editor guide](https://nodered.org/docs/user-guide/editor/): palette, workspace, configuration/help and debug panels. Our planned experience adds useful node descriptions, visible input/output contracts, test receipts, revision attribution and real packet observations. This is UX inspiration, not Node-RED runtime or file-format compatibility.

Propose [React Flow](https://reactflow.dev/learn) as the optional canvas substrate. Before installing, S20/S26 verify supported package/React/Next/Node versions, license, keyboard accessibility and production client rendering; record exact lock identity. Use core compilation/execution, never a canvas library’s computational example as another engine.

Distinct actions: **Run test**, **Cancel test**, **Save draft**, **Lock revision**, **Export**. Canvas edits and autosave never execute service calls. S31 explicitly labels session-only drafts until S33 exists. Save/lock/export do not deploy. Active runs and locked revisions keep their original content even while a draft changes.

Palette entries come from an authorized catalog. Cards show business title/purpose, component version, typed named ports, config summary and run state. Event publishers/subscriptions remain separately styled live overlays, not executable data wires. Keyboard/text list offers equivalent selection/connect/delete/configure operations; focus, dialogs and errors are accessible.

Canonical S20 refinement: [CG2-r1](contracts/configuration-v2.md) selects exact shapes/refusals/factory binding; its rules supersede inconsistent illustrative snippets below. [PK1](contracts/packages-and-storage.md) owns package boundaries.

## Configuration requires a real model amendment

Current GraphSpec v1 is strict and has no configuration field; existing component `create()` closes over dependencies. Do not sneak config into unknown fields or generate ad-hoc component IDs.

Proposed GraphSpec v2 keeps v1 edges/exposed ports/policies and adds per-node JSON `config`. Configured definitions declare a `configuration: Contract<C>` and `create(config: Readonly<C>)` factory. Fixed named input/output contracts remain independent of configuration. A v2 node referencing an unconfigured component must omit config; a configured component must supply it. No implicit defaults; UI can propose an explicit default as editable data.

```ts
const transform = defineConfiguredComponent({
  id: 'multiply', version: 1, title: 'Multiply', description: 'Scale a value',
  configuration: factorContract, // { factor: number }
  in: { value: numberContract }, out: { value: numberContract },
  create: config => async context => { /* ordinary process */ },
});
// reviewed builder overload, not currently shipped
builder.add('scale', transform, { config: { factor: 2 } });
```

Compiler deep-copies/validates/freezes JSON config against authoritative registered contracts before any factory executes. Factories execute once per run as today, receiving the pinned instance config; compile never calls a process factory. Service injection stays in trusted registry construction, not stored config. Configuration schemas expose only approved nonsecret fields; secret/service bindings stay host-side and are not accepted as editable fields. No heuristic promises to identify every secret in an arbitrary string. Functions/handler source are not serializable config; applications identify safe dependency roles separately.

Catalog v2 extends descriptors with optional configuration contract metadata; v1 catalogs/graphs remain accepted for existing definitions. Unknown versions refuse. Catalog metadata never provides executable capability or proves backend schema validity. Existing unsupported-schema rules still apply. S25 updates browser model, compiler, registry descriptors, builder, runtime, testing helper/types, inspection and packed CJS/ESM consumers as one contract change. No separate browser evaluator promise.

## Editor document operations

Use one immutable command reducer: `addNode`, `removeNode`, `connect`, `disconnect`, `setConfig`, `moveNode`, `group`, `ungroup`, `exposeInput`, `exposeOutput`. Each command has expected document revision and stable command ID, returns updated state or a typed issue. Undo/redo restores semantic and layout snapshots; copy/paste allocates fresh node IDs and rewrites internal endpoints only. Command history is bounded (default100 commands); durable revision history is separate.

Drafts may be incomplete and display validation issues; syntactically invalid commands never mutate the document. Reject an incompatible connection, duplicate ID, invalid capacity or cycle through shared validation rules; preserve v1 cardinality rules. Removing a node also removes its incident wires/exposed endpoints in one undoable command. No new execution edge semantics.

## Backend test adapter proposal

Host implements `validateDraft({graph,registryLock})` and `startTest({graphHash,graph,registryLock,input,requestedCapabilities})`. Return safe existing compiler issues and a run handle `{runId,graphHash}` or typed refusal. RegistryLock structure is owned by S32; before then S29 uses the reviewed ephemeral digest-equivalent binding snapshot, not unverified client registry objects.

Host checks authentication/workspace/allowlisted bindings, limits and exact graph hash, then invokes existing production compiler/runtime. Proposed defaults: one active test/workspace, max100 input jobs/run, existing graph/channel limits, finite host-owned deadline. Application host may lower these. Shared timeout/retry rules remain authoritative; test mode is not permission to call arbitrary external services. Run cancellation closes the owned runtime; browser disconnect policy is explicit host configuration, default cancel disposable test runs.

Validation is revision-bound. A late verdict for graph A cannot enable Run for graph B. New runs use the exact tested hash and pinned service profile; edits do not mutate active runs. One run subscription has bounded transport buffers/cursors; reconnect reads snapshot plus later events and marks gaps. A UI pause pauses display only, not execution.

## Human/agent authoring

Node definitions remain reviewed source modules with explicit input/output/config/effects/dependency metadata and standalone fixtures using the existing node harness. Agents can propose structured graph edits and source changes through normal review/tests; the editor does not accept arbitrary executable code or dynamically install packages. Registry refresh detects a new version and does not silently replace bindings in a running/locked graph.

Proof owners X25.1–X31.3 include installed client/server isolation, invalid raw JSON before effects, keyboard editing, undo/redo, stale verdicts, live intermediate outputs and no-refresh relationship updates. S31 is the first complete visual authoring milestone; durability and export claims wait for their owners.
