const { test } = require('node:test');
const assert = require('node:assert/strict');
const f = require('../dist/cjs');
const { z } = require('zod');
const model = require('../dist/cjs/model');
const testing = require('../dist/cjs/testing');

const config = f.contract('multiplier-config@1', z.strictObject({ factor: z.number() }));
const spec = (version, nodes) => ({ version, nodes, edges: [], inputs: {}, outputs: {} });
const invalid = { ok: false, issues: [{ code: 'CONFIG_INVALID', path: '$.nodes[0].config' }] };

test('v2 unconfigured wiring compiles and refuses unowned config', () => {
  const echo = f.defineComponent({ id: 'echo', version: 1, title: 'Echo', description: '', in: {}, out: {},
    create: () => async () => {} });
  const registry = { 'echo@1': echo }, node = { id: 'a', component: 'echo@1' };
  assert.equal(f.compileGraph(spec(1, [node]), registry).ok, true);
  const builder = f.createGraph();
  assert.throws(() => builder.add('a', echo, { config: null }), { code: 'CONFIG_INVALID' });
  builder.add('a', echo);
  assert.equal(builder.toSpec().version, 1);
  assert.equal(f.compileGraph(spec(2, [node]), registry).ok, true);
  assert.deepEqual(f.compileGraph(spec(2, [{ ...node, config: {} }]), registry), invalid);
  for (const version of [1, 3]) assert.deepEqual(f.compileGraph(spec(version, [{ ...node, config: {} }]), registry),
    { ok: false, issues: [{ code: 'INVALID_GRAPH', path: '$' }] });
});

test('configured factories receive distinct frozen bindings on every run', async () => {
  const calls = [];
  const node = f.defineConfiguredComponent({ id: 'multiply', version: 1, title: 'Multiply', description: '',
    configuration: config, in: { in: f.jsonContract }, out: { out: f.jsonContract },
    create: value => {
      calls.push(value);
      return async ctx => { for await (const packet of ctx.inputs.in) await ctx.send('out', f.derivePacket(packet.value * value.factor, [packet])); };
    } });
  const builder = f.createGraph();
  const first = { factor: 2 };
  const a = builder.add('a', node, { config: first }), b = builder.add('b', node, { config: { factor: 3 }, taskTimeoutMs: 200 });
  first.factor = 99;
  builder.exposeInput('a', a, 'in'); builder.exposeInput('b', b, 'in');
  builder.exposeOutput('a', a, 'out'); builder.exposeOutput('b', b, 'out');
  const graph = builder.toSpec(), registry = { 'multiply@1': node };
  assert.equal(graph.version, 2);
  const catalog = f.describeRegistry(registry);
  assert.equal(catalog.version, 2); assert(model.validateCatalog(catalog).ok);
  assert(model.validateGraph(graph, catalog).ok);
  const compiled = f.compileGraph(graph, registry);
  assert(compiled.ok); assert.equal(calls.length, 0);
  const result = await testing.runGraph(compiled.graph, { inputs: { a: [f.packet(4)], b: [f.packet(4)] } });
  assert.deepEqual([result.outputs.a[0].value, result.outputs.b[0].value], [8, 12]);
  const run = f.startNetwork(compiled.graph);
  const scope = f.createInspectionScope();
  const dispose = scope.addGraph('configured', { spec: graph, catalog, run });
  assert.match(model.toMermaid(scope.snapshot()), /Multiply/);
  dispose();
  await Promise.all([run.finish(), Array.fromAsync(run.outputs.a), Array.fromAsync(run.outputs.b)]);
  assert.deepEqual(calls, [{ factor: 2 }, { factor: 3 }, { factor: 2 }, { factor: 3 }]); assert(calls.every(Object.isFrozen));
  const isolated = await testing.runNode(node, { config: { factor: 5 }, inputs: { in: [f.packet(4)] } });
  assert.equal(isolated.outputs.out[0].value, 20);
});

test('backend refuses invalid config and stale metadata cannot authorize factories', () => {
  let calls = 0;
  const node = f.defineConfiguredComponent({ id: 'multiply', version: 1, title: 'Multiply', description: '',
    configuration: config, in: {}, out: {}, create: () => { calls++; return async () => {}; } });
  const registry = { 'multiply@1': node }, row = { id: 'a', component: 'multiply@1' };
  const catalog = f.describeRegistry(registry);
  assert.equal(model.validateCatalog({ ...catalog, version: 1 }).ok, false);
  for (const graph of [spec(1, [row]), spec(2, [row]), spec(2, [{ ...row, config: { factor: 'two' } }])]) {
    assert.deepEqual(f.compileGraph(JSON.parse(JSON.stringify(graph)), registry), invalid);
  }
  const stale = JSON.parse(JSON.stringify(catalog));
  stale.components[0].configuration = { ...stale.components[0].configuration, contractId: 'json@1', schema: {} };
  const sibling = { ...row, id: 'b', config: { factor: 2 } };
  const raw = JSON.parse(JSON.stringify(spec(2, [{ ...row, config: { factor: 'two' } }, sibling])));
  assert(model.validateGraph(raw, stale).ok);
  assert.deepEqual(f.compileGraph(raw, registry), invalid);
  assert.equal(calls, 0);
  assert.throws(() => testing.runNode(node, { inputs: {} }), { code: 'CONFIG_INVALID' });
  assert.throws(() => testing.runNode(node, { config: null, inputs: {} }), { code: 'CONFIG_INVALID' });
  assert.throws(() => f.createGraph().add('a', node, {}), { code: 'CONFIG_INVALID' });
  assert.throws(() => f.createGraph().add('a', node, { config: { factor: 2, extra: true } }), { code: 'CONFIG_INVALID' });
});


test('configuration contracts share the port identity namespace', () => {
  const conflict = f.contract('multiplier-config@1', z.string());
  const base = { id: 'multiply', version: 1, title: 'Multiply', description: '',
    in: {}, out: {}, create: () => async () => {} };
  assert.throws(() => f.defineConfiguredComponent({
    ...base, configuration: config, in: { in: conflict },
  }), { code: 'CONTRACT_ID_CONFLICT' });
  const configured = f.defineConfiguredComponent({ ...base, configuration: config });
  const other = f.defineComponent({ ...base, id: 'other', in: { in: conflict } });
  assert.deepEqual(f.compileGraph(spec(2, []), { 'multiply@1': configured, 'other@1': other }),
    { ok: false, issues: [{ code: 'CONTRACT_ID_CONFLICT', path: '$.registry' }] });
  const catalog = { version: 2, components: [
    ...f.describeRegistry({ 'other@1': other }).components,
    ...f.describeRegistry({ 'multiply@1': configured }).components,
  ] };
  assert.deepEqual(model.validateCatalog(catalog),
    { ok: false, issues: [{ code: 'CONTRACT_ID_CONFLICT', path: '$.components[1].configuration' }] });
});

test('raw v2 graph configuration is deeply captured and null stays explicit', async () => {
  const observed = [];
  const component = f.defineConfiguredComponent({ id: 'observe', version: 1, title: 'Observe', description: '',
    configuration: f.jsonContract, in: {}, out: {},
    create: value => { observed.push(value); return async () => {}; } });
  const registry = { 'observe@1': component };
  const config = { nested: [{ active: true }] };
  const raw = spec(2, [{ id: 'a', component: 'observe@1', config }, { id: 'b', component: 'observe@1', config: null }]);
  const compiled = f.compileGraph(raw, registry);
  assert(compiled.ok);
  config.nested[0].active = false;
  assert.equal((await f.startNetwork(compiled.graph).done).status, 'completed');
  assert.deepEqual(observed, [{ nested: [{ active: true }] }, null]);
  assert(Object.isFrozen(observed[0].nested[0]));
});

test('opt-in configuration field paths come from the compiler without invoking factories', () => {
  let calls = 0;
  const component = f.defineConfiguredComponent({
    id: 'multiply', version: 1, title: 'Multiply', description: '', in: {}, out: {},
    configuration: config, create: () => { calls++; return async () => {}; },
  });
  const registry = { 'multiply@1': component }, node = { id: 'a', component: 'multiply@1' };
  const broken = spec(2, [{ ...node, config: { factor: 'two' } }]);
  assert.deepEqual(f.compileGraph(broken, registry), invalid);
  assert.deepEqual(f.compileGraph(broken, registry, { configurationFields: true }), {
    ok: false, issues: [{ code: 'CONFIG_INVALID', path: '$.nodes[0].config["factor"]' }],
  });
  assert.deepEqual(f.compileGraph(spec(2, [node]), registry, { configurationFields: true }), invalid);
  assert.equal(f.compileGraph(spec(2, [{ ...node, config: { factor: 2 } }]), registry, { configurationFields: true }).ok, true);
  assert.equal(calls, 0);
});
