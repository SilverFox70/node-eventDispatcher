const { z } = require('zod');
const {
  contract, map, filter, createGraph, compileGraph, startNetwork, packet,
} = require('event-driven-design');

async function main() {
  const numeric = contract('demo-number@1', z.number());
  const double = map(numeric, numeric, async value => value * 2);
  const aboveFour = filter(numeric, value => value > 4);
  const graph = createGraph();
  const first = graph.add('double', double);
  const second = graph.add('above-four', aboveFour);

  graph.connect(first, 'out', second, 'in', 1);
  graph.exposeInput('values', first, 'in');
  graph.exposeOutput('results', second, 'out');

  const compiled = compileGraph(graph.toSpec(), {
    'map@1': double,
    'filter@1': aboveFour,
  });
  if (!compiled.ok) throw Error(JSON.stringify(compiled.issues));
  const run = startNetwork(compiled.graph, { timeoutMs: 5000 });
  const output = (async () => {
    const values = [];
    for await (const result of run.outputs.results) values.push(result.value);
    return values;
  })();

  for (const value of [1, 2, 3, 4]) await run.send('values', packet(value));
  const terminal = await run.finish();
  console.log('Input: [1, 2, 3, 4]');
  console.log('Double, then keep values above 4:', await output);
  console.log('Run:', terminal.status);
  if (terminal.status !== 'completed') throw Error(terminal.code);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
