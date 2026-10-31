const assert = require('node:assert/strict');
const { defineComponent, contract, packet, derivePacket, compileGraph, createGraph, startNetwork } = require('../dist/cjs');
const { z } = require('zod');
const number = contract('number@1', z.number());
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function component(id, create, input = { in: number }, output = { out: number }) {
  return defineComponent({ id, version: 1, title: id, description: '', in: input, out: output, create });
}
function single(node) {
  const graph = createGraph(), n = graph.add('node', node);
  for (const name of Object.keys(node.in)) graph.exposeInput(name, n, name);
  for (const name of Object.keys(node.out)) graph.exposeOutput(name, n, name);
  const result = compileGraph(graph.toSpec(), { [`${node.id}@1`]: node }); assert.equal(result.ok, true); return result.graph;
}
async function collect(output) { const values = []; for await (const p of output) values.push(p); return values; }
const echo = () => async ctx => { for await (const p of ctx.inputs.in) await ctx.send('out', p); };


module.exports = { assert, number, deferred, component, single, collect, echo, packet, derivePacket, createGraph, compileGraph, startNetwork };
