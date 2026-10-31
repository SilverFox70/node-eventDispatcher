const assert = require('node:assert/strict');
const { setImmediate } = require('node:timers/promises');
const { jsonContract, map, defineComponent, createGraph, compileGraph, startNetwork, packet } = require('event-driven-design');
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

async function demo(cancel) {
  const entered = deferred(), gate = deferred();
  const first = map(jsonContract, jsonContract, value => value);
  const slow = defineComponent({ ...map(jsonContract, jsonContract, async value => {
    if (value === 0) { entered.resolve(); await gate.promise; }
    return value * 2;
  }), id: 'slow' });
  const graph = createGraph(), a = graph.add('first', first), b = graph.add('slow', slow);
  graph.connect(a, 'out', b, 'in', 1); graph.exposeInput('in', a, 'in'); graph.exposeOutput('out', b, 'out');
  const compiled = compileGraph(graph.toSpec(), { 'map@1': first, 'slow@1': slow }); assert(compiled.ok);
  const run = startNetwork(compiled.graph, { timeoutMs: 5000 });
  const values = [];
  const output = (async () => {
    try { for await (const p of run.outputs.out) values.push(p.value); }
    catch (error) { if (error.code !== 'RUN_TERMINATED') throw error; }
  })();
  const feeder = (async () => {
    try { for (let i = 0; i < 50; i++) await run.send('in', packet(i)); return await run.finish(); }
    catch (error) { if (error.code !== 'RUN_TERMINATED') throw error; return run.done; }
  })();
  try {
    await entered.promise; await setImmediate();
    const edge = run.snapshot().channels.find(channel => channel.id === 'edge:0');
    assert.equal(edge.queued, 1); assert.equal(edge.pendingSend, true);
    if (cancel) run.cancel();
    gate.resolve();
    const terminal = await feeder; await output;
    assert.equal(terminal.status, cancel ? 'cancelled' : 'completed');
    assert.equal(values.length, cancel ? 0 : 50);
    if (!cancel) assert.equal(values.reduce((sum, value) => sum + value, 0), 2450);
    console.log('External feed:', terminal.status, 'packets:', values.length, 'edge capacity:', edge.capacity);
  } finally { run.cancel(); gate.resolve(); await Promise.allSettled([feeder, output]); }
}
(async () => { await demo(false); await demo(true); })().catch(error => { console.error(error); process.exitCode = 1; });
