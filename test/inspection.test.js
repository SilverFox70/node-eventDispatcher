const { test } = require('node:test');
const { assert, component, echo, createGraph, compileGraph, startNetwork, packet, collect } = require('./runtime-fixture.cjs');
const { createInspectionScope, createDispatcher, describeRegistry } = require('../dist/cjs');
function fixture(id = 'echo') {
  const node = component(id, echo), registry = { [`${id}@1`]: node }, catalog = describeRegistry(registry);
  const builder = createGraph(), n = builder.add('node', node); builder.exposeInput('in', n, 'in'); builder.exposeOutput('out', n, 'out');
  const spec = builder.toSpec(), compiled = compileGraph(spec, registry); assert(compiled.ok); return { spec, catalog, graph: compiled.graph };
}

test('explicit scoped inventory contains registered graphs and current dispatcher only', async t => {
  const a = fixture(), b = fixture('second'), run = startNetwork(a.graph), output = collect(run.outputs.out);
  t.after(() => run.cancel()); void output.catch(() => {});
  const events = createDispatcher(), scope = createInspectionScope(), unrelated = createInspectionScope();
  scope.addGraph('live', { spec: a.spec, catalog: a.catalog, run }); scope.addGraph('idle', { spec: b.spec, catalog: b.catalog });
  scope.addDispatcher('events', events); events.on('changed', function update() {}, { ownerId: 'screen' }); events.declarePublisher('service', 'changed');
  const snapshot = scope.snapshot(); assert.deepEqual(snapshot.sources.map(s => [s.id, s.kind]), [['live', 'graph'], ['idle', 'graph'], ['events', 'dispatcher']]);
  assert.equal(snapshot.sources[0].run.runId, run.runId); assert.equal(snapshot.sources[1].run, null); assert.equal(snapshot.sources[2].topology.subscribers.length, 1);
  assert.deepEqual(unrelated.snapshot().sources, []); await run.send('in', packet(2)); await run.finish(); await output;
});

test('scope rejects mismatched runs before registering a source', () => {
  const a = fixture(), b = fixture('other'), run = startNetwork(b.graph), scope = createInspectionScope();
  try { assert.throws(() => scope.addGraph('wrong', { spec: a.spec, catalog: a.catalog, run }), { code: 'RUN_GRAPH_MISMATCH' }); }
  finally { run.cancel(); }
  assert.deepEqual(scope.snapshot().sources, []);
});

test('registration snapshots exact definitions, rejects invalid sources, and preserves source generations', async () => {
  const a = fixture(), run = startNetwork(a.graph), output = collect(run.outputs.out), scope = createInspectionScope();
  const spec = JSON.parse(JSON.stringify(a.spec)), catalog = JSON.parse(JSON.stringify(a.catalog));
  const remove = scope.addGraph('same', { spec, catalog, run });
  spec.nodes[0].id = 'mutated'; catalog.components[0].title = 'mutated';
  assert.equal(scope.snapshot().sources[0].spec.nodes[0].id, 'node'); assert.equal(scope.snapshot().sources[0].catalog.components[0].title, 'echo');
  assert.throws(() => scope.addDispatcher('same', createDispatcher()), { code: 'DUPLICATE_SOURCE' });
  for (const id of ['', 'x'.repeat(129), null, 1]) assert.throws(() => scope.addGraph(id, a), { code: 'INVALID_ARGUMENT' });
  for (const source of [null, {}, { spec: a.spec, catalog: a.catalog, extra: 1 }, { spec: {}, catalog: a.catalog }, { spec: a.spec, catalog: {} }]) assert.throws(() => scope.addGraph('invalid', source), { code: 'INVALID_GRAPH' });
  assert.throws(() => scope.addGraph('fake', { spec: a.spec, catalog: a.catalog, run: { snapshot() { throw Error('must not call'); } } }), { code: 'RUN_GRAPH_MISMATCH' });
  const changed = JSON.parse(JSON.stringify(a.catalog)); changed.components[0].description = 'different public metadata';
  assert.throws(() => scope.addGraph('wrong-metadata', { spec: a.spec, catalog: changed, run }), { code: 'RUN_GRAPH_MISMATCH' });
  remove(); remove(); scope.addGraph('same', { spec: a.spec, catalog: a.catalog }); remove();
  assert.equal(scope.snapshot().sources.length, 1); assert.equal(scope.snapshot().sources[0].run, null);
  await run.send('in', packet(2)); await run.finish(); assert.equal((await output)[0].value, 2);
});

test('disposal leaves subscriptions active and snapshots show once and unsubscribe changes', () => {
  const events = createDispatcher(), scope = createInspectionScope(); let calls = 0;
  function subscriber() { calls++; }
  events.on('changed', subscriber); events.once('changed', () => { calls++; }, { ownerId: 'screen' });
  const publisher = events.declarePublisher('service', 'changed'), dispose = scope.addDispatcher('events', events);
  const first = scope.snapshot(); assert.equal(first.sources[0].topology.subscribers.length, 2); assert.equal(calls, 0);
  assert(Object.isFrozen(first.sources[0].topology.subscribers[0])); events.emit('changed');
  assert.equal(scope.snapshot().sources[0].topology.subscribers.length, 1); assert.equal(first.sources[0].topology.subscribers.length, 2);
  events.off('changed', subscriber); publisher(); assert.deepEqual(scope.snapshot().sources[0].topology.events, []);
  events.on('later', subscriber); dispose(); dispose(); events.emit('later'); assert.equal(calls, 3); assert.deepEqual(scope.snapshot().sources, []);
});

test('inspection does not retain live packet payloads or execute source accessors', async () => {
  const { jsonContract } = require('../dist/cjs');
  const node = component('json-echo', echo, { in: jsonContract }, { out: jsonContract });
  const graph = createGraph(), h = graph.add('echo', node); graph.exposeInput('in', h, 'in'); graph.exposeOutput('out', h, 'out');
  const spec = graph.toSpec(), catalog = describeRegistry({ 'json-echo@1': node });
  const run = startNetwork(compileGraph(spec, { 'json-echo@1': node }).graph), scope = createInspectionScope(), output = collect(run.outputs.out);
  scope.addGraph('echo', { spec, catalog, run }); const before = scope.snapshot();
  for (let i = 0; i < 50; i++) await run.send('in', packet({ secret: 'LIVE_PAYLOAD_CANARY', i }, { jobId: 'job-canary', key: 'key-canary' }));
  await run.finish(); const packets = await output; assert.equal(packets.length, 50);
  const after = scope.snapshot(), encoded = JSON.stringify(after);
  for (const secret of ['LIVE_PAYLOAD_CANARY', 'job-canary', 'key-canary', packets[0].packetId, 'packetId', 'registry', 'create']) assert(!encoded.includes(secret));
  assert.deepEqual(after.sources[0].spec, before.sources[0].spec); assert.equal(after.sources[0].run.status, 'completed'); assert.deepEqual(after, scope.snapshot());
  assert(Object.isFrozen(after.sources[0].run.channels[0]));
  let getters = 0; const hostile = Object.defineProperty({}, 'spec', { get() { getters++; return spec; } });
  assert.throws(() => scope.addGraph('bad', hostile), { code: 'INVALID_GRAPH' });
  assert.throws(() => scope.addDispatcher('bad', Object.defineProperty({}, 'inspect', { get() { getters++; return () => {}; } })), { code: 'INVALID_ARGUMENT' });
  assert.equal(getters, 0);
});

test('run association ignores object-key order but keeps exact array/metadata identity', () => {
  const a = fixture(), run = startNetwork(a.graph), scope = createInspectionScope();
  const reverse = item => Array.isArray(item) ? item.map(reverse) : item !== null && typeof item === 'object' ? Object.fromEntries(Object.entries(item).reverse().map(([key, value]) => [key, reverse(value)])) : item;
  scope.addGraph('reordered', { spec: reverse(a.spec), catalog: reverse(a.catalog), run }); run.cancel();
  assert.equal(scope.snapshot().sources[0].run.status, 'cancelled');
});

test('dispatcher registration and sampling refuse malformed topology without registration pollution', () => {
  const scope = createInspectionScope(), empty = { version: 1, events: [], subscribers: [], publishers: [] };
  for (const dispatcher of [null, {}, { inspect: 1 }, { inspect() { throw Error('private'); } }, { inspect: () => ({ ...empty, secret: 1 }) }]) assert.throws(() => scope.addDispatcher('bad', dispatcher), { code: 'INVALID_ARGUMENT' });
  let current = empty, calls = 0; const dispatcher = { inspect() { calls++; return current; } };
  const remove = scope.addDispatcher('valid', dispatcher); assert.equal(calls, 1);
  assert.throws(() => scope.addDispatcher('valid', dispatcher), { code: 'DUPLICATE_SOURCE' }); assert.equal(calls, 1);
  current = { ...empty, version: 2 }; assert.throws(() => scope.snapshot(), { code: 'INVALID_ARGUMENT' });
  remove(); assert.deepEqual(scope.snapshot().sources, []);
});

test('topology guards reject malformed events, owners and local relationship identities', () => {
  const { captureTopology } = require('../dist/cjs/model/inspection/topology');
  const base = { version: 1, events: [{ name: 'event' }], publishers: [{ id: 1, event: 'event', ownerId: 'owner', provenance: 'declared' }],
    subscribers: [{ id: 1, event: 'event', ownerId: 'owner', callbackName: 'handler', once: true }] };
  const mutate = fn => { const value = JSON.parse(JSON.stringify(base)); fn(value); return value; };
  const bad = [null, {}, { ...base, version: 2 }, { ...base, events: {} }, { ...base, subscribers: {} }, { ...base, publishers: {} },
    mutate(v => v.events.push({ name: 'unused' })), mutate(v => v.events.push({ name: 'event' })), mutate(v => { v.events[0].name = ''; }),
    mutate(v => { v.events[0] = { wrong: 'event' }; }), mutate(v => { v.events[0].extra = 1; }), mutate(v => { delete v.events[0].name; })];
  for (const kind of ['publishers', 'subscribers']) {
    for (const id of [0, -1, '1', 1.5]) bad.push(mutate(v => { v[kind][0].id = id; }));
    bad.push(mutate(v => v[kind].push(v[kind][0])));
    for (const event of ['', 'unknown']) bad.push(mutate(v => { v[kind][0].event = event; }));
    for (const ownerId of ['', 'x'.repeat(129), 1]) bad.push(mutate(v => { v[kind][0].ownerId = ownerId; }));
  }
  bad.push(mutate(v => { v.publishers[0].ownerId = null; }), mutate(v => { v.publishers[0].provenance = 'inferred'; }),
    mutate(v => { v.subscribers[0].callbackName = ''; }), mutate(v => { v.subscribers[0].once = 'yes'; }));
  for (const value of bad) assert.throws(() => captureTopology(value), { code: 'INVALID_ARGUMENT' });
  assert.deepEqual(captureTopology(base), base);
});

test('reentrant registration cannot overwrite a source registered during dispatcher sampling', () => {
  const scope = createInspectionScope(), dispatcher = createDispatcher();
  assert.throws(() => scope.addDispatcher('same', { inspect() { scope.addDispatcher('same', dispatcher); return dispatcher.inspect(); } }), { code: 'DUPLICATE_SOURCE' });
  assert.equal(scope.snapshot().sources.length, 1);
});

test('public authored examples remain metadata while run association preserves null and boolean values', () => {
  const { defineComponent, jsonContract } = require('../dist/cjs');
  const node = defineComponent({ id: 'examples', version: 1, title: 'Examples', description: '', in: { in: jsonContract }, out: { out: jsonContract },
    examples: [{ in: { in: null }, out: { out: false } }], create: echo });
  const graph = createGraph(), h = graph.add('node', node); graph.exposeInput('in', h, 'in'); graph.exposeOutput('out', h, 'out');
  const spec = graph.toSpec(), catalog = describeRegistry({ 'examples@1': node }), run = startNetwork(compileGraph(spec, { 'examples@1': node }).graph);
  const scope = createInspectionScope(); scope.addGraph('examples', { spec, catalog, run }); run.cancel();
  assert.deepEqual(scope.snapshot().sources[0].catalog.components[0].examples[0], { in: { in: null }, out: { out: false } });
});
