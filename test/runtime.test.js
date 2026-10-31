const { test } = require('node:test');
const { assert, number, deferred, component, single, collect, echo, packet, derivePacket, createGraph, compileGraph, startNetwork } = require('./runtime-fixture.cjs');

test('streaming pipeline drains and independent runs preserve identities', async () => {
  let factories = 0;
  const double = component('double', () => { factories++; let count = 0; return async ctx => {
    for await (const p of ctx.inputs.in) { count++; await ctx.send('out', derivePacket(p.value * 2, [p])); }
    assert.equal(count, 3);
  }; });
  const plus = component('plus', () => { factories++; return async ctx => {
    for await (const p of ctx.inputs.in) await ctx.send('out', derivePacket(p.value + 1, [p]));
  }; });
  const graph = createGraph(), a = graph.add('double', double), b = graph.add('plus', plus);
  graph.connect(a, 'out', b, 'in', 1); graph.exposeInput('in', a, 'in'); graph.exposeOutput('out', b, 'out');
  const compiled = compileGraph(graph.toSpec(), { 'double@1': double, 'plus@1': plus }).graph;
  const roots = [1, 2, 3].map(value => packet(value, { jobId: 'job-42', key: 'x' }));
  const runs = [startNetwork(compiled), startNetwork(compiled)]; assert.equal(factories, 0);
  const results = await Promise.all(runs.map(async run => {
    const outputs = collect(run.outputs.out);
    for (const p of roots) await run.send('in', p);
    const done = run.finish(); assert.equal(done, run.finish()); assert.deepEqual(await done, { status: 'completed' });
    return outputs;
  }));
  assert.equal(factories, 4); assert.notEqual(runs[0].runId, runs[1].runId);
  for (const result of results) {
    assert.deepEqual(result.map(p => p.value), [3, 5, 7]);
    assert(result.every(p => p.jobId === 'job-42' && p.key === 'x' && p.parentPacketIds.length === 1));
  }
  assert.notEqual(results[0][0].packetId, results[1][0].packetId);
  assert.equal(runs[0].snapshot().status, 'completed');
});
test('ingress refusal leaves live run usable and forwarding preserves identity', async () => {
  const run = startNetwork(single(component('echo', echo))), p = packet(2);
  const result = collect(run.outputs.out);
  await assert.rejects(run.send('missing', {}), { code: 'UNKNOWN_PORT' });
  assert.throws(() => run.closeInput('missing'), { code: 'UNKNOWN_PORT' });
  await assert.rejects(run.send('in', { ...p, packetId: 'bad' }), { code: 'INVALID_PACKET' });
  await run.send('in', p); await assert.rejects(run.send('in', p), { code: 'DUPLICATE_PACKET' });
  run.closeInput('in'); run.closeInput('in');
  await assert.rejects(run.send('in', packet(3)), error => ['CHANNEL_CLOSED', 'RUN_TERMINATED'].includes(error.code));
  assert.deepEqual(await run.done, { status: 'completed' });
  const values = await result; assert.equal(values.length, 1); assert.equal(values[0].packetId, p.packetId);
  await assert.rejects(run.send('missing', {}), { code: 'RUN_TERMINATED' }); run.cancel();
  assert.equal((await run.finish()).status, 'completed');
});
test('independent process startup and real output drain participation', async () => {
  const gate = deferred(), started = deferred();
  const source = component('source', () => async ctx => { await gate.promise; await ctx.send('out', packet(1)); }, {}, { out: number });
  const sink = component('sink', () => async ctx => { started.resolve(); for await (const p of ctx.inputs.in) assert.equal(p.value, 1); }, { in: number }, {});
  const g = createGraph(), s = g.add('source', source), t = g.add('sink', sink); g.connect(s, 'out', t, 'in');
  const run = startNetwork(compileGraph(g.toSpec(), { 'source@1': source, 'sink@1': sink }).graph);
  await started.promise; gate.resolve(); assert.equal((await run.done).status, 'completed');
  const boundary = startNetwork(single(component('source2', () => async ctx => { await ctx.send('out', packet(1)); }, {}, { out: number })));
  await Promise.resolve(); assert.equal(boundary.snapshot().status, 'running');
  assert.equal((await collect(boundary.outputs.out))[0].value, 1); assert.equal((await boundary.done).status, 'completed');
});
test('options, definition admission and bounded metadata', async () => {
  const graph = single(component('echo', echo));
  for (const options of [{ executionRecordLimit: 0 }, { executionRecordLimit: 1048577 }, { executionRecordLimit: 1.5 },
    { executionRecordLimit: null }, { diagnosticLimit: -1 }, { diagnosticLimit: 1001 }, { signal: {} }, { timeoutMs: 1 }]) {
    assert.throws(() => startNetwork(graph, options), { code: 'INVALID_ARGUMENT' });
  }
  assert.throws(() => startNetwork({}), { code: 'INVALID_ARGUMENT' });
  const run = startNetwork(graph, { diagnosticLimit: 2 }); const output = collect(run.outputs.out);
  await run.send('in', packet(1)); await run.finish(); await output;
  const snapshot = run.snapshot(); assert.equal(snapshot.diagnostics.length, 2);
  assert(Object.isFrozen(snapshot.nodes[0])); assert(Object.isFrozen(snapshot.channels[0])); assert(snapshot.diagnostics[0].sequence > 1);
  const quiet = startNetwork(graph, { diagnosticLimit: 0 }); quiet.cancel(); assert.deepEqual(quiet.snapshot().diagnostics, []);
  const { getRunDefinition } = require('../dist/cjs/runtime');
  const { getGraphDefinition } = require('../dist/cjs/graph');
  assert.equal(getRunDefinition(run), getGraphDefinition(graph)); assert.throws(() => getRunDefinition({}), { code: 'INVALID_ARGUMENT' });
  const empty = compileGraph({ version: 1, nodes: [], edges: [], inputs: {}, outputs: {} }, {}).graph;
  assert.deepEqual(await startNetwork(empty).done, { status: 'completed' });
});
