import * as root from 'event-driven-design';
import * as model from 'event-driven-design/model';
import * as testing from 'event-driven-design/testing';
void [root, model, testing];
// @ts-expect-error Starting a network requires an actual compiled graph.
root.startNetwork();

const dispatcher: root.Dispatcher = root.createDispatcher({ logLimit: 2 });
dispatcher.on('typed', (value: number, label: string) => { void [value, label]; });
dispatcher.emit('typed', [2, 'label']);
// @ts-expect-error Event names must be strings.
dispatcher.on(42, () => {});
// @ts-expect-error Listeners must be callable.
dispatcher.once('bad', 42);
// @ts-expect-error logLimit must be numeric.
root.createDispatcher({ logLimit: '2' });

const metadata: root.OwnerMetadata = { ownerId: 'owner' };
dispatcher.on('owned', (value: number) => { void value; }, metadata);
dispatcher.once('owned', () => {}, metadata);
const dispose: () => void = dispatcher.declarePublisher('producer', 'owned');
const topology: model.DispatcherTopology = dispatcher.inspect();
void [dispose, topology];
// @ts-expect-error Snapshot arrays are immutable.
topology.subscribers.push({});
// @ts-expect-error Snapshot version is immutable.
topology.version = 2;
// @ts-expect-error Ownership requires a string ownerId.
dispatcher.on('owned', () => {}, { ownerId: 1 });
// @ts-expect-error Owner metadata requires ownerId.
dispatcher.once('owned', () => {}, {});
// @ts-expect-error Live callbacks are not part of browser-safe topology.
topology.subscribers[0]?.callback();

const graphSpec: root.GraphSpec = { version: 1, nodes: [], edges: [], inputs: {}, outputs: {} };
const compiledGraph: root.CompileResult = root.compileGraph(graphSpec, {});
const graphValidation: model.ValidationResult = model.validateGraph(graphSpec, { version: 1, components: [] });
void graphValidation;
// @ts-expect-error Compiled graph handles cannot be constructed by consumers.
const forgedGraph: root.CompiledGraph = {};
void forgedGraph;
// @ts-expect-error Graph definitions are readonly.
graphSpec.nodes.push({ id: 'x', component: 'x@1' });
if (compiledGraph.ok) { const handle: root.CompiledGraph = compiledGraph.graph; void handle; }

const graphBuilder: root.GraphBuilder = root.createGraph();
const builtGraphSpec: root.GraphSpec = graphBuilder.toSpec();
void builtGraphSpec;

if (compiledGraph.ok) {
  const run: root.NetworkRun = root.startNetwork(compiledGraph.graph, { executionRecordLimit: 10, diagnosticLimit: 2 });
  const done: Promise<root.Terminal> = run.finish(); void done;
  root.startNetwork(compiledGraph.graph, { timeoutMs: 1 }).cancel();
  // @ts-expect-error Deadline duration must be numeric.
  root.startNetwork(compiledGraph.graph, { timeoutMs: '1' });
  // @ts-expect-error Network sends require complete packet envelopes.
  run.send('in', 2);
  // @ts-expect-error Snapshot metadata is readonly.
  run.snapshot().nodes.push({ id: 'bad', status: 'running' });
  run.cancel();
}
