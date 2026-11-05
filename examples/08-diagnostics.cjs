const assert = require('node:assert/strict');
const { createGraph, compileGraph, map, jsonContract, packet, startNetwork,
  attachDiagnosticsSink, exportDiagnostics } = require('event-driven-design');

async function main() {
  const component = map(jsonContract, jsonContract, value => value * 2);
  const graph = createGraph(), node = graph.add('double', component);
  graph.exposeInput('in', node, 'in'); graph.exposeOutput('out', node, 'out');
  const compiled = compileGraph(graph.toSpec(), { 'map@1': component }); assert(compiled.ok);
  const run = startNetwork(compiled.graph, { capturePolicy: {
    allowedNodes: ['double'], denyInputs: [], denyOutputs: [], maxPayloadBytes: 2048, maxSessionMs: 60000,
  } });
  run.openDiagnosticsSession({ rules: [{ nodeId: 'double', inputs: true, outputs: true }], expiresInMs: 60000 });
  const batches = [];
  const sink = attachDiagnosticsSink(run, { write: async batch => { batches.push(batch); } });
  const reading = (async () => { for await (const result of run.outputs.out) console.log('Result:', result.value); })();
  await run.send('in', packet(21, { jobId: 'diagnostic-demo' }));
  const terminal = await run.finish(); await reading;
  const flushed = await sink.flush({ timeoutMs: 1000 });
  console.log('Run:', terminal.status, 'Sink drained:', flushed.complete);
  console.log('Dropped records:', sink.snapshot().droppedRecords);
  assert(batches.length > 0 && batches.every(batch => batch.events.every(event => !event.capture)));
  console.log('JSONL (payloads omitted):');
  process.stdout.write(exportDiagnostics(run.diagnostics()));
  await sink.dispose();
}
main().catch(error => { console.error(error); process.exitCode = 1; });
