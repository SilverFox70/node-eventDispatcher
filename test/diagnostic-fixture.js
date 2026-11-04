/* global module */
const assert = require('node:assert/strict');
const { defineFunction, defineComponent, jsonContract, compileGraph, startNetwork } = require('../dist/cjs');
function start(component, options, policy = {}) {
  const spec = { version: 1, nodes: [{ id: 'worker', component: `${component.id}@1`, ...policy }], edges: [],
    inputs: { request: { node: 'worker', port: 'in' } }, outputs: { result: { node: 'worker', port: 'out' } } };
  const compiled = compileGraph(spec, { [`${component.id}@1`]: component }); assert(compiled.ok);
  const run = startNetwork(compiled.graph, options);
  const output = (async () => { const values = []; try { for await (const p of run.outputs.result) values.push(p); } catch { /* Runtime terminal is asserted separately. */ } return values; })();
  return { run, output };
}
const fn = handler => defineFunction({ id: 'diagnostic-fn', version: 1, title: 'Work', description: '', input: jsonContract, output: jsonContract, handler });
const processNode = (create, id = 'diagnostic-process') => defineComponent({ id, version: 1, title: 'Work', description: '',
  in: { in: jsonContract }, out: { out: jsonContract }, create });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
module.exports = { start, fn, processNode, deferred };
