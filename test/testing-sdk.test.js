const { test } = require('node:test');
const assert = require('node:assert/strict');
const { z } = require('zod');
const { contract, defineFunction, packet } = require('../dist/cjs');
const { runNode } = require('../dist/cjs/testing');
const number = contract('testing-number@1', z.number());
const double = defineFunction({ id: 'double', version: 1, title: 'Double', description: '',
  input: number, output: number, handler: value => value * 2 });

test('node harness real validation: double, keys and immediate lineage', async () => {
  const inputs = [packet(2, { key: 'x' }), packet(3, { key: 'y' })];
  const result = await runNode(double, { inputs: { in: inputs } });
  assert.deepEqual(result.outputs.out.map(p => p.value), [4, 6]);
  assert.equal(result.terminal.status, 'completed');
  for (let i = 0; i < inputs.length; i++) {
    assert.equal(result.outputs.out[i].jobId, inputs[i].jobId);
    assert.equal(result.outputs.out[i].key, inputs[i].key);
    assert.notEqual(result.outputs.out[i].packetId, inputs[i].packetId);
    assert.deepEqual(result.outputs.out[i].parentPacketIds, [inputs[i].packetId]);
  }
});

const { runGraph } = require('../dist/cjs/testing');
const { component, single, echo, deferred, derivePacket, createGraph, compileGraph } = require('./runtime-fixture.cjs');
const { broadcast, map, joinByKey, defineComponent, filter, jsonContract } = require('../dist/cjs');
const { clock } = require('./lifecycle-clock.cjs');
const flush = () => new Promise(globalThis.setImmediate);
function clean(snapshot) {
  assert(['completed', 'cancelled', 'failed'].includes(snapshot.status));
  for (const channel of snapshot.channels) {
    assert.equal(channel.queued, 0); assert.equal(channel.pendingSend, false);
  }
}
function trackChannels(t) {
  const module = require('../dist/cjs/channel.js'), create = module.createChannel, channels = [];
  t.mock.method(module, 'createChannel', (...args) => { const channel = create(...args); channels.push(channel); return channel; });
  return () => {
    assert(channels.length > 0);
    for (const channel of channels) {
      const stats = channel.stats();
      assert.equal(stats.queued, 0); assert.equal(stats.pendingSend, false); assert.equal(stats.pendingRead, false);
    }
  };
}
function forkJoin(fail = false) {
  const calls = { left: [], right: [] }, first = deferred();
  const fork = broadcast(number, ['left', 'right']);
  const left = defineComponent({ ...map(number, number, value => { calls.left.push(value); return value * 2; }), id: 'left' });
  const right = defineComponent({ ...map(number, number, async value => {
    calls.right.push(value);
    if (fail && value === 3) { await first.promise; throw Error('private-service-error'); }
    return value + 10;
  }), id: 'right' });
  const join = joinByKey({ left: number, right: number }, { outputId: 'test-product@1' });
  const observer = component('observer', () => async ctx => {
    for await (const p of ctx.inputs.in) { await ctx.send('out', p); first.resolve(); }
  }, { in: join.out.out }, { out: join.out.out });
  const graph = createGraph(), f = graph.add('fork', fork), a = graph.add('left', left), b = graph.add('right', right);
  const j = graph.add('join', join), o = graph.add('observer', observer);
  graph.connect(f, 'left', a, 'in', 1); graph.connect(f, 'right', b, 'in', 1);
  graph.connect(a, 'out', j, 'left', 1); graph.connect(b, 'out', j, 'right', 1);
  graph.connect(j, 'out', o, 'in', 1); graph.exposeInput('in', f, 'in'); graph.exposeOutput('out', o, 'out');
  const compiled = compileGraph(graph.toSpec(), Object.fromEntries([fork, left, right, join, observer].map(n => [`${n.id}@1`, n])));
  assert(compiled.ok); return { graph: compiled.graph, calls };
}

test('node harness real validation: omitted input closes empty', async t => {
  const timer = clock(t);
  const empty = await runNode(double, { inputs: {} });
  assert.deepEqual(empty.outputs, { out: [] }); assert.deepEqual(empty.terminal, { status: 'completed' }); clean(empty.snapshot);
  assert.equal(timer.timers.size, 0);
});

test('graph harness preserves failure: real keyed fork/join and partial output', async () => {
  const inputs = [packet(2, { jobId: 'one-job', key: 'x' }), packet(3, { jobId: 'one-job', key: 'y' })];
  for (const fail of [false, true]) {
    const { graph, calls } = forkJoin(fail);
    const result = await runGraph(graph, { inputs: { in: inputs } });
    assert.deepEqual(result.outputs.out.map(p => p.value), fail ? [{ left: 4, right: 12 }] : [{ left: 4, right: 12 }, { left: 6, right: 13 }]);
    assert.equal(result.terminal.status, fail ? 'failed' : 'completed');
    if (fail) assert.equal(result.terminal.code, 'COMPONENT_FAILED');
    assert.deepEqual(calls, { left: [2, 3], right: [2, 3] }); clean(result.snapshot);
    for (const [index, p] of result.outputs.out.entries()) {
      assert.equal(p.jobId, 'one-job'); assert.equal(p.key, inputs[index].key);
      assert.equal(p.parentPacketIds.length, 2); assert(!p.parentPacketIds.includes(inputs[index].packetId));
    }
    assert(!JSON.stringify(result.snapshot).includes('private-service-error'));
  }
});

test('identity-transparent bounded helpers: forwards roots unchanged and never deduplicates input', async () => {
  const node = component('forward', echo), input = packet(2, { jobId: 'job-x', key: 'x' });
  const result = await runNode(node, { inputs: { in: [input] } });
  assert.deepEqual(result.outputs.out, [input]); clean(result.snapshot);
  await assert.rejects(runNode(node, { inputs: { in: [input, input] } }), { code: 'DUPLICATE_PACKET' });
});

test('harness bounded on every exit: global output limit rejects instead of truncating', async t => {
  const timer = clock(t), checkChannels = trackChannels(t);
  for (const options of [{ maxOutputPackets: 1 }, {}]) {
    const node = broadcast(number, ['a', 'b']);
    const input = Array.from({ length: options.maxOutputPackets ? 1 : 513 }, () => packet(1));
    await assert.rejects(runNode(node, { inputs: { in: input }, ...options }), { code: 'TEST_OUTPUT_LIMIT' });
    assert.equal(timer.timers.size, 0); checkChannels();
  }
});

test('harness bounded on every exit: timeout, cooperative abort and handled late rejection', async t => {
  const controller = new globalThis.AbortController(), timer = clock(t, controller.signal);
  const entered = deferred(), late = deferred(), checkChannels = trackChannels(t); let operationSignal;
  const node = defineFunction({ id: 'waiting', version: 1, title: 'Waiting', description: '', input: number, output: number,
    handler: async (_, { signal }) => { operationSignal = signal; entered.resolve(); await late.promise; throw Error('late-private'); } });
  const pending = runNode(node, { inputs: { in: Array.from({ length: 50 }, () => packet(1)) }, signal: controller.signal });
  await entered.promise;
  assert.equal(timer.timers.size, 1); assert.equal(timer.listeners.size, 1);
  assert.equal([...timer.timers][0].delay, 1000);
  timer.fire(); const result = await pending;
  assert.deepEqual(result.terminal, { status: 'failed', code: 'TIMEOUT' });
  assert(operationSignal.aborted); clean(result.snapshot);
  assert.equal(timer.timers.size, 0); assert.equal(timer.listeners.size, 0);
  late.resolve(); await flush(); checkChannels();
});

test('harness bounded on every exit: cancellation is returned normally, including pre-abort', async t => {
  const controller = new globalThis.AbortController(), timer = clock(t, controller.signal), entered = deferred(), checkChannels = trackChannels(t);
  const node = defineFunction({ id: 'abortable', version: 1, title: 'Abortable', description: '', input: number, output: number,
    handler: (_, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(Error('cancelled-io')), { once: true }); entered.resolve();
    }) });
  const pending = runNode(node, { inputs: { in: [packet(1)] }, signal: controller.signal });
  await entered.promise; controller.abort();
  for (const result of [await pending, await runNode(node, { inputs: { in: [packet(2)] }, signal: controller.signal })]) {
    assert.deepEqual(result.terminal, { status: 'cancelled', code: 'CANCELLED' }); clean(result.snapshot);
  }
  assert.equal(timer.timers.size, 0); assert.equal(timer.listeners.size, 0); checkChannels();
});

test('preflight rejects malformed options, unknown ingress and oversized arrays without effects', async () => {
  let calls = 0;
  const node = component('effect', () => { calls++; return echo(); });
  const graph = single(node);
  const invalid = [null, {}, { inputs: {} , extra: true }, { inputs: null }, { inputs: { in: {} } },
    { inputs: { in: Array(2) } }, { inputs: { in: Array(100001).fill(packet(1)) } },
    ...[0, -1, 1.2, undefined, Infinity, Number.MAX_SAFE_INTEGER + 1].map(timeoutMs => ({ inputs: {}, timeoutMs })),
    ...[0, -1, 1.2, 100001, undefined].map(maxOutputPackets => ({ inputs: {}, maxOutputPackets })),
    { inputs: {}, signal: {} }, { inputs: {}, signal: undefined }];
  for (const options of invalid) await assert.rejects(runGraph(graph, options), { code: 'INVALID_ARGUMENT' });
  await assert.rejects(runGraph(graph, { inputs: { missing: [] } }), { code: 'UNKNOWN_PORT' });
  await assert.rejects(runGraph({}, { inputs: {} }), { code: 'INVALID_ARGUMENT' });
  for (const forged of [null, {}, { ...node }]) assert.throws(() => runNode(forged, { inputs: {} }), { code: 'INVALID_GRAPH' });
  const oversized = component('too-many-ports', echo, Object.fromEntries(Array.from({ length: 4097 }, (_, i) => [`p${i}`, number])), {});
  assert.throws(() => runNode(oversized, { inputs: {} }), { code: 'INVALID_GRAPH' });
  assert.equal(calls, 0);
});

test('admission rejects with its original error after cleanup and without invoking the handler', async t => {
  const controller = new globalThis.AbortController(), timer = clock(t, controller.signal), checkChannels = trackChannels(t); let calls = 0;
  const node = defineFunction({ id: 'validate', version: 1, title: 'Validate', description: '', input: number, output: number,
    handler: value => { calls++; return value; } });
  for (const [input, code] of [[packet('bad'), 'INPUT_CONTRACT'], [{}, 'INVALID_PACKET']]) {
    await assert.rejects(runNode(node, { inputs: { in: [input] }, signal: controller.signal }), { code });
    assert.equal(timer.timers.size, 0); assert.equal(timer.listeners.size, 0); assert.equal(calls, 0); checkChannels();
  }
});

test('collector drains beyond channel capacity and exact upper limits preserve runtime limits', async () => {
  const node = component('forward', echo), inputs = Array.from({ length: 100000 }, () => packet(1));
  await assert.rejects(runNode(node, { inputs: { in: inputs }, maxOutputPackets: 100000, timeoutMs: 60000 }), { code: 'EXECUTION_CAPACITY' });
  const result = await runNode(node, { inputs: { in: inputs.slice(0, 1024) } });
  assert.equal(result.outputs.out.length, 1024); assert.equal(result.terminal.status, 'completed'); clean(result.snapshot);
  assert(Object.isFrozen(result)); assert(Object.isFrozen(result.outputs)); assert(Object.isFrozen(result.outputs.out));
  const source = component('many-outputs', () => async ctx => {
    for (let i = 0; i < 100000; i++) await ctx.send('out', packet(i));
  }, {}, { out: number });
  const upper = await runNode(source, { inputs: {}, maxOutputPackets: 100000, timeoutMs: 60000 });
  assert.equal(upper.outputs.out.length, 100000); assert.equal(upper.terminal.status, 'completed'); clean(upper.snapshot);
});

test('total input bound spans all ports; every omitted ingress closes', async () => {
  const node = component('two-inputs', () => async ctx => {
    await Promise.all(Object.values(ctx.inputs).map(async stream => { for await (const p of stream) void p; }));
  }, { a: number, b: number }, {});
  await assert.rejects(runNode(node, { inputs: { a: Array(60000).fill(packet(1)), b: Array(40001).fill(packet(2)) } }), { code: 'INVALID_ARGUMENT' });
  const result = await runNode(node, { inputs: { a: [packet(1)] } });
  assert.equal(result.terminal.status, 'completed'); assert.deepEqual(result.outputs, {}); clean(result.snapshot);
});

test('zero-input sources and output-contract failures use the same runtime', async () => {
  const source = component('source', () => async ctx => { await ctx.send('out', packet(8)); }, {}, { out: number });
  assert.deepEqual((await runNode(source, { inputs: {} })).outputs.out.map(p => p.value), [8]);
  const bad = component('bad-output', () => async ctx => {
    for await (const p of ctx.inputs.in) await ctx.send('out', derivePacket('bad', [p]));
  });
  const result = await runNode(bad, { inputs: { in: [packet(1)] } });
  assert.equal(result.terminal.code, 'OUTPUT_CONTRACT'); assert.deepEqual(result.outputs.out, []); clean(result.snapshot);
  const empty = compileGraph({ version: 1, nodes: [], edges: [], inputs: {}, outputs: {} }, {});
  assert(empty.ok); assert.equal((await runGraph(empty.graph, { inputs: {} })).terminal.status, 'completed');
  const drop = await runNode(filter(jsonContract, () => false), { inputs: { in: [packet(1)] } });
  assert.deepEqual(drop.outputs, { out: [] });
});
