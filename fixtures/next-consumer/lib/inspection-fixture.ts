import 'server-only';
import { createDispatcher, createInspectionScope, createGraph, map, jsonContract,
  describeRegistry, compileGraph, startNetwork, packet } from 'event-driven-design';

/** Each connection owns a small real inventory; no cross-request registry. */
export function createInspectionFixture() {
  const component = map(jsonContract, jsonContract, value => value);
  const catalog = describeRegistry({ 'map@1': component });
  const graph = createGraph();
  const first = graph.add('Load account', component);
  const second = graph.add('Display <script>alert(1)</script>', component);
  graph.connect(first, 'out', second, 'in', 2);
  graph.exposeInput('request', first, 'in');
  graph.exposeOutput('result', second, 'out');
  const spec = graph.toSpec();
  const candidate = process.env.FBP_INSPECTION_BAD_GRAPH === '1' ? { ...spec, edges: [] } : spec;
  const compiled = compileGraph(candidate, { 'map@1': component });
  if (!compiled.ok) throw Error('Invalid fixed inspection graph');
  const run = startNetwork(compiled.graph, { timeoutMs: 60000 });
  // Terminal cancellation is already reflected in the run snapshot.
  const draining = (async () => { for await (const packet of run.outputs.result!) void packet; })().catch(() => {});
  void run.send('request', packet(21));
  void run.finish();
  const events = createDispatcher();
  const event = 'account-ready <img src=x onerror=alert(1)>';
  const releasePublisher = events.declarePublisher('account-service', event);
  function updateView() {}
  events.on(event, updateView, { ownerId: 'account-screen' });
  events.once(event, function welcome() {}, { ownerId: 'welcome-screen' });
  const scope = createInspectionScope();
  const removeFlow = scope.addGraph('account-flow', { spec, catalog, run });
  const removeIdle = scope.addGraph('idle-definition', { spec: { ...spec, nodes: spec.nodes.slice(0, 1), edges: [],
    outputs: { result: { node: spec.nodes[0]!.id, port: 'out' } } }, catalog });
  const removeEvents = scope.addDispatcher('account-events', events);
  let step = 0;
  return {
    snapshot: scope.snapshot,
    subscribe(listener: () => void) {
      let active = true;
      const stop = events.onTopologyChange(listener);
      void run.done.then(() => { if (active) listener(); });
      return () => { active = false; stop(); };
    },
    advance() {
      switch (step++) {
        case 0: events.emit(event); return true;
        case 1: events.off(event, updateView); return true;
        case 2: releasePublisher(); return true;
        case 3: events.on(event, function refreshAccount() { console.info('FBP_INSPECTION_REFRESH'); }, { ownerId: 'new-screen' }); return true;
        default: events.emit(event); return false;
      }
    },
    dispose() {
      removeFlow(); removeIdle(); removeEvents(); releasePublisher();
      events.unsubscribeAll(event); run.cancel(); void draining;
    }
  };
}
