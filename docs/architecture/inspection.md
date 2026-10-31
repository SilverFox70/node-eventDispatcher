# Scoped graph and event inspection

S12 adds a server-side createInspectionScope and browser-safe /model toMermaid. The scope collects explicitly registered graph definitions, optional associated runs and current dispatcher relationships. It never discovers unrelated variables or scans source code.

```js
const scope = createInspectionScope();
const removeGraph = scope.addGraph('signup', { spec, catalog, run });
const removeEvents = scope.addDispatcher('account-events', dispatcher);
const snapshot = scope.snapshot();
const diagram = toMermaid(snapshot); // import from event-driven-design/model
```

A graph without a run is registered with {spec,catalog}; its snapshot run is null. Definitions are validated by the existing shared graph/catalog validator before registration and captured as immutable data. An associated run must come from the real runtime and match its captured spec/catalog exactly. Object-key order is immaterial; array order and all public metadata remain significant. The internal run-identity accessor already existed; inspection does not create a global run registry or compare function source.

Source IDs are nonempty strings of at most128 characters, unique within one scope. Different scopes may use the same IDs. Sources retain insertion order. Duplicate IDs throw DUPLICATE_SOURCE; invalid IDs/dispatcher shapes throw INVALID_ARGUMENT; invalid graph definitions throw INVALID_GRAPH; wrong/fabricated runs throw RUN_GRAPH_MISMATCH. Invalid registration leaves the existing inventory intact. Dispatcher inspection is captured from a data-property method, and its detached topology is checked at registration and each snapshot.

Removal is idempotent and releases the scope's registration references. It does not cancel a run, remove application listeners or revoke publisher declarations. A stale disposer cannot remove a later registration reusing the same ID. Applications own unregistering sources they no longer want retained. Reentrant registration from an application-provided dispatcher inspector cannot overwrite another registration.

## Safe snapshots

InspectionSnapshot is immutable JSON with version1 and sources:

| Source kind | Data |
| --- | --- |
| graph | id, spec, catalog, run:Snapshot or null |
| dispatcher | id, current DispatcherTopology |

A snapshot samples sources synchronously, in scope order. It is a point-in-time view, not a distributed transaction or durable audit. Registered definitions appear even when idle. Run status/counters and bounded authoritative validation details come from the existing runtime snapshot. Dispatcher once removal, unsubscribe and publisher disposal appear on the next sample.

No live packet values, packet/job/key history, validators, callbacks, service objects or executable registry handles are collected. Catalog descriptions/examples are deliberately public authored metadata, not sampled execution data. The inventory grows with explicit registrations, not packet traffic. Previous snapshots remain detached when sources change or are removed.

Snapshot/diagnostic/verdict types now live in the browser-safe model layer and are re-exported under the same runtime/root type names. Their fields and runtime behavior are unchanged. Model runtime and declaration import trees are checked to exclude server execution dependencies; actual production Next/browser verification remains in its owning later slices.

## Diagram export

/model exports toMermaid(snapshot). It validates the relationships it consumes and emits flowchart LR with one subgraph per source. Graph nodes/ports and exposed endpoints show defined edges; dispatcher owners/publishers/events show declared edges; event/subscriber/owner links show active relationships. Unattributed listeners appear as unassigned. The snapshot remains authoritative; diagram text is neither another interpreter nor a layout/selection protocol.

All code identifiers are deterministic synthetic IDs, unique across sources/entity order. Application names appear only as quoted labels. Markup/entity/directive delimiters become inert visible characters; reserved punctuation uses [Mermaid numeric entity codes](https://mermaid.js.org/syntax/flowchart.html#entity-codes-to-escape-characters), control characters are removed, and line breaks become a visible return marker. Original names remain available in the structured snapshot. The exporter emits no HTML, click commands, initialization directives or function sources. It ignores run metrics and authored examples when drawing relationships.

There is no Mermaid runtime dependency or graphical canvas here. Text generation, hostile labels, isolated package imports and browser-safe dependency trees are verified; DOM/rendering and the graphical inspector remain later UI work. Consumers choose how to display or save the returned string.

## Runnable example

```sh
npm run build
node examples/04-inspection.cjs
```

[The demo](../../examples/04-inspection.cjs) registers a live graph, an idle definition and a dispatcher. It prints the Mermaid inventory and shows a once listener disappearing after delivery. Everything runs offline. [S12 receipt](../cursor_plans/fbp-slices/S12-execution.md) records actual proof/publication; S13 follows after merge.

## Live graphical inspector

S18 adds a read-only SVG/text inspector to the packaged Next fixture. [The Next guide](../nextjs.md#live-graph-and-event-inspector) explains the runnable view and its owned SSE delivery. The scope API above remains point-in-time sampling. Dispatcher changes are observable through [onTopologyChange](dispatcher.md#s18--automatic-topology-notifications); the host subscribes before sampling, then transmits bounded safe snapshots.

[LV2](../cursor_plans/fbp-slices/18-graphical-inspector-plan.md#lv2--execution-design-checkpoint-2026-10-31) records producer/transport ownership. Updates are automatic, connection interruptions are visible and reconnect resynchronizes. No packet history, inferred relationships, editing or distributed durable observability is added.

S18A adds a separate optional [execution trace](execution-inspection.md) and richer graphical cards. Scope.snapshot remains payload/history free; hosts explicitly transport trace data alongside it when enabled.
