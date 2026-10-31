import { createInspectionScope, createDispatcher, type InspectionScope, type InspectionSnapshot } from 'event-driven-design';
import { toMermaid, type Snapshot } from 'event-driven-design/model';
const scope: InspectionScope = createInspectionScope();
const dispose: () => void = scope.addDispatcher('events', createDispatcher());
const snapshot: InspectionSnapshot = scope.snapshot();
const diagram: string = toMermaid(snapshot); void [dispose, diagram];
for (const source of snapshot.sources) {
  if (source.kind === 'graph') { const run: Snapshot | null = source.run; void run; }
  else { void source.topology.events; }
}
// @ts-expect-error Snapshot sources are immutable.
snapshot.sources.push({});
// @ts-expect-error Scope needs a dispatcher, not its detached topology.
scope.addDispatcher('wrong', createDispatcher().inspect());
// @ts-expect-error Source kinds must be explicit and recognized.
toMermaid({ version: 1, sources: [{ id: 'bad', kind: 'unknown' }] });

// Topology observers carry no packet/event arguments and return an owned disposer.
const observerDispatcher = createDispatcher();
const stopTopology: () => void = observerDispatcher.onTopologyChange(() => {});
stopTopology();
// @ts-expect-error observers must be functions
observerDispatcher.onTopologyChange(42);
