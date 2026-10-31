const { test } = require('node:test');
const { assert, number, graphFor, startNetwork, packet, collect, flush } = require('./node-task-fixture.cjs');
const { joinByKey } = require('../dist/cjs');
const make = options => joinByKey({ a: number, b: number }, { outputId: 'joined@1', ...options });
const item = (value, key = 'x', jobId = 'job') => packet(value, { key, jobId });
async function failed(options, messages, code) {
  const run = startNetwork(graphFor(make(options))); const values = [];
  const output = (async () => { try { for await (const p of run.outputs.out) values.push(p); } catch (error) { assert.equal(error.code, 'RUN_TERMINATED'); } })();
  for (const [port, p] of messages) { try { await run.send(port, p); } catch (error) { assert.equal(error.code, 'RUN_TERMINATED'); } await flush(); }
  await run.finish(); await output; assert.equal((await run.done).code, code); return values;
}

test('join by key not arrival derives complete groups in completion order', async () => {
  const run = startNetwork(graphFor(make())), output = collect(run.outputs.out);
  const ax = item(1), ay = item(2, 'y'), by = item(20, 'y'), bx = item(10);
  for (const [port, p] of [['a', ax], ['a', ay], ['b', by], ['b', bx]]) { await run.send(port, p); await flush(); }
  assert.equal((await run.finish()).status, 'completed'); const results = await output;
  assert.deepEqual(results.map(p => [p.key, p.value]), [['y', { a: 2, b: 20 }], ['x', { a: 1, b: 10 }]]);
  assert.deepEqual(results.map(p => p.parentPacketIds), [[ay.packetId, by.packetId], [ax.packetId, bx.packetId]]);
  assert(results.every(p => p.jobId === 'job' && ![ax, ay, bx, by].some(input => p.packetId === input.packetId)));
});

test('join bounds and incomplete groups refuse without partial output', async () => {
  assert.deepEqual(await failed({}, [['a', item(1)], ['a', item(2)]], 'DUPLICATE_KEY'), []);
  assert.deepEqual(await failed({ maxKeys: 1 }, [['a', item(1)], ['a', item(2, 'y')]], 'JOIN_CAPACITY'), []);
  assert.deepEqual(await failed({}, [['a', item(1)]], 'JOIN_INCOMPLETE'), []);
  assert.deepEqual(await failed({}, [['a', packet(1, { jobId: 'job' })]], 'INVALID_PACKET'), []);
});

test('completed groups cannot reopen and completed history cannot evict', async () => {
  const messages = [['a', item(1)], ['b', item(10)], ['a', item(2)]];
  const reused = await failed({}, messages, 'JOIN_GROUP_COMPLETED'); assert.equal(reused.length, 1);
  const full = await failed({ completedGroupLimit: 1 }, [['a', item(1)], ['b', item(10)], ['a', item(2, 'y')], ['b', item(20, 'y')]], 'JOIN_HISTORY_CAPACITY');
  assert.equal(full.length, 1); assert.deepEqual(full[0].value, { a: 1, b: 10 });
});

test('job-scoped join keeps jobs separate and rejects mismatched revision keys', async () => {
  const run = startNetwork(graphFor(make())), output = collect(run.outputs.out);
  const a42 = item(1, 'x', 'job-42'), b43 = item(10, 'x', 'job-43'), a43 = item(2, 'x', 'job-43'), b42 = item(20, 'x', 'job-42');
  for (const [port, p] of [['a', a42], ['b', b43], ['a', a43], ['b', b42]]) { await run.send(port, p); await flush(); }
  await run.finish(); const values = await output;
  assert.deepEqual(values.map(p => [p.jobId, p.value]), [['job-43', { a: 2, b: 10 }], ['job-42', { a: 1, b: 20 }]]);
  assert.deepEqual(values.map(p => p.parentPacketIds), [[a43.packetId, b43.packetId], [a42.packetId, b42.packetId]]);
  assert.deepEqual(await failed({}, [['a', a42], ['b', b43]], 'JOIN_INCOMPLETE'), []);
  assert.deepEqual(await failed({}, [['a', item(1, 'person@r6')], ['b', item(2, 'person@r7')]], 'JOIN_INCOMPLETE'), []);
  assert.deepEqual(await failed({ maxKeys: 1 }, [['a', a42], ['b', b43]], 'JOIN_CAPACITY'), []);
});

test('join releases incomplete capacity, retains markers, and isolates concurrent runs', async () => {
  const graph = graphFor(make({ maxKeys: 1, completedGroupLimit: 2 }));
  const first = startNetwork(graph), second = startNetwork(graph), a = collect(first.outputs.out), b = collect(second.outputs.out);
  for (const key of ['x', 'y']) {
    await Promise.all([first.send('a', item(1, key)), second.send('b', item(20, key))]);
    await Promise.all([first.send('b', item(10, key)), second.send('a', item(2, key))]); await flush();
  }
  await Promise.all([first.finish(), second.finish()]);
  assert.deepEqual((await a).map(p => p.value), [{ a: 1, b: 10 }, { a: 1, b: 10 }]);
  assert.deepEqual((await b).map(p => p.value), [{ a: 2, b: 20 }, { a: 2, b: 20 }]);
  assert.deepEqual(await failed({ completedGroupLimit: 2 }, [['a', item(1)], ['b', item(10)], ['a', item(2, 'y')], ['b', item(20, 'y')], ['b', item(30)]], 'JOIN_GROUP_COMPLETED').then(v => v.length), 2);
});

test('runtime duplicate admission precedes join grouping without corrupting the group', async () => {
  const run = startNetwork(graphFor(make())), output = collect(run.outputs.out), p = item(1);
  await run.send('a', p); await assert.rejects(run.send('b', p), { code: 'DUPLICATE_PACKET' });
  await run.send('b', item(10)); await run.finish(); assert.deepEqual((await output).map(p => p.value), [{ a: 1, b: 10 }]);
});

test('join authoring validates bounds, output identity and data-only inputs/options', () => {
  const { jsonContract, contract } = require('../dist/cjs'); const { z } = require('zod');
  for (const count of [0, 1, 257]) assert.throws(() => joinByKey(Object.fromEntries(Array.from({ length: count }, (_, i) => ['p' + i, number])), { outputId: 'bounds@1' }), { code: 'INVALID_ARGUMENT' });
  for (const name of ['maxKeys', 'completedGroupLimit']) {
    for (const value of [0, -1, 1.5, NaN, Infinity, '1', null, undefined, name === 'maxKeys' ? 4097 : 1048577]) assert.throws(() => make({ [name]: value }), { code: 'INVALID_ARGUMENT' });
  }
  assert.doesNotThrow(() => make({ maxKeys: 4096, completedGroupLimit: 1048576 }));
  for (const outputId of [undefined, null, 1, '', 'bare', '@1', 'name@', 'json@1', 'x'.repeat(129)]) assert.throws(() => make({ outputId }), { code: 'INVALID_ARGUMENT' });
  for (const options of [null, undefined, { outputId: 'out@1', extra: true }]) assert.throws(() => joinByKey({ a: number, b: number }, options), { code: 'INVALID_ARGUMENT' });
  assert.throws(() => make({ outputId: 'number@1' }), { code: 'CONTRACT_ID_CONFLICT' });
  for (const inputs of [null, { a: number, b: {} }, { a: number, '': number }, { a: number, ['x'.repeat(129)]: number }]) assert.throws(() => joinByKey(inputs, { outputId: 'out@1' }), { code: 'INVALID_ARGUMENT' });
  let getters = 0;
  for (const target of ['inputs', 'options']) {
    const bad = Object.defineProperty({}, 'a', { get() { getters++; return number; } });
    assert.throws(() => joinByKey(target === 'inputs' ? bad : { a: number, b: number }, target === 'options' ? bad : { outputId: 'out@1' }), { code: 'INVALID_ARGUMENT' });
  }
  assert.equal(getters, 0);
  const nested = contract('nested@1', z.strictObject({ label: z.string() }));
  const inputs = { a: nested, b: jsonContract }, options = { outputId: 'product@1', maxKeys: 1 };
  const node = joinByKey(inputs, options); inputs.a = number; options.outputId = 'changed@1';
  assert.equal(node.out.out.id, 'product@1'); assert.equal(node.out.out.validate({ a: { label: 'ok' }, b: { any: [1, true] } }), true);
  for (const value of [null, [], 3, { a: { label: 'ok' } }, { a: { label: 3 }, b: null }, { a: { label: 'ok' }, b: null, extra: 1 }, { a: { label: 'ok' }, b: undefined }]) assert.equal(node.out.out.validate(value), false);
  assert(Object.isFrozen(node.out.out.schema)); assert.deepEqual(node.out.out.schema.required, ['a', 'b']);
  assert.equal(node.out.out.schema.additionalProperties, false); assert.deepEqual(node.out.out.schema.properties.a, nested.schema);
  const { defineComponent, describeRegistry } = require('../dist/cjs');
  const first = defineComponent({ ...make({ outputId: 'shared-product@1' }), id: 'first' });
  const second = defineComponent({ ...joinByKey({ a: number, b: nested }, { outputId: 'shared-product@1' }), id: 'second' });
  assert.throws(() => describeRegistry({ 'first@1': first, 'second@1': second }), { code: 'CONTRACT_ID_CONFLICT' });
});

test('join accepts 256 inputs and preserves all parents in declaration order', async () => {
  const names = Array.from({ length: 256 }, (_, i) => 'p' + i), node = joinByKey(Object.fromEntries(names.map(name => [name, number])), { outputId: 'large-join@1' });
  const run = startNetwork(graphFor(node)), output = collect(run.outputs.out), inputs = names.map((_, i) => item(i));
  for (let index = 255; index >= 0; index--) await run.send(names[index], inputs[index]);
  await run.finish(); const values = await output; assert.equal(values.length, 1);
  assert.deepEqual(values[0].parentPacketIds, inputs.map(p => p.packetId)); assert.deepEqual(Object.keys(values[0].value), names);
});

test('join supports arbitrary JSON contracts and safe property names in the compiler/model', async () => {
  const { jsonContract, describeRegistry } = require('../dist/cjs'); const { validateCatalog } = require('../dist/cjs/model');
  const node = joinByKey(Object.fromEntries([['__proto__', jsonContract], ['constructor', number]]), { outputId: 'safe-product@1' });
  assert.equal(validateCatalog(describeRegistry({ 'join-by-key@1': node })).ok, true);
  const run = startNetwork(graphFor(node)), output = collect(run.outputs.out);
  await run.send('__proto__', item({ nested: [null, 1, 'ok'] })); await run.send('constructor', item(2)); await run.finish();
  const value = (await output)[0].value; assert.equal(Object.hasOwn(value, '__proto__'), true); assert.deepEqual(value.__proto__, { nested: [null, 1, 'ok'] }); assert.equal(value.constructor, 2);
  const schema = node.out.out; const { getContractIssues } = require('../dist/cjs/contracts');
  const issues = getContractIssues(schema, { constructor: 'private' });
  assert(issues.some(i => i.path[0] === 'constructor')); assert(issues.some(i => i.path[0] === '__proto__'));
  assert(!JSON.stringify(issues).includes('private')); assert(Object.isFrozen(issues));
  const { assertDescriptorSchema } = require('../dist/cjs/model/contracts');
  assert.throws(() => assertDescriptorSchema({}), { code: 'INVALID_CATALOG' });
  assert.throws(() => assertDescriptorSchema({ type: 'array', items: {} }), { code: 'INVALID_CATALOG' });
});

test('completion markers reserve before delivery and history-full final members are not accepted', () => {
  const { JoinGroups } = require('../dist/cjs/components/join-by-key/groups');
  const groups = new JoinGroups(['a', 'b'], 1, 1);
  assert.equal(groups.accept('b', item(10)), undefined); const parents = groups.accept('a', item(1));
  assert.deepEqual(parents.map(p => p.value), [1, 10]);
  // No output has been delivered: completion is already reserved.
  assert.throws(() => groups.accept('a', item(2)), { code: 'JOIN_GROUP_COMPLETED' });
  assert.equal(groups.accept('a', item(2, 'y')), undefined);
  for (let attempt = 0; attempt < 2; attempt++) assert.throws(() => groups.accept('b', item(20, 'y')), { code: 'JOIN_HISTORY_CAPACITY' });
  assert.throws(() => groups.accept('a', item(3, 'y')), { code: 'DUPLICATE_KEY' });
  assert.throws(() => groups.accept('b', item(30)), { code: 'JOIN_GROUP_COMPLETED' }); groups.clear();
});

test('join output backpressure stops group consumption and cancellation releases parked work', async () => {
  const run = startNetwork(graphFor(make({ maxKeys: 1 })));
  for (let n = 0; n < 20; n++) { await run.send('a', item(n, String(n))); await run.send('b', item(n, String(n))); }
  await flush(); const channel = run.snapshot().channels.find(c => c.id === 'output:out');
  assert.equal(channel.sent, 16); assert.equal(channel.pendingSend, true); assert.equal(channel.queued, 16);
  const output = collect(run.outputs.out); await run.finish(); assert.equal((await output).length, 20); assert.equal((await run.done).status, 'completed');
  const cancelled = startNetwork(graphFor(make())); await cancelled.send('a', item(1)); await flush();
  const refused = assert.rejects(collect(cancelled.outputs.out), { code: 'RUN_TERMINATED' }); cancelled.cancel(); await refused;
  assert.equal((await cancelled.done).status, 'cancelled');
});

test('join aggregate payload limits are validated before output admission with attributed safe details', async () => {
  const { jsonContract } = require('../dist/cjs'); const node = joinByKey({ a: jsonContract, b: jsonContract }, { outputId: 'large-product@1' });
  const run = startNetwork(graphFor(node)), output = assert.rejects(collect(run.outputs.out), { code: 'RUN_TERMINATED' });
  await run.send('a', item('x'.repeat(600000))); await run.send('b', item('y'.repeat(600000))); await run.finish(); await output;
  assert.equal((await run.done).code, 'OUTPUT_CONTRACT'); const report = run.snapshot().diagnostics.find(d => d.validation).validation;
  assert.equal(report.contractId, 'large-product@1'); assert.equal(report.direction, 'output'); assert.equal(report.runId, run.runId);
  assert.equal(run.snapshot().channels.find(c => c.id === 'output:out').sent, 0); assert(!JSON.stringify(report).includes('x'.repeat(100)));
});

test('join defaults bound incomplete tuples and overall timeout owns an indefinitely missing input', async t => {
  const { joinOptions } = require('../dist/cjs/components/join-by-key/options');
  assert.deepEqual(joinOptions({ outputId: 'default@1' }), { outputId: 'default@1', maxKeys: 128, completedGroupLimit: 65536 });
  assert.deepEqual(await failed({}, Array.from({ length: 129 }, (_, i) => ['a', item(i, String(i))]), 'JOIN_CAPACITY'), []);
  const { clock } = require('./node-task-fixture.cjs'), time = clock(t);
  const run = startNetwork(graphFor(make(), { taskTimeoutMs: 5 }), { timeoutMs: 20 });
  const refused = assert.rejects(collect(run.outputs.out), { code: 'RUN_TERMINATED' }); await run.send('a', item(1)); await flush();
  assert.deepEqual([...time.timers].map(timer => timer.delay), [20]); time.fire(20, [...time.timers][0]);
  assert.equal((await run.done).code, 'TIMEOUT'); await refused; assert.equal(time.timers.size, 0);
  await assert.rejects(run.send('b', item(10)), { code: 'RUN_TERMINATED' });
});

test('join retains completion protection after its EOF until the entire run terminates', async t => {
  const { JoinGroups } = require('../dist/cjs/components/join-by-key/groups');
  const { onProcessRunEnd } = require('../dist/cjs/runtime/context-validation');
  assert.throws(() => onProcessRunEnd({}, () => {}), { code: 'INVALID_ARGUMENT' });
  const { deferred, component, createGraph, compileGraph } = require('./node-task-fixture.cjs');
  const entered = deferred(), gate = deferred(), cleanupStates = [], clear = JoinGroups.prototype.clear; let run;
  t.after(() => gate.resolve());
  t.mock.method(JoinGroups.prototype, 'clear', function () { cleanupStates.push(run.snapshot().status); return clear.call(this); });
  const join = make(), sink = component('join-sink', () => async ctx => {
    for await (const p of ctx.inputs.in) { void p; entered.resolve(); await gate.promise; }
  }, { in: join.out.out }, {});
  const graph = createGraph(), a = graph.add('join', join), b = graph.add('sink', sink);
  graph.connect(a, 'out', b, 'in'); graph.exposeInput('a', a, 'a'); graph.exposeInput('b', a, 'b');
  const compiled = compileGraph(graph.toSpec(), { 'join-by-key@1': join, 'join-sink@1': sink }); assert(compiled.ok);
  run = startNetwork(compiled.graph); await run.send('a', item(1)); await run.send('b', item(10)); const done = run.finish();
  await entered.promise; await flush(); assert.equal(run.snapshot().nodes.find(n => n.id === 'join').status, 'completed');
  assert.deepEqual(cleanupStates, []); gate.resolve(); assert.equal((await done).status, 'completed'); assert.deepEqual(cleanupStates, ['completed']);
});
