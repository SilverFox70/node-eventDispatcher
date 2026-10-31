const { test, before, after } = require('node:test');
const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { assert, collect } = require('./node-task-fixture.cjs');
const framework = import('../dist/esm/index.js');
async function environment() {
  const f = await framework;
  return { ...f, graphFor(node, policy = {}) {
    const graph = f.createGraph(), h = graph.add('node', node, policy);
    graph.exposeInput('in', h, 'in'); graph.exposeOutput('out', h, 'out');
    const compiled = f.compileGraph(graph.toSpec(), { [`${node.id}@1`]: node }); assert(compiled.ok, JSON.stringify(compiled)); return compiled.graph;
  } };
}
const { buildTemplate } = require('./node-template-fixture.cjs');

let fixture, makeLookupNode;
before(async () => {
  fixture = buildTemplate();
  assert.equal(fixture.build.status, 0, fixture.build.stdout + fixture.build.stderr);
  ({ makeLookupNode } = await import(pathToFileURL(fixture.module)));
});
after(() => fixture?.dispose());

test('dependencies and local state: copied recipe calls the exact fake service once', async () => {
  const { graphFor, startNetwork, packet } = await environment();
  const calls = [], node = makeLookupNode({ lookup: async (id, { signal }) => { calls.push({ id, signal }); return { label: 'Ada' }; } });
  const run = startNetwork(graphFor(node)), output = collect(run.outputs.out), input = packet({ id: 'x' }, { jobId: 'job-42', key: 'x' });
  await run.send('in', input); await run.finish(); const values = await output;
  assert.equal(calls.length, 1); assert.equal(calls[0].id, 'x'); assert(calls[0].signal instanceof globalThis.AbortSignal);
  assert.deepEqual(values.map(p => p.value), [{ kind: 'found', id: 'x', label: 'Ada' }]);
  assert.equal(values[0].jobId, 'job-42'); assert.equal(values[0].key, 'x'); assert.deepEqual(values[0].parentPacketIds, [input.packetId]);
});

test('copyable template tests run with found and missing fixtures against built exports', t => {
  const { result, report } = fixture.coverage(); assert.equal(result.status, 0, result.stdout + result.stderr);
  assert(readdirSync(join(fixture.directory, 'coverage/tmp')).some(name => name.startsWith('coverage-') && name.endsWith('.json')));
  assert.match(result.stdout, /tests 2/); assert.match(result.stdout, /pass 2/);
  assert.deepEqual(Object.keys(report).map(path => path.split('/').at(-1)).sort(), ['contract.ts', 'node.ts']);
  for (const data of Object.values(report)) {
    assert(Object.values(data.s).every(hits => hits > 0));
    assert(Object.values(data.b).flat().every(hits => hits > 0));
    assert(Object.values(data.f).every(hits => hits > 0));
  }
  t.diagnostic(result.stdout);
});

test('template edits receive real type and behavioral feedback', t => {
  for (const [expression, typed] of [['42', false], ['profile.label.toUpperCase()', true]]) {
    const edited = buildTemplate(source => {
      assert(source.includes('label: profile.label')); return source.replace('label: profile.label', `label: ${expression}`);
    });
    try {
      if (!typed) {
        assert.equal(edited.build.status, 1, edited.build.stdout + edited.build.stderr);
        assert.match(edited.build.stdout, /TS2322/); t.diagnostic('Expected negative build: ' + edited.build.stdout.trim());
      } else {
        assert.equal(edited.build.status, 0, edited.build.stdout + edited.build.stderr);
        const result = edited.test(); assert.equal(result.status, 1, result.stdout + result.stderr);
        assert.match(result.stdout, /ADA/); assert.match(result.stdout, /Ada/); t.diagnostic('Expected semantic edit refusal: found-profile assertion failed.');
      }
    } finally { edited.dispose(); }
  }
});

test('function wrapper uses runtime: serial lookup, frozen metadata and isolated runs', async () => {
  const { graphFor, startNetwork, packet } = await environment();
  const { deferred, flush } = require('./node-task-fixture.cjs'); const entered = deferred(), gate = deferred(), calls = [];
  const dependencies = { lookup: async (id, { signal }) => { calls.push({ id, signal }); if (id === 'first') { entered.resolve(); await gate.promise; } return { label: id }; } };
  const node = makeLookupNode(dependencies); dependencies.lookup = async () => { throw Error('replacement must not run'); };
  const graph = graphFor(node), a = startNetwork(graph), b = startNetwork(graph), outputA = collect(a.outputs.out), outputB = collect(b.outputs.out);
  await a.send('in', packet({ id: 'first' })); await a.send('in', packet({ id: 'second' })); await entered.promise; await flush(); assert.deepEqual(calls.map(c => c.id), ['first']);
  await b.send('in', packet({ id: 'peer' })); await b.finish(); assert.equal((await outputB)[0].value.label, 'peer');
  const finish = a.finish(); gate.resolve(); await finish; assert.deepEqual((await outputA).map(p => p.value.label), ['first', 'second']);
  assert.equal(new Set(calls.map(c => c.signal)).size, 3); assert(calls.every(c => c.signal.aborted));
});

test('lookup throws once by default and JS return bypass fails before downstream output', async () => {
  const { graphFor, startNetwork, packet } = await environment();
  for (const [lookup, code] of [[async () => { throw Error('private lookup detail'); }, 'COMPONENT_FAILED'], [async () => ({ label: 123 }), 'OUTPUT_CONTRACT']]) {
    let calls = 0; const node = makeLookupNode({ lookup: (...args) => { calls++; return lookup(...args); } });
    const run = startNetwork(graphFor(node)); const output = assert.rejects(collect(run.outputs.out), { code: 'RUN_TERMINATED' });
    await run.send('in', packet({ id: 'x' })); await run.finish(); await output;
    assert.equal((await run.done).code, code); assert.equal(calls, 1); assert.equal(run.snapshot().channels.find(c => c.id === 'output:out').sent, 0);
    assert(!JSON.stringify(run.snapshot()).includes('private lookup detail'));
    if (code === 'OUTPUT_CONTRACT') assert.equal(run.snapshot().diagnostics.find(d => d.validation).validation.contractId, 'profile-result@1');
  }
});

test('advanced mutable state belongs in create and starts at zero for each run', async () => {
  const { defineComponent, contract, derivePacket, graphFor, startNetwork, packet } = await environment();
  const { z } = await import('zod'); const numeric = contract('author-count@1', z.number()); let factories = 0;
  const node = defineComponent({ id: 'counter', version: 1, title: 'Counter', description: '', in: { in: numeric }, out: { out: numeric }, create: () => {
    factories++; let count = 0;
    return async ctx => { for await (const p of ctx.inputs.in) { const value = await ctx.task(() => ++count); await ctx.send('out', derivePacket(value, [p])); } };
  } });
  const graph = graphFor(node), a = startNetwork(graph), b = startNetwork(graph), results = [collect(a.outputs.out), collect(b.outputs.out)];
  for (const run of [a, b]) { await run.send('in', packet(9)); await run.send('in', packet(9)); }
  await Promise.all([a.finish(), b.finish()]); assert.equal(factories, 2);
  for (const values of await Promise.all(results)) assert.deepEqual(values.map(p => p.value), [1, 2]);
});

test('agent recipe metadata declares effects but cannot grant registry execution', async () => {
  const { describeRegistry, createGraph, compileGraph } = await environment(); const { validateGraph } = await import('../dist/esm/model/index.js'); let calls = 0;
  const node = makeLookupNode({ lookup: async () => { calls++; return null; } }), registry = { 'lookup-profile@1': node };
  const catalog = describeRegistry(registry), entry = catalog.components[0];
  assert.deepEqual(entry.effects, ['profile.read']); assert.deepEqual(entry.requiredDependencies, ['lookup']);
  assert.equal(entry.in.in.contractId, 'profile-request@1'); assert.equal(entry.out.out.contractId, 'profile-result@1'); assert.equal(entry.out.out.representationId, 'json@1');
  const graph = createGraph(), h = graph.add('lookup', node); graph.exposeInput('in', h, 'in'); graph.exposeOutput('out', h, 'out');
  const spec = graph.toSpec(); assert.equal(compileGraph(spec, registry).ok, true);
  for (const component of ['unknown@1', 'lookup-profile@2']) {
    const proposed = JSON.parse(JSON.stringify(spec)); proposed.nodes[0].component = component;
    const result = compileGraph(proposed, registry); assert.equal(result.ok, false); assert(result.issues.some(i => i.code === 'UNKNOWN_COMPONENT'));
  }
  const edited = JSON.parse(JSON.stringify(catalog)); edited.components[0].in.in.representationId = 'custom@1'; assert.equal(validateGraph(spec, edited).ok, false);
  assert.equal(compileGraph(spec, {}).ok, false); assert.equal(calls, 0); assert(!JSON.stringify(catalog).includes('handler'));
});
