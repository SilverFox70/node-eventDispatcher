# Typed graph construction

S07 exports createGraph, GraphBuilder and NodeHandle from the package root. It constructs the same version-1 GraphSpec accepted by S06; no executor or separate compiler is introduced. Each handle belongs to exactly one builder. Ownership is checked at runtime, including for JavaScript callers; TypeScript cannot distinguish two builder instances with identical port types.

## Try it after npm run build

Run this JavaScript in Node from the repository directory:

```js
const { createGraph, defineComponent, jsonContract, compileGraph } = require('./dist/cjs');
const echo = defineComponent({
  id: 'echo', version: 1, title: 'Echo', description: 'Compile-only example',
  in: { value: jsonContract }, out: { value: jsonContract },
  create: () => async () => {},
});
const graph = createGraph();
const first = graph.add('first', echo);
const second = graph.add('second', echo);
graph.connect(first, 'value', second, 'value', 2);
graph.exposeInput('value', first, 'value');
graph.exposeOutput('result', second, 'value');
console.log(JSON.stringify(graph.toSpec(), null, 2));
console.log('Compiled:', compileGraph(graph.toSpec(), { 'echo@1': echo }).ok);
```

Expected: two nodes, one capacity2 edge, one exposed input/output, then Compiled: true. These empty processes only demonstrate construction/compilation. Actual packet execution arrives in S08. Installed consumers import the package name instead of the local distribution path.

## What the builder guarantees

- add(id, component) accepts a real S05 component, assigns its exact versioned registry key and returns a frozen opaque handle preserving its named input/output payload types. IDs follow S06's nonempty128-code-unit rule. Keep the same versioned definitions in the registry supplied to compileGraph; the builder does not register or serialize implementations.
- connect(from, fromPort, to, toPort, capacity?) checks both handle owners and port names before adding an edge. Capacity is optional (the compiler/runtime default is16); explicit capacity must be an integer1–256.
- TypeScript rejects unknown ports and incompatible payload types, including uncertain port unions. Invariant handles and NoInfer prevent inference from silently widening the node definitions. A number can target a JSON payload input; ordinary structural payload assignability still does not imply compatible versioned contract IDs.
- exposeInput(name, node, inputPort) and exposeOutput(name, node, outputPort) retain the correct port direction. Input and output boundary names have separate namespaces. Prototype-like names are ordinary own properties in the resulting spec.
- toSpec() returns a detached deeply frozen JSON definition. Further builder edits do not change earlier snapshots. Handles, factories and ownership metadata never appear in that JSON.

Bad names/definitions or foreign/forged handles throw INVALID_ARGUMENT; duplicate node IDs or same-side boundary names throw DUPLICATE_ID; unknown/wrong-direction ports throw UNKNOWN_PORT; bad capacity throws INVALID_CAPACITY. Refused operations do not mutate the builder. JavaScript does not receive TypeScript's payload checks, so always compile the result against the authoritative registry.

Graph completeness, contract identity/schema compatibility, cardinality, graph limits and cycle policy remain S06 compiler responsibilities. Construction can temporarily contain an incomplete or invalid graph so it can be assembled incrementally. For example, two numeric schemas with different contract IDs can type-check as a connection but compilation returns CONTRACT_MISMATCH. No global registry, schema-subtyping solver, implicit fanout, execution or automatic persistence is provided by the builder.
