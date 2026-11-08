import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contract, defineComponent, defineConfiguredComponent, derivePacket, describeRegistry, executionIdentity, packet } from 'event-driven-design';
import { runGraph } from 'event-driven-design/testing';
import { z } from 'zod';
import { compileSubflowGraph, fingerprintGraphDocument, writeGraphBundle } from '../dist/index.js';
import { openDraftRepository } from '../dist/store/index.js';

const number = contract('subflow-number@1', z.number());
let factories = 0;
const increase = defineConfiguredComponent({
  id: 'increase', version: 1, title: 'Increase', description: 'Add a configured amount',
  configuration: contract('subflow-config@1', z.strictObject({ delta: z.number() })),
  in: { in: number }, out: { out: number },
  create: ({ delta }) => {
    factories++;
    return async ctx => {
      for await (const input of ctx.inputs.in) await ctx.send('out', derivePacket(input.value + delta, [input]));
    };
  },
});
const registry = { 'increase@1': increase };
const descriptor = describeRegistry(registry).components[0];
const registryLock = {
  version: 1, policyVersion: 'subflow@1', representations: [],
  bindings: [{ component: 'increase@1', moduleBindingId: 'increase',
    implementationDigest: 'a'.repeat(64), contractsDigest: 'b'.repeat(64) }],
};
const manifest = { version: 1, bindings: [{ moduleBindingId: 'increase', specifier: 'fixture-nodes', exportName: 'increase' }] };
const endpoint = (node, port) => ({ node, port });
const graph = {
  version: 2, nodes: [{ id: 'add', component: 'increase@1', config: { delta: 1 } }], edges: [],
  inputs: { value: endpoint('add', 'in') }, outputs: { result: endpoint('add', 'out') },
};
const layout = { positions: {}, groups: {} };

function bundle(revisionId, spec = graph, lock = registryLock, bindings = manifest) {
  const { semanticHash } = fingerprintGraphDocument({
    format: 'nodeflow.document', version: 1, workspaceId: 'w', documentId: 'd', draftRevision: 0,
    graph: spec, layout, registryLock: lock,
  });
  return writeGraphBundle({
    format: 'nodeflow.revision', version: 1, revisionId, documentId: 'd', semanticHash, graph: spec,
    registryLock: lock, actorId: 'test', createdAt: '2026-01-01T00:00:00.000Z',
    testReceipt: { version: 1, receiptId: 'fixture', semanticHash, policyVersion: lock.policyVersion,
      outcome: 'passed', fixtureHash: 'c'.repeat(64), assertionSetHash: 'd'.repeat(64),
      serviceProfileHash: 'e'.repeat(64), runtimeVersion: 'fixture@1' },
  }, bindings);
}
const reference = (instanceId, revisionId, configuration) => ({
  instanceId, revisionId,
  bindings: {
    inputs: { in: { port: 'value', contract: descriptor.in.in } },
    outputs: { out: { port: 'result', contract: descriptor.out.out } },
    ...(configuration ? { configuration } : {}),
  },
});
const compose = (...subflows) => ({
  graph: {
    version: 2, nodes: [], edges: [],
    inputs: Object.fromEntries(subflows.map((ref, i) => [subflows.length === 1 ? 'value' : 'value' + i, endpoint(ref.instanceId, 'in')])),
    outputs: Object.fromEntries(subflows.map((ref, i) => [subflows.length === 1 ? 'result' : 'result' + i, endpoint(ref.instanceId, 'out')])),
  },
  subflows,
});
const source = { bundle: Buffer.from(bundle('v1')) };
const trust = (resolve = id => id === 'v1' ? source : undefined) => ({ registry, registryLock, resolve });

async function lockChild() {
  const repository = openDraftRepository(':memory:');
  const scope = { workspaceId: 'w', documentId: 'd' };
  const runtimeVersion = 'fixture@1', serviceProfileHash = 'e'.repeat(64);
  const { component, implementationDigest, contractsDigest } = registryLock.bindings[0];
  const identity = executionIdentity({
    graph, bindings: [{ component, implementationDigest, contractsDigest }], runtimeVersion,
    serviceProfileDigest: serviceProfileHash, policyVersion: registryLock.policyVersion,
  });
  assert.equal(identity.status, 'verified');
  const fixture = {
    format: 'nodeflow.fixture', version: 1, caseId: 'subflow', executionIdentity: identity.digest,
    input: { value: [{ value: 2 }] }, dependencyScripts: {},
    expected: { outputs: { result: [{ value: 3 }] }, decisions: [] },
    redactionReview: { reviewId: 'review', substitutions: [] },
    provenance: { runId: '00000000-0000-4000-8000-000000000000', inputSequences: [1], outputSequences: [2] },
  };
  const profile = { registryLock, runtimeVersion, serviceProfileHash, fixture, registry: () => registry,
    roles: [], approve: () => true };
  try {
    assert((await repository.createDraft(scope, { graph, layout, registryLock })).ok);
    const receipt = await repository.testDraft(scope, 0, profile);
    const locked = await repository.lockRevision(scope, 0, receipt.receiptId, 'author', profile);
    return { revisionId: locked.revision.revisionId, bundle: writeGraphBundle(locked.revision, manifest) };
  } finally { await repository.close(); }
}

test('two instances preserve independent configuration and runtime attribution', async () => {
  const locked = await lockChild();
  const { revisionId } = locked;
  const document = compose(reference('left', revisionId), reference('right', revisionId, { add: { delta: 4 } }));
  let lookups = 0;
  const host = trust(id => {
    lookups++;
    assert.equal(id, revisionId);
    return { bundle: locked.bundle };
  });
  const first = compileSubflowGraph(document, host);
  assert.equal(lookups, 1);
  assert.deepEqual(first, compileSubflowGraph(document, host));
  assert(first.compiled.ok);
  assert.equal(new Set(first.origins.map(origin => origin.physicalNodeId)).size, 2);
  const result = await runGraph(first.compiled.graph, {
    inputs: { value0: [packet(2)], value1: [packet(2)] }, decisionEvidence: true,
  });
  assert.equal(result.terminal.status, 'completed');
  assert.deepEqual([result.outputs.result0[0].value, result.outputs.result1[0].value], [3, 6]);
  for (const [index, instance] of ['left', 'right'].entries()) {
    const id = first.spec.outputs['result' + index].node;
    assert(result.diagnostics.events.some(record => record.nodeId === id));
    assert.deepEqual(first.origins.find(origin => origin.physicalNodeId === id), {
      physicalNodeId: id, parentInstancePath: [instance], sourceRevisionId: revisionId, sourceNodeId: 'add',
    });
  }
});

test('nested origin paths are verified against the locked flat graph and newer pins do not rewrite parents', () => {
  const sources = new Map([['v1', source], ['v2', { bundle: bundle('v2') }]]);
  const host = trust(id => sources.get(id));
  const composition = compose(reference('inner', 'v1'));
  const first = compileSubflowGraph(composition, host);
  sources.set('middle', { bundle: bundle('middle', first.spec), composition });
  const parent = compose(reference('outer', 'middle'));
  const nested = compileSubflowGraph(parent, host);
  assert(nested.compiled.ok);
  assert.deepEqual(nested.origins[0].parentInstancePath, ['outer', 'inner']);
  assert.equal(nested.origins[0].sourceRevisionId, 'v1');
  const next = compileSubflowGraph(compose(reference('inner', 'v2')), host);
  assert.notEqual(next.origins[0].physicalNodeId, first.origins[0].physicalNodeId);
  assert.deepEqual(compileSubflowGraph(parent, host), nested);
  sources.set('middle', { ...sources.get('middle'), composition: compose(reference('inner', 'v2')) });
  assert.throws(() => compileSubflowGraph(parent, host), /SUBFLOW_PROVENANCE_MISMATCH/);
  sources.set('middle', { bundle: bundle('middle', first.spec) });
  assert.throws(() => compileSubflowGraph(parent, host), /SUBFLOW_PROVENANCE_MISMATCH/);
});

test('invalid resolution, ports, configuration and recursive expansion refuse without starting factories', () => {
  const before = factories;
  const one = compose(reference('single', 'v1'));
  const run = (document, host = trust()) => compileSubflowGraph(document, host);
  assert.throws(() => run(one, trust(() => undefined)), /SUBFLOW_REVISION_NOT_FOUND/);
  assert.throws(() => run(one, trust(() => ({ bundle: bundle('other') }))), /SUBFLOW_REVISION_MISMATCH/);
  assert.throws(() => run(one, { ...trust(), registryLock: { ...registryLock, policyVersion: 'other' } }), /SUBFLOW_BINDING_MISMATCH/);
  assert.throws(() => run(one, { ...trust(), registryLock: { ...registryLock, representations: [{ id: 'json', version: 1 }] } }), /SUBFLOW_BINDING_MISMATCH/);
  assert.throws(() => run(one, { ...trust(), registryLock: { ...registryLock, bindings: [] } }), /SUBFLOW_BINDING_MISMATCH/);
  assert.throws(() => run(one, trust(() => ({ ...source, composition: one }))), /SUBFLOW_RECURSION/);
  const emptyLock = { ...registryLock, bindings: [] };
  assert.throws(() => run(one, trust(() => ({ bundle: bundle('v1', {
    version: 1, nodes: [], edges: [], inputs: {}, outputs: {},
  }, emptyLock, { version: 1, bindings: [] }) }))), /SUBFLOW_EMPTY_REVISION/);
  assert.throws(() => run(compose(reference('same', 'v1'), reference('same', 'v1'))), /SUBFLOW_ID_CONFLICT/);
  assert.throws(() => run(compose(reference('single', 'v1', { missing: {} }))), /SUBFLOW_CONFIGURATION_MISMATCH/);
  assert.deepEqual(run(compose(reference('single', 'v1', { add: { delta: 'bad' } }))).compiled,
    { ok: false, issues: [{ code: 'CONFIG_INVALID', path: '$.nodes[0].config' }] });
  for (const change of [
    ref => { ref.bindings.inputs.in.contract = descriptor.configuration; },
    ref => { ref.bindings.inputs.in.port = 'wrong'; },
    ref => { delete ref.bindings.inputs.in; },
    ref => { ref.bindings.inputs.other = ref.bindings.inputs.in; },
  ]) {
    const wrong = globalThis.structuredClone(one);
    change(wrong.subflows[0]);
    assert.throws(() => run(wrong), /SUBFLOW_PORT_MISMATCH/);
  }
  const wrongEndpoint = globalThis.structuredClone(one);
  wrongEndpoint.graph.inputs.value.port = 'wrong';
  assert.throws(() => run(wrongEndpoint), /SUBFLOW_PORT_MISMATCH/);
  wrongEndpoint.graph.inputs.value.node = 'wrong';
  assert.throws(() => run(wrongEndpoint), /SUBFLOW_PORT_MISMATCH/);
  const badRef = globalThis.structuredClone(one);
  badRef.subflows[0].instanceId = '';
  assert.throws(() => run(badRef), /INVALID_SUBFLOW_REFERENCE/);
  assert.throws(() => run({ graph, subflows: [] }, { ...trust(), registryLock: { ...registryLock, bindings: [] } }),
    /SUBFLOW_BINDING_MISMATCH/);
  assert.equal(factories, before);
});

test('sixteen valid nested levels compile and a seventeenth refuses', () => {
  const sources = new Map([['v1', source]]);
  const host = trust(id => sources.get(id));
  let pin = 'v1';
  for (let depth = 1; depth <= 16; depth++) {
    const composition = compose(reference('inner', pin));
    const result = compileSubflowGraph(composition, host);
    assert(result.compiled.ok);
    assert.equal(result.origins[0].parentInstancePath.length, depth);
    pin = 'nested-' + depth;
    sources.set(pin, { bundle: bundle(pin, result.spec), composition });
  }
  assert.throws(() => compileSubflowGraph(compose(reference('outer', pin)), host), /SUBFLOW_LIMIT/);
});

test('flattening preserves connections and refuses node and channel expansion overflow', () => {
  const wired = compose(reference('next', 'v1'));
  wired.graph.nodes.push(graph.nodes[0]);
  wired.graph.inputs.value = endpoint('add', 'in');
  wired.graph.edges.push({ from: endpoint('add', 'out'), to: endpoint('next', 'in'), capacity: 2 });
  const compiled = compileSubflowGraph(wired, trust());
  assert(compiled.compiled.ok);
  assert.deepEqual(compiled.spec.edges[0], {
    from: endpoint('add', 'out'), to: endpoint(compiled.origins[0].physicalNodeId, 'in'), capacity: 2,
  });
  const parent = compose(reference('wrapper', 'wired'));
  const nested = compileSubflowGraph(parent, trust(id =>
    id === 'wired' ? { bundle: bundle('wired', compiled.spec), composition: wired } : source));
  assert(nested.compiled.ok);
  assert.equal(nested.spec.edges[0].capacity, 2);
  const cycle = compose(reference('first', 'v1'), reference('second', 'v1'));
  cycle.graph.inputs = {};
  cycle.graph.outputs = {};
  cycle.graph.edges = [
    { from: endpoint('first', 'out'), to: endpoint('second', 'in') },
    { from: endpoint('second', 'out'), to: endpoint('first', 'in') },
  ];
  const cyclic = compileSubflowGraph(cycle, trust());
  assert.equal(cyclic.compiled.ok, false);
  assert(cyclic.compiled.issues.some(issue => issue.code === 'CYCLE'));
  const many = globalThis.structuredClone(wired);
  many.graph.nodes = Array.from({ length: 1000 }, (_, id) => ({ ...graph.nodes[0], id: 'node-' + id }));
  assert.throws(() => compileSubflowGraph(many, trust()), /SUBFLOW_LIMIT/);
  many.graph.nodes = [graph.nodes[0]];
  many.graph.edges = Array.from({ length: 4096 }, () => wired.graph.edges[0]);
  assert.throws(() => compileSubflowGraph(many, trust()), /SUBFLOW_LIMIT/);
});

test('v1 children preserve their schema and cannot accept configuration overrides', () => {
  const child = {
    ...graph, version: 1, nodes: [{ id: 'add', component: 'increase@1' }],
  };
  const host = {
    ...trust(() => ({ bundle: bundle('v1', child) })),
    registry: { 'increase@1': defineComponent({
      id: 'increase', version: 1, title: 'Pass through', description: '', in: { in: number },
      out: { out: number }, create: () => async () => {},
    }) },
  };
  const plain = compose(reference('plain', 'v1'));
  plain.graph.version = 1;
  assert.equal(compileSubflowGraph(plain, host).spec.version, 1);
  assert.throws(() => compileSubflowGraph(compose(reference('plain', 'v1', { add: {} })), host),
    /SUBFLOW_CONFIGURATION_MISMATCH/);
  const configured = compose(reference('configured', 'v1'));
  configured.graph.version = 1;
  assert.equal(compileSubflowGraph(configured, trust()).spec.version, 2);
  assert.throws(() => compileSubflowGraph(plain, trust(() => ({ bundle: ' '.repeat(10 * 1024 * 1024 + 1) }))),
    /SUBFLOW_LIMIT/);
});
