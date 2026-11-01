import 'server-only';
import { setTimeout as delay } from 'node:timers/promises';
import { createDispatcher, createInspectionScope, createGraph, describeRegistry, compileGraph, startNetwork, packet } from 'event-driven-design';
import { loadAccount, buildSummary } from './inspection-components.ts';

/** Each connection owns its public fake services, packet run, inventory and observers. */
export function createInspectionFixture(payloads = false) {
  const registry = { 'load-account@1': loadAccount, 'account-summary@1': buildSummary };
  const catalog = describeRegistry(registry), graph = createGraph();
  const first = graph.add('lookup', loadAccount, { taskTimeoutMs: 2000 });
  const second = graph.add('summary', buildSummary, { taskTimeoutMs: 2000 });
  graph.connect(first, 'account', second, 'account', 2);
  graph.exposeInput('accountId', first, 'accountId'); graph.exposeOutput('summary', second, 'summary');
  const spec = graph.toSpec();
  const candidate = process.env.FBP_INSPECTION_BAD_GRAPH === '1' ? { ...spec, edges: [] } : spec;
  const compiled = compileGraph(candidate, registry);
  if (!compiled.ok) throw Error('Invalid fixed inspection graph');
  const controller = new AbortController();
  const run = startNetwork(compiled.graph, { signal: controller.signal, timeoutMs: 10000, trace: { payloads } });
  const draining = (async () => { for await (const output of run.outputs.summary!) void output; })().catch(() => {});
  const feeding = (async () => {
    for (const id of ['acct-101', 'acct-202', 'acct-303']) {
      await run.send('accountId', packet(id, { jobId: 'lookup-' + id }));
      await delay(900, undefined, { signal: controller.signal });
    }
    await run.finish();
  })().catch(() => run.cancel());
  const events = createDispatcher(), event = 'account-ready';
  const releasePublisher = events.declarePublisher('account-service', event);
  function updateView() {}
  events.on(event, updateView, { ownerId: 'account-screen' });
  events.once(event, function welcome() {}, { ownerId: 'welcome-screen' });
  const scope = createInspectionScope();
  const removeFlow = scope.addGraph('account-flow', { spec, catalog, run });
  const idle = createGraph(), idleNode = idle.add('lookup', loadAccount);
  idle.exposeInput('accountId', idleNode, 'accountId'); idle.exposeOutput('account', idleNode, 'account');
  const removeIdle = scope.addGraph('idle-definition', { spec: idle.toSpec(), catalog });
  const removeEvents = scope.addDispatcher('account-events', events);
  let step = 0;
  return {
    snapshot: scope.snapshot, trace: run.trace,
    subscribe(listener: () => void) {
      let active = true;
      const stop = events.onTopologyChange(listener), stopTrace = run.onTrace(listener);
      void run.done.then(() => { if (active) listener(); });
      return () => { active = false; stop(); stopTrace(); };
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
      removeFlow(); removeIdle(); removeEvents(); releasePublisher(); events.unsubscribeAll(event);
      controller.abort(); run.cancel(); run.clearTrace(); void draining; void feeding;
    }
  };
}
