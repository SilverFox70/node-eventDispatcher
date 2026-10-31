const f = require('./runtime-fixture.cjs');
function graphFor(node, policy = {}) {
  const graph = f.createGraph(), handle = graph.add('node', node, policy);
  for (const port of Object.keys(node.in)) graph.exposeInput(port, handle, port);
  for (const port of Object.keys(node.out)) graph.exposeOutput(port, handle, port);
  const result = f.compileGraph(graph.toSpec(), { [`${node.id}@1`]: node });
  f.assert.equal(result.ok, true, JSON.stringify(result));
  return result.graph;
}
async function flush() { await new Promise(globalThis.setImmediate); }
module.exports = { ...f, graphFor, flush, clock: require('./lifecycle-clock.cjs').clock };
