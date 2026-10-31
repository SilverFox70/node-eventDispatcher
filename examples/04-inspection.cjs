const {
  createInspectionScope, createDispatcher, map, contract, createGraph,
  compileGraph, describeRegistry, startNetwork, packet,
} = require('event-driven-design');
const { toMermaid } = require('event-driven-design/model');
const { z } = require('zod');

async function main() {
  const numeric = contract('inspection-number@1', z.number());
  const double = map(numeric, numeric, value => value * 2);
  const registry = { 'map@1': double };
  const catalog = describeRegistry(registry);
  function graphSpec() {
    const builder = createGraph();
    const node = builder.add('double', double);
    builder.exposeInput('request', node, 'in');
    builder.exposeOutput('response', node, 'out');
    return builder.toSpec();
  }
  const liveSpec = graphSpec();
  const compiled = compileGraph(liveSpec, registry);
  if (!compiled.ok) throw Error(JSON.stringify(compiled.issues));
  const run = startNetwork(compiled.graph, { timeoutMs: 5000 });
  const consuming = (async () => {
    let count = 0;
    for await (const result of run.outputs.response) { void result; count++; }
    return count;
  })();

  const events = createDispatcher();
  events.declarePublisher('account-service', 'account-ready');
  events.once('account-ready', function refreshScreen() {}, { ownerId: 'account-screen' });
  const scope = createInspectionScope();
  scope.addGraph('live-flow', { spec: liveSpec, catalog, run });
  scope.addGraph('idle-definition', { spec: graphSpec(), catalog });
  scope.addDispatcher('application-events', events);

  await run.send('request', packet(21));
  await run.finish();
  console.log('Results processed:', await consuming);
  const snapshot = scope.snapshot();
  console.log('Registered sources:', snapshot.sources.map(source => source.id).join(', '));
  console.log('Run:', snapshot.sources[0].run.status);
  console.log(toMermaid(snapshot));
  events.emit('account-ready');
  console.log('Subscribers after once delivery:', scope.snapshot().sources[2].topology.subscribers.length);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
