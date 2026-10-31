const { test } = require('node:test');
const { assert, number, graphFor, startNetwork, packet, collect, deferred, flush, component, createGraph, compileGraph } = require('./node-task-fixture.cjs');
const { map, filter, broadcast, merge, contract, FlowError } = require('../dist/cjs');
const { z } = require('zod');

test('map derives children and filter forwards original identities', async () => {
  for (const [node, expected] of [[map(number, number, async n => n * 2), [2, 4, 6, 8]], [filter(number, async n => n % 2 === 0), [2, 4]]]) {
    const run = startNetwork(graphFor(node)), output = collect(run.outputs.out);
    const inputs = [1, 2, 3, 4].map(n => packet(n, { jobId: 'job', key: String(n) }));
    for (const input of inputs) await run.send('in', input);
    assert.equal((await run.finish()).status, 'completed'); const values = await output;
    assert.deepEqual(values.map(p => p.value), expected);
    for (const p of values) {
      const original = inputs.find(input => input.key === p.key); assert.equal(p.jobId, 'job');
      if (node.id === 'map') { assert.notEqual(p.packetId, original.packetId); assert.deepEqual(p.parentPacketIds, [original.packetId]); }
      else assert.deepEqual(p, original);
    }
  }
});

test('broadcast backpressure and distinct isolated branch children', async () => {
  const split = broadcast(number, ['fast', 'slow']);
  const fastValues = [], slowEntered = deferred(), release = deferred();
  const fast = component('fast', () => async ctx => { for await (const p of ctx.inputs.in) { fastValues.push(p); } }, { in: number }, {});
  const slow = component('slow', () => async ctx => { slowEntered.resolve(); await release.promise; for await (const p of ctx.inputs.in) await ctx.send('out', p); });
  const graph = createGraph(), a = graph.add('split', split), b = graph.add('fast', fast), c = graph.add('slow', slow);
  graph.connect(a, 'fast', b, 'in', 1); graph.connect(a, 'slow', c, 'in', 1); graph.exposeInput('in', a, 'in'); graph.exposeOutput('out', c, 'out');
  const compiled = compileGraph(graph.toSpec(), { 'broadcast@1': split, 'fast@1': fast, 'slow@1': slow }); assert(compiled.ok);
  const run = startNetwork(compiled.graph), output = collect(run.outputs.out);
  const inputs = [1, 2, 3].map(n => packet(n, { jobId: 'fork', key: String(n) }));
  await slowEntered.promise; for (const p of inputs) await run.send('in', p); await flush();
  assert.deepEqual(fastValues.map(p => p.value), [1, 2]); assert(run.snapshot().channels.some(c => c.pendingSend));
  release.resolve(); await run.finish(); const slowValues = await output;
  assert.deepEqual(fastValues.map(p => p.value), [1, 2, 3]); assert.deepEqual(slowValues.map(p => p.value), [1, 2, 3]);
  for (let i = 0; i < 3; i++) {
    assert.notEqual(fastValues[i].packetId, slowValues[i].packetId);
    for (const child of [fastValues[i], slowValues[i]]) { assert.equal(child.jobId, 'fork'); assert.equal(child.key, String(i + 1)); assert.deepEqual(child.parentPacketIds, [inputs[i].packetId]); }
  }
});

test('merge stream closure, readiness and unchanged envelope identity', async () => {
  const node = merge(number, ['left', 'right']), run = startNetwork(graphFor(node));
  const iterator = run.outputs.out[Symbol.asyncIterator]();
  const left = [1, 2].map(n => packet(n)), right = [10, 20].map(n => packet(n));
  await run.send('right', right[0]); assert.deepEqual((await iterator.next()).value, right[0]);
  await run.send('left', left[0]); assert.deepEqual((await iterator.next()).value, left[0]);
  await run.send('left', left[1]); assert.deepEqual((await iterator.next()).value, left[1]);
  await run.send('right', right[1]); assert.deepEqual((await iterator.next()).value, right[1]);
  let ended = false; const end = iterator.next().then(r => { ended = true; return r; }); await flush(); assert.equal(ended, false);
  await run.finish(); assert.equal((await end).done, true); assert.equal((await run.done).status, 'completed');
});

test('map and filter callbacks are serial scoped operations with explicit retries', async () => {
  for (const kind of ['map', 'filter']) {
    const entered = deferred(), release = deferred(), contexts = []; let calls = 0;
    const handler = async (value, ctx) => { contexts.push(ctx); calls++; if (calls === 1) { entered.resolve(); await release.promise; throw new FlowError('TEMPORARY'); } return kind === 'map' ? value * 2 : true; };
    const node = kind === 'map' ? map(number, number, handler) : filter(number, handler);
    const run = startNetwork(graphFor(node, { retry: { maxRetries: 1, codes: ['TEMPORARY'], delayMs: 0, idempotent: true } })), output = collect(run.outputs.out);
    await run.send('in', packet(1, { jobId: 'retry' })); await run.send('in', packet(2)); await entered.promise; await flush(); assert.equal(calls, 1);
    release.resolve(); await run.finish(); assert.deepEqual((await output).map(p => p.value), kind === 'map' ? [2, 4] : [1, 2]);
    assert.deepEqual(contexts.map(ctx => ctx.attempt), [1, 2, 1]); assert.equal(new Set(contexts.map(ctx => ctx.attemptId)).size, 3);
    assert.equal(contexts[0].packet.jobId, 'retry'); assert(Object.isFrozen(contexts[0]));
  }
});

test('combinator authoring rejects malformed names, contracts and callbacks without getters', () => {
  for (const make of [broadcast, merge]) {
    for (const names of [[], ['a'], ['a', 'a'], ['', 'b'], [1, 'b'], ['a', 'x'.repeat(129)], null, new Array(2)]) assert.throws(() => make(number, names), { code: 'INVALID_ARGUMENT' });
    assert.throws(() => make({}, ['a', 'b']), { code: 'INVALID_ARGUMENT' });
    let calls = 0; const names = ['a', 'b']; Object.defineProperty(names, 0, { get() { calls++; return 'a'; } });
    assert.throws(() => make(number, names), { code: 'INVALID_ARGUMENT' }); assert.equal(calls, 0);
  }
  assert.throws(() => filter(number, null), { code: 'INVALID_ARGUMENT' });
  assert.throws(() => filter({}, () => true), { code: 'INVALID_ARGUMENT' });
  assert.throws(() => map(number, number, null), { code: 'INVALID_ARGUMENT' });
});

test('invalid map output and predicate result fail without downstream delivery or retry', async () => {
  for (const node of [map(number, number, () => 'wrong'), filter(number, () => 'truthy')]) {
    const run = startNetwork(graphFor(node)); const refused = assert.rejects(collect(run.outputs.out), { code: 'RUN_TERMINATED' });
    await run.send('in', packet(1)); await run.finish(); await refused; assert.equal((await run.done).code, 'OUTPUT_CONTRACT'); assert.equal(run.snapshot().channels[1].sent, 0);
  }
});

test('broadcast copies frozen objects and captures names independently of later mutation', async () => {
  const object = contract('branch-object@1', z.strictObject({ nested: z.strictObject({ n: z.number() }) }));
  const names = ['a', 'b'], node = broadcast(object, names); names.reverse(); names.push('c');
  const run = startNetwork(graphFor(node)), a = collect(run.outputs.a), b = collect(run.outputs.b);
  await run.send('in', packet({ nested: { n: 1 } })); await run.finish();
  const first = (await a)[0], second = (await b)[0]; assert.notEqual(first.value, second.value); assert.notEqual(first.value.nested, second.value.nested);
  assert(Object.isFrozen(first.value.nested)); assert.deepEqual(first.value, second.value); assert.deepEqual(Object.keys(node.out), ['a', 'b']);
});

test('merge keeps one read per input, honors readiness and declaration ties, and waits for every EOF', async () => {
  // Controlled iterators supplement the production-runtime integration above: exact read counts are private there.
  const waiting = { left: [], right: [] }, reads = { left: 0, right: 0 }, emitted = [], sends = [];
  const inputs = Object.fromEntries(Object.keys(waiting).map(name => [name, { [Symbol.asyncIterator]() { return { next() {
    reads[name]++; assert.equal(waiting[name].length, 0); const d = deferred(); waiting[name].push(d); return d.promise;
  } }; } }]));
  const process = merge(number, ['left', 'right']).create();
  const done = process({ inputs, send: async (_, p) => { emitted.push(p); const d = deferred(); sends.push(d); await d.promise; } });
  const l1 = packet(1), l2 = packet(2), r1 = packet(10), r2 = packet(20);
  // Both reads are ready in one settlement batch: declaration order wins even if resolved right first.
  waiting.right.shift().resolve({ value: r1, done: false }); waiting.left.shift().resolve({ value: l1, done: false });
  await flush(); assert.deepEqual(emitted, [l1]); assert.deepEqual(reads, { left: 1, right: 1 });
  sends.shift().resolve(); await flush(); assert.deepEqual(emitted, [l1, r1]);
  waiting.left.shift().resolve({ value: l2, done: false }); await flush();
  sends.shift().resolve(); await flush(); assert.deepEqual(emitted, [l1, r1, l2]);
  waiting.right.shift().resolve({ value: r2, done: false }); await flush();
  sends.shift().resolve(); await flush(); assert.deepEqual(emitted, [l1, r1, l2, r2]);
  waiting.left.shift().resolve({ done: true }); await flush(); let ended = false; void done.then(() => { ended = true; });
  sends.shift().resolve(); await flush(); assert.equal(ended, false);
  waiting.right.shift().resolve({ done: true }); await done; assert.equal(ended, true);
  assert.deepEqual(reads, { left: 3, right: 3 });
});

test('merge preserves earlier readiness while blocked and observes read errors', async () => {
  const queues = { a: [], b: [], c: [] }, gate = deferred(), values = [];
  const inputs = Object.fromEntries(Object.keys(queues).map(name => [name, { [Symbol.asyncIterator]() { return { next() {
    const d = deferred(); queues[name].push(d); return d.promise;
  } }; } }]));
  const done = merge(number, ['a', 'b', 'c']).create()({ inputs, send: async (_, p) => { values.push(p.value); await gate.promise; } });
  const rejected = assert.rejects(done, { message: 'read failed' });
  queues.c.shift().resolve({ value: packet(30), done: false }); await flush();
  queues.b.shift().resolve({ value: packet(20), done: false }); await flush();
  queues.a.shift().resolve({ value: packet(1), done: false }); await flush();
  assert.deepEqual(values, [30]); gate.resolve(); await flush(); assert.deepEqual(values, [30, 20, 1]);
  queues.a.shift().resolve({ done: true }); queues.c.shift().resolve({ done: true });
  queues.b.shift().resolve(Promise.reject(Error('read failed'))); await rejected;
  const run = startNetwork(graphFor(merge(number, ['a', 'b']))); const out = assert.rejects(collect(run.outputs.out), { code: 'RUN_TERMINATED' });
  run.cancel(); await out; assert.equal((await run.done).status, 'cancelled');
});

test('broadcast partial delivery survives cancellation without resending earlier branches', async () => {
  const seen = [], release = deferred(), entered = deferred(), split = broadcast(number, ['fast', 'slow']);
  const fast = component('partial-fast', () => async ctx => { for await (const p of ctx.inputs.in) seen.push(p.value); }, { in: number }, {});
  const slow = component('partial-slow', () => async () => { entered.resolve(); await release.promise; }, { in: number }, {});
  const graph = createGraph(), a = graph.add('split', split), b = graph.add('fast', fast), c = graph.add('slow', slow);
  graph.connect(a, 'fast', b, 'in', 1); graph.connect(a, 'slow', c, 'in', 1); graph.exposeInput('in', a, 'in');
  const compiled = compileGraph(graph.toSpec(), { 'broadcast@1': split, 'partial-fast@1': fast, 'partial-slow@1': slow }); assert(compiled.ok);
  const run = startNetwork(compiled.graph); await entered.promise;
  for (const n of [1, 2, 3]) await run.send('in', packet(n)); await flush();
  assert.deepEqual(seen, [1, 2]); assert(run.snapshot().channels.some(c => c.pendingSend));
  run.cancel(); assert.equal((await run.done).status, 'cancelled'); release.resolve(); await flush(); assert.deepEqual(seen, [1, 2]);
});

test('merge output stays open after one internal source closes', async () => {
  const gate = deferred(), left = component('left-source', () => async ctx => { await ctx.send('out', packet(1)); }, {}, { out: number });
  const right = component('right-source', () => async ctx => { await gate.promise; await ctx.send('out', packet(10)); }, {}, { out: number });
  const join = merge(number, ['left', 'right']), graph = createGraph(), a = graph.add('a', left), b = graph.add('b', right), c = graph.add('merge', join);
  graph.connect(a, 'out', c, 'left'); graph.connect(b, 'out', c, 'right'); graph.exposeOutput('out', c, 'out');
  const compiled = compileGraph(graph.toSpec(), { 'left-source@1': left, 'right-source@1': right, 'merge@1': join }); assert(compiled.ok);
  const run = startNetwork(compiled.graph), iterator = run.outputs.out[Symbol.asyncIterator](); assert.equal((await iterator.next()).value.value, 1);
  let settled = false; const next = iterator.next().then(result => { settled = true; return result; }); await flush(); assert.equal(settled, false);
  gate.resolve(); assert.equal((await next).value.value, 10); assert.equal((await iterator.next()).done, true); assert.equal((await run.done).status, 'completed');
});

test('broadcast honors numeric-looking declaration order even though object keys reorder', async () => {
  const order = [], node = broadcast(number, ['2', '1']);
  await node.create()({ inputs: { in: { async *[Symbol.asyncIterator]() { yield packet(1); } } }, send: async name => { order.push(name); } });
  assert.deepEqual(order, ['2', '1']);
});

test('filter operation timeout aborts its handler and suppresses late acceptance', async t => {
  const { clock } = require('./node-task-fixture.cjs'); const time = clock(t), entered = deferred(), work = deferred(); let signal;
  const node = filter(number, (_, ctx) => { signal = ctx.signal; entered.resolve(); return work.promise; });
  const run = startNetwork(graphFor(node, { taskTimeoutMs: 5 }), { timeoutMs: 20 });
  const refused = assert.rejects(collect(run.outputs.out), { code: 'RUN_TERMINATED' }); await run.send('in', packet(1)); await entered.promise;
  time.fire(5, [...time.timers].find(timer => timer.delay === 5));
  assert.deepEqual(await run.done, { status: 'failed', code: 'NODE_TIMEOUT', nodeId: 'node' }); assert.equal(signal.aborted, true);
  await refused; work.resolve(true); await flush(); assert.equal(run.snapshot().channels[1].sent, 0); assert.equal(time.timers.size, 0);
});
