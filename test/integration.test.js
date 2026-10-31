const { test } = require('node:test');
const assert = require('node:assert/strict');
const f = require('../benchmark/flow-fixture.cjs');
const { deferred, single, echo } = require('./runtime-fixture.cjs');
const { clock } = require('./lifecycle-clock.cjs');

function composed({ left, right, sink }) {
  const graph = f.createGraph(), nodes = [];
  const add = node => { nodes.push(node); return graph.add(node.id, node); };
  const roots = [f.packet(2, { jobId: 'integration-job', key: 'x' }), f.packet(3, { jobId: 'integration-job', key: 'y' })];
  const source = add(f.component('source', {}, { out: f.numeric }, () => async ctx => {
    for (const packet of roots) await ctx.send('out', packet);
  }));
  const split = add(f.broadcast(f.numeric, ['left', 'right']));
  const a = add(f.defineComponent({ ...f.map(f.numeric, f.numeric, left), id: 'left' }));
  const b = add(f.defineComponent({ ...f.map(f.numeric, f.numeric, right), id: 'right' }));
  const join = f.joinByKey({ left: f.numeric, right: f.numeric }, { outputId: 'integration-result@1' });
  const j = add(join), last = add(f.component('sink', { in: join.out.out }, {}, () => async ctx => {
    for await (const packet of ctx.inputs.in) await sink(packet);
  }));
  graph.connect(source, 'out', split, 'in', 1);
  graph.connect(split, 'left', a, 'in', 1); graph.connect(split, 'right', b, 'in', 1);
  graph.connect(a, 'out', j, 'left', 1); graph.connect(b, 'out', j, 'right', 1);
  graph.connect(j, 'out', last, 'in', 1);
  return { graph: f.compile(graph.toSpec(), nodes), roots };
}

test('whole network composition and failure: interleaved correlations preserve exact immediate lineage', async t => {
  const events = [], order = [], secondLeft = deferred(), received = [];
  const monitor = f.observeChannels((channel, packet) => events.push({ channel: channel.index, packet }));
  t.after(() => monitor.restore());
  const { graph, roots } = composed({
    left: async value => { order.push(`left:${value}`); if (value === 3) secondLeft.resolve(); return value * 2; },
    right: async value => { if (value === 2) await secondLeft.promise; order.push(`right:${value}`); return value + 10; },
    sink: packet => { received.push(packet); },
  });
  const run = f.startNetwork(graph); t.after(() => run.cancel());
  assert.deepEqual(await run.done, { status: 'completed' });
  assert.deepEqual(order, ['left:2', 'left:3', 'right:2', 'right:3']);
  assert.deepEqual(received.map(p => p.value), [{ left: 4, right: 12 }, { left: 6, right: 13 }]);
  const at = index => events.filter(e => e.channel === index).map(e => e.packet);
  for (let index = 0; index < 2; index++) {
    assert.deepEqual(at(0)[index], roots[index]);
    for (const [forkChannel, mapChannel] of [[1, 3], [2, 4]]) {
      assert.deepEqual(at(forkChannel)[index].parentPacketIds, [roots[index].packetId]);
      assert.deepEqual(at(mapChannel)[index].parentPacketIds, [at(forkChannel)[index].packetId]);
    }
    assert.deepEqual(received[index].parentPacketIds, [at(3)[index].packetId, at(4)[index].packetId]);
    assert.equal(received[index].jobId, roots[index].jobId); assert.equal(received[index].key, roots[index].key);
  }
  assert.equal(new Set(events.map(e => e.packet.packetId)).size, events.length);
  monitor.assertClean();
});

test('whole network composition and failure: branch throw aborts peer without replay or late output', async t => {
  const controller = new globalThis.AbortController(), timer = clock(t, controller.signal);
  const entered = deferred(), late = deferred(), calls = { left: 0, right: 0 }, received = [], sends = [];
  const monitor = f.observeChannels((channel, packet) => sends.push({ channel: channel.index, packet }));
  t.after(() => monitor.restore());
  let siblingSignal;
  const { graph } = composed({
    left: async (_, { signal }) => { calls.left++; siblingSignal = signal; entered.resolve(); await late.promise; return 99; },
    right: async () => { calls.right++; await entered.promise; throw Error('private provider detail'); },
    sink: packet => { received.push(packet); },
  });
  const run = f.startNetwork(graph, { signal: controller.signal, timeoutMs: 60000 });
  t.after(() => { run.cancel(); late.resolve(); });
  assert.deepEqual(await run.done, { status: 'failed', code: 'COMPONENT_FAILED', nodeId: 'right' });
  assert(siblingSignal.aborted); assert.deepEqual(calls, { left: 1, right: 1 });
  const sentAtFailure = sends.length;
  late.resolve(); await f.yieldTurn();
  assert.deepEqual(calls, { left: 1, right: 1 }); assert.deepEqual(received, []);
  assert.equal(sends.length, sentAtFailure); assert(!sends.some(e => e.channel >= 3));
  assert(!JSON.stringify(run.snapshot()).includes('private provider detail'));
  monitor.assertClean(); assert.equal(timer.timers.size, 0); assert.equal(timer.listeners.size, 0);
});

test('whole network composition and failure: 100 finish/cancel cycles restore owned resources', async t => {
  const graph = single(f.component('echo', { in: f.numeric }, { out: f.numeric }, echo));
  for (let index = 0; index < 100; index++) {
    const controller = new globalThis.AbortController(), timer = clock(t, controller.signal), monitor = f.observeChannels();
    const run = f.startNetwork(graph, { signal: controller.signal, timeoutMs: 60000 });
    try {
      if (index % 2 === 0) {
        const outputs = (async () => { const values = []; for await (const p of run.outputs.out) values.push(p); return values; })();
        const input = f.packet(index); await run.send('in', input);
        assert.deepEqual(await run.finish(), { status: 'completed' }); assert.deepEqual(await outputs, [input]);
      } else {
        const read = run.outputs.out[Symbol.asyncIterator]().next();
        const rejected = assert.rejects(read, { code: 'RUN_TERMINATED' });
        controller.abort(); assert.equal((await run.done).status, 'cancelled'); await rejected;
      }
      await f.yieldTurn(); monitor.assertClean();
      assert.equal(timer.timers.size, 0); assert.equal(timer.listeners.size, 0);
    } finally { run.cancel(); monitor.restore(); t.mock.restoreAll(); }
  }
});
