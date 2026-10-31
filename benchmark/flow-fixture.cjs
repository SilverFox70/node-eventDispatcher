const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { z } = require('zod');
const f = require('../dist/cjs');
const channelModule = require('../dist/cjs/channel.js');
const numeric = f.contract('load-number@1', z.number());
const yieldTurn = () => new Promise(globalThis.setImmediate);

/** Observe real channel operations with constant-size counters, never retained packet histories. */
function observeChannels(onSend) {
  const original = channelModule.createChannel, records = [];
  channelModule.createChannel = capacity => {
    const channel = original(capacity);
    const record = { index: records.length, channel, capacity, highWater: 0, readers: 0, writers: 0, maxReaders: 0, maxWriters: 0 };
    records.push(record);
    function sample() { record.highWater = Math.max(record.highWater, channel.stats().queued); }
    const observed = { ...channel };
    for (const [method, current, maximum] of [['send', 'writers', 'maxWriters'], ['receive', 'readers', 'maxReaders']]) {
      observed[method] = (...args) => {
        record[current]++; record[maximum] = Math.max(record[maximum], record[current]);
        if (method === 'send') onSend?.(record, args[0]);
        const result = channel[method](...args); sample();
        return result.finally(() => { record[current]--; sample(); });
      };
    }
    return observed;
  };
  return {
    records,
    restore() { channelModule.createChannel = original; },
    assertClean() {
      assert(records.length > 0);
      for (const record of records) {
        const stats = record.channel.stats();
        assert(record.highWater <= record.capacity);
        assert(record.maxReaders <= 1); assert(record.maxWriters <= 1);
        assert.equal(record.readers, 0); assert.equal(record.writers, 0);
        assert.equal(stats.queued, 0); assert.equal(stats.pendingRead, false); assert.equal(stats.pendingSend, false);
      }
    },
    summary() { return records.map(r => ({ capacity: r.capacity, highWater: r.highWater, maxReaders: r.maxReaders, maxWriters: r.maxWriters })); },
  };
}
function component(id, input, output, create) {
  return f.defineComponent({ id, version: 1, title: id, description: 'Reliability fixture', in: input, out: output, create });
}
function compile(spec, nodes) {
  const result = f.compileGraph(spec, Object.fromEntries(nodes.map(node => [`${node.id}@1`, node])));
  assert(result.ok, JSON.stringify(result)); return result.graph;
}

/** A real source/transform/sink graph; only totals and sampled heap are retained by the fixture. */
function loadGraph(kind, count, capacity, { pause } = {}) {
  const graph = f.createGraph(), nodes = [];
  const initialHeap = process.memoryUsage().heapUsed;
  const totals = { count: 0, sum: 0, heapSamples: [{ count: 0, heapUsed: initialHeap }] };
  const add = node => { nodes.push(node); return graph.add(node.id, node); };
  const source = add(component('source', {}, { out: numeric }, () => async ctx => {
    for (let i = 0; i < count; i++) await ctx.send('out', f.packet(i, { jobId: 'load-job', key: String(i) }));
  }));
  let last, resultContract;
  if (kind === 'pipeline') {
    last = source;
    for (let i = 0; i < 3; i++) {
      const next = add(f.defineComponent({ ...f.map(numeric, numeric, async value => value + 1), id: `map-${i}` }));
      graph.connect(last, 'out', next, 'in', capacity); last = next;
    }
    resultContract = numeric;
  } else {
    assert.equal(kind, 'fork-join');
    const split = add(f.broadcast(numeric, ['left', 'right']));
    graph.connect(source, 'out', split, 'in', capacity);
    const left = add(f.defineComponent({ ...f.map(numeric, numeric, async value => value * 2), id: 'left' }));
    const right = add(f.defineComponent({ ...f.map(numeric, numeric, async value => value + 10), id: 'right' }));
    const joined = f.joinByKey({ left: numeric, right: numeric }, { outputId: 'load-product@1', maxKeys: 128, completedGroupLimit: count });
    last = add(joined); resultContract = joined.out.out;
    graph.connect(split, 'left', left, 'in', capacity); graph.connect(split, 'right', right, 'in', capacity);
    graph.connect(left, 'out', last, 'left', capacity); graph.connect(right, 'out', last, 'right', capacity);
  }
  const sink = add(component('sink', { in: resultContract }, {}, () => async ctx => {
    for await (const packet of ctx.inputs.in) {
      const index = totals.count;
      assert.equal(packet.jobId, 'load-job'); assert.equal(packet.key, String(index));
      if (kind === 'pipeline') { assert.equal(packet.value, index + 3); assert.equal(packet.parentPacketIds.length, 1); }
      else { assert.deepEqual(packet.value, { left: index * 2, right: index + 10 }); assert.equal(packet.parentPacketIds.length, 2); }
      totals.count++; totals.sum += kind === 'pipeline' ? packet.value : packet.value.left + packet.value.right;
      if (totals.count === 1 && pause) await pause();
      if (totals.count % 10000 === 0) {
        totals.heapSamples.push({ count: totals.count, heapUsed: process.memoryUsage().heapUsed });
        await yieldTurn();
      }
    }
  }));
  graph.connect(last, 'out', sink, 'in', capacity);
  return { graph: compile(graph.toSpec(), nodes), totals };
}
async function measure(kind, count, capacity) {
  const monitor = observeChannels(); let run;
  try {
    const { graph, totals } = loadGraph(kind, count, capacity);
    const started = performance.now();
    run = f.startNetwork(graph, { executionRecordLimit: 1048576 });
    const terminal = await run.done, elapsedMs = performance.now() - started;
    assert.deepEqual(terminal, { status: 'completed' });
    assert.equal(totals.count, count);
    const expectedSum = kind === 'pipeline' ? count * (count - 1) / 2 + 3 * count : 3 * count * (count - 1) / 2 + 10 * count;
    assert.equal(totals.sum, expectedSum); monitor.assertClean();
    return { kind, count, capacity, executionRecordLimit: 1048576, completedGroupLimit: kind === 'fork-join' ? count : null,
      elapsedMs, packetsPerSecond: count * 1000 / elapsedMs, ...totals, channels: monitor.summary() };
  } finally { run?.cancel(); monitor.restore(); }
}
module.exports = { ...f, numeric, component, compile, observeChannels, loadGraph, measure, yieldTurn };
