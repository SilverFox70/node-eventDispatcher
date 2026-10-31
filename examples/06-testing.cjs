const assert = require('node:assert/strict');
const { z } = require('zod');
const { contract, map, defineComponent, createGraph, compileGraph, packet } = require('event-driven-design');
const { runNode, runGraph } = require('event-driven-design/testing');

async function main() {
  const number = contract('demo-test-number@1', z.number());
  const double = map(number, number, value => value * 2);
  const inputs = [packet(2, { key: 'x' }), packet(3, { key: 'y' })];
  const node = await runNode(double, { inputs: { in: inputs } });
  assert.equal(node.terminal.status, 'completed');
  assert.deepEqual(node.outputs.out.map(p => p.value), [4, 6]);
  console.log('Node:', node.outputs.out.map(p => p.value), node.terminal.status);

  const increment = defineComponent({ ...map(number, number, value => value + 1), id: 'increment' });
  const graph = createGraph(), first = graph.add('double', double), second = graph.add('increment', increment);
  graph.connect(first, 'out', second, 'in', 1);
  graph.exposeInput('values', first, 'in'); graph.exposeOutput('results', second, 'out');
  const compiled = compileGraph(graph.toSpec(), { 'map@1': double, 'increment@1': increment });
  assert(compiled.ok);
  const flow = await runGraph(compiled.graph, { inputs: { values: inputs } });
  assert.equal(flow.terminal.status, 'completed');
  assert.deepEqual(flow.outputs.results.map(p => p.value), [5, 7]);
  assert.deepEqual(flow.outputs.results.map(p => p.key), ['x', 'y']);
  console.log('Graph:', flow.outputs.results.map(p => p.value), flow.terminal.status);

  await assert.rejects(runNode(double, { inputs: { in: [packet('wrong type')] } }), { code: 'INPUT_CONTRACT' });
  console.log('Invalid input: INPUT_CONTRACT; no handler execution');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
