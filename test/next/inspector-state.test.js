const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { join } = require('node:path');
const app = process.env.FBP_NEXT_APP;
const moduleAt = file => import(pathToFileURL(join(app, 'lib', file)));
const snapshot = { version: 1, sources: [] };

test('inspection connection rejects stale callbacks, sequences and invalid metadata; reconnect starts fresh', async () => {
  const { connectInspection } = await moduleAt('inspection-connection.ts');
  const updates = [], statuses = [];
  const sources = [];
  const create = () => { const source = { closed: 0, close() { this.closed++; } }; sources.push(source); return source; };
  const stop = connectInspection(value => updates.push(value), value => statuses.push(value), create);
  const first = sources[0];
  const message = (sequence, value = snapshot) => ({ data: JSON.stringify({ sequence, snapshot: value }) });
  first.onopen(); first.onmessage(message(2)); first.onmessage(message(1)); first.onmessage(message(2));
  assert.equal(updates.length, 1); assert.equal(statuses.at(-1), 'Live');
  first.onerror(); assert.equal(statuses.at(-1), 'Disconnected — showing stale data');
  first.onopen(); first.onmessage(message(1)); assert.equal(updates.length, 2);
  stop(); stop(); first.onmessage(message(3)); first.onopen(); first.onerror(); assert.equal(updates.length, 2);
  assert.equal(statuses.at(-1), 'Live');
  for (const data of ['{', JSON.stringify({ sequence: 0, snapshot }), JSON.stringify({ sequence: 1.5, snapshot }),
    JSON.stringify({ sequence: 1, snapshot: { version: 99, sources: [] } })]) {
    connectInspection(() => assert.fail('invalid data published'), value => statuses.push(value), create);
    const source = sources.at(-1); source.onmessage({ data });
    assert.equal(source.closed, 1); assert.equal(statuses.at(-1), 'Invalid inspection data');
  }
});

test('inspection stream coalesces slow readers and releases all owned resources', async t => {
  const { openInspectionStream } = await moduleAt('inspection-stream.ts');
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  let change, reads = 0, removed = 0, disposed = 0, advances = 0;
  const inventory = { snapshot() { reads++; return snapshot; }, subscribe(fn) { change = fn; return () => removed++; },
    advance() { advances++; return advances < 2; }, dispose() { disposed++; } };
  const controller = new globalThis.AbortController();
  const stream = openInspectionStream(inventory, controller.signal, 'bounded', { intervalMs: 10, leaseMs: 100 });
  for (let i = 0; i < 100; i++) change();
  const reader = stream.getReader(), decoder = new globalThis.TextDecoder();
  assert.match(decoder.decode((await reader.read()).value), /"sequence":1,/);
  assert.match(decoder.decode((await reader.read()).value), /"sequence":101,/);
  t.mock.timers.tick(30); assert.equal(advances, 2);
  t.mock.timers.tick(70); assert.equal(disposed, 1); assert.equal(removed, 1);
  assert((await reader.read()).done); controller.abort(); change(); assert.equal(reads, 101);
  const abort = new globalThis.AbortController(); abort.abort();
  const pre = openInspectionStream(inventory, abort.signal, 'pre-aborted');
  assert((await pre.getReader().read()).done);
  const cancelled = openInspectionStream(inventory, new globalThis.AbortController().signal, 'cancel');
  await cancelled.cancel(); assert.equal(disposed, 3);
  const aborted = new globalThis.AbortController();
  const pending = openInspectionStream(inventory, aborted.signal, 'abort');
  aborted.abort(); const pendingReader = pending.getReader(); await pendingReader.read(); assert((await pendingReader.read()).done);
  const broken = openInspectionStream({ ...inventory, snapshot() { throw Error('private'); } },
    new globalThis.AbortController().signal, 'broken');
  await assert.rejects(broken.getReader().read(), /Inspection unavailable/);
  assert.equal(disposed, 5); assert.equal(removed, 5);
});

test('diagram uses model edges and safe synthetic IDs, including unattributed subscriptions', async () => {
  const { inspectionDiagram } = await moduleAt('inspection-diagram.ts');
  const dispatcher = { id: 'events', kind: 'dispatcher', topology: { version: 1, events: [{ name: '<script>' }],
    publishers: [{ id: 1, ownerId: 'publisher', event: '<script>', provenance: 'declared' }], subscribers: [
      { id: 1, ownerId: null, event: '<script>', callbackName: 'listener', once: true },
      { id: 2, ownerId: 'owner', event: '<script>', callbackName: 'listener', once: false }] } };
  const diagram = inspectionDiagram(dispatcher);
  assert.deepEqual(diagram.edges.map(e => e.kind), ['declared', 'active', 'active']);
  assert.equal(diagram.vertices[0].label, '<script>'); assert.equal(diagram.vertices[2].label, 'Unassigned');
  assert(diagram.vertices.every(v => !v.id.includes('<')));
  dispatcher.topology.events.unshift({ name: 'aaa' });
  assert.equal(inspectionDiagram(dispatcher).vertices.find(vertex => vertex.label === '<script>').id, diagram.vertices[0].id,
    'Adding an earlier event must not redirect an existing selection');
  const descriptor = { contractId: 'json@1', representationId: 'json@1', schema: {} };
  const component = { id: 'echo', version: 1, title: 'Echo', description: '', in: { in: descriptor }, out: { out: descriptor } };
  const graph = { id: 'graph', kind: 'graph', run: null, catalog: { version: 1, components: [component] }, spec: {
    version: 1, nodes: [{ id: 'first', component: 'echo@1' }, { id: 'second', component: 'echo@1' }],
    edges: [{ from: { node: 'first', port: 'out' }, to: { node: 'second', port: 'in' } }],
    inputs: { request: { node: 'first', port: 'in' } }, outputs: { result: { node: 'second', port: 'out' } } } };
  assert.equal(inspectionDiagram(graph).edges[0].label, 'out → in · capacity default');
  graph.spec.edges[0].capacity = 2; assert.equal(inspectionDiagram(graph).edges[0].label, 'out → in · capacity 2');
  graph.spec.inputs.request.port = 'missing'; assert.equal(inspectionDiagram(graph), null);
});


test('diagram arrows meet card boundaries in both axes and directions', async () => {
  const { positionVertices, connectionPath } = await moduleAt('inspection-layout.ts');
  const vertices = positionVertices([
    { id: 'a', label: 'a', details: '', lines: [], column: 0 },
    { id: 'b', label: 'b', details: '', lines: ['one', 'two'], column: 0 },
    { id: 'c', label: 'c', details: '', lines: [], column: 1 }
  ]);
  const [a, b, c] = vertices;
  assert.equal(connectionPath(a, b), 'M150,100 L150,125');
  assert.equal(connectionPath(b, a), 'M150,125 L150,100');
  assert.equal(connectionPath(a, c), 'M280,50 L320,50');
  assert.equal(connectionPath(c, a), 'M320,50 L280,50');
  assert.equal(b.height, 90); assert.equal(a.height, 80);
});


test('disposing an inspection fixture before run settlement releases callbacks and drains cancellation', async () => {
  const { command } = await import('../../scripts/next/process.mjs');
  const source = pathToFileURL(join(app, 'lib/inspection-fixture.ts')).href;
  const result = await command(process.execPath, ['--conditions=react-server', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    const { createInspectionFixture } = await import(${JSON.stringify(source)});
    const inventory = createInspectionFixture();
    let notifications = 0;
    const stop = inventory.subscribe(() => notifications++);
    stop(); inventory.dispose();
    await new Promise(setImmediate);
    assert.equal(notifications, 0);
    assert.deepEqual(inventory.snapshot().sources, []);
  `], { cwd: app, env: { NODE_V8_COVERAGE: join(process.env.FBP_NEXT_EVIDENCE, 'v8-test') } });
  assert.equal(result.code, 0, result.output);
});
