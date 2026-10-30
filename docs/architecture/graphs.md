# Graph validation and compilation

S06 accepts version-1 JSON graph definitions. `/model` exports `validateGraph(spec, catalog)` for browser-safe wiring checks; the root exports `compileGraph(spec, registry)` for authoritative server compilation. Both return `{ ok: false, issues: [{ code, path }] }` on refusal. Compilation success returns `{ ok: true, graph }`, an opaque, frozen handle. It does not call component factories or execute packets.

## Try a graph now

Run `npm run build`, then execute this with the pinned Node version from the repository directory:

```js
const { defineComponent, jsonContract, compileGraph } = require('./dist/cjs');
const echo = defineComponent({
  id: 'echo', version: 1, title: 'Echo', description: 'Example wiring',
  in: { value: jsonContract }, out: { value: jsonContract },
  create: () => async () => {}, // Compilation never invokes this factory.
});
const spec = {
  version: 1,
  nodes: [{ id: 'echo', component: 'echo@1' }], edges: [],
  inputs: { value: { node: 'echo', port: 'value' } },
  outputs: { value: { node: 'echo', port: 'value' } },
};
console.log(compileGraph(spec, { 'echo@1': echo }).ok); // true
spec.inputs.value.port = 'missing';
console.log(compileGraph(spec, { 'echo@1': echo })); // UNKNOWN_PORT and unconnected input
```

Use the installed package name instead of the local distribution path in a consuming project. S07 adds typed construction conveniences; S08 supplies actual streaming execution. The example factory is only for demonstrating compilation, not a working echo process.

## Wiring rules and ownership

- Nodes reference exact registered `componentId@version` keys. Node IDs and boundary names are nonempty strings up to128 UTF-16 code units. Port names must exist on the corresponding component; own-property lookup supports names such as `__proto__`.
- Every declared input has exactly one source and every declared output exactly one target, including exposed boundaries. Empty port sets support sources/sinks. Fan-out and multiple writers require explicit components, not duplicate connections.
- Edge capacity defaults to16; explicit values must be integers1–256. Boundary channels are fixed at16. Compilation preserves omitted capacity in the saved specification; its later runtime consumer applies the default. Maximum1000 nodes and4096 total edge/boundary channels.
- Connections use S05's conservative contract identity/schema comparison, with `json@1` accepted as a destination wildcard. The catalog has one meaning per contract ID. Cycles are refused, independently of later runtime scheduling.
- Structure is checked first. Malformed JSON/shape yields `INVALID_GRAPH` at `$`; over-limit otherwise-shaped graphs yield `GRAPH_LIMIT` without further topology traversal. Other issues are sorted lexically by path then code. Array positions identify nodes/edges; dynamic names use quoted bracket notation. Several issues may describe one invalid graph, such as a missing endpoint and the resulting unconnected port.
- Catalog validation precedes graph validation. Invalid catalog/version/representation errors retain S05's catalog codes. Compilation derives that catalog from actual registered definitions; malformed executable registries yield `INVALID_GRAPH` at `$.registry`, while conflicting contract meanings retain `CONTRACT_ID_CONFLICT`. Client-supplied metadata cannot authorize code execution.
- Compilation snapshots graph data, catalog and the registry's immutable component/factory references. Caller mutation cannot change the compiled definition. Closures are retained references, not deep-cloned services or serialized function bodies; S05's authoring ownership rules still apply.

The handle's private definition object is its canonical in-process identity for later runtime/inspection association. It is not a durable graph ID or portable artifact. Copying/serializing the empty handle does not preserve authority; a forged or foreign-module handle fails internal admission with `INVALID_ARGUMENT`. No public handle inspection, packet lookup, payload schema evaluation in the browser, graph editor or runtime is introduced here.
