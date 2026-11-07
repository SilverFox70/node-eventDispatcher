import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fingerprintGraphDocument } from '../dist/index.js';
import { assertRegistryLockMatches, fingerprintPreimages, parseArtifactFixture, parseGraphDocument } from '../dist/model/index.js';

function specimen() {
  return {
    format: 'nodeflow.document', version: 1, workspaceId: 'work', documentId: 'doc', draftRevision: 0,
    graph: {
      version: 2, nodes: [{ id: 'a', component: 'demo@1', config: { levels: [1, 2], zero: -0 } }],
      edges: [], inputs: {}, outputs: {},
    },
    layout: { positions: { a: { x: -0, y: 8 } }, groups: { team: ['a'] }, viewport: { x: 0, y: 0, zoom: 1 } },
    registryLock: {
      version: 1, bindings: [{ component: 'demo@1', implementationDigest: 'a'.repeat(64),
        contractsDigest: 'b'.repeat(64), moduleBindingId: 'local.demo' }],
      representations: [{ id: 'json', version: 1 }], policyVersion: 'policy@1',
    },
  };
}

test('document fingerprints pin UTF-8 bytes, separate edits and preserve authored arrays', () => {
  const document = specimen();
  const same = { ...document, workspaceId: 'another', documentId: 'other', draftRevision: 9,
    graph: { ...document.graph, nodes: [{ config: { zero: 0, levels: [1, 2] }, component: 'demo@1', id: 'a' }] } };
  assert.equal(fingerprintPreimages(document).layout,
    '{"format":"nodeflow.layout","layout":{"groups":{"team":["a"]},"positions":{"a":{"x":0,"y":8}},"viewport":{"x":0,"y":0,"zoom":1}},"version":1}');
  const initial = fingerprintGraphDocument(document);
  assert.deepEqual(initial, {
    semanticHash: 'ab53fc2eec2641bb910735f2f85668d07d7c8f9548d2becfadf859365e360634',
    layoutHash: 'ed7356f8d69cc5740df74cbe45ca74c39d5b4118e376d7e6f93ce113f74e1443',
  });
  assert.deepEqual(fingerprintGraphDocument(same), initial);
  const moved = specimen();
  moved.layout.positions.a.y = 12;
  assert.notEqual(fingerprintGraphDocument(moved).layoutHash, initial.layoutHash);
  assert.equal(fingerprintGraphDocument(moved).semanticHash, initial.semanticHash);
  for (const mutate of [
    value => value.graph.nodes[0].config.levels.reverse(),
    value => { value.graph.edges = [{ from: { node: 'a', port: 'out' }, to: { node: 'a', port: 'in' } }]; },
    value => { value.registryLock.bindings[0].implementationDigest = 'c'.repeat(64); },
  ]) {
    const changed = specimen();
    mutate(changed);
    assert.notEqual(fingerprintGraphDocument(changed).semanticHash, initial.semanticHash);
    assert.equal(fingerprintGraphDocument(changed).layoutHash, initial.layoutHash);
  }
  const longComponent = specimen();
  longComponent.graph.nodes[0].component = 'a'.repeat(128) + '@1';
  longComponent.registryLock.bindings[0].component = longComponent.graph.nodes[0].component;
  longComponent.graph.nodes[0].taskTimeoutMs = 500;
  longComponent.graph.nodes[0].retry = { maxRetries: 1, codes: ['RETRY'], delayMs: 0, idempotent: true };
  longComponent.graph.edges = [{ from: { node: 'a', port: 'out' }, to: { node: 'a', port: 'in' }, capacity: 1 }];
  assert.deepEqual(parseGraphDocument(longComponent).graph.nodes[0].retry, longComponent.graph.nodes[0].retry);
  const parsed = parseGraphDocument(document);
  assert.notEqual(parsed.graph, document.graph);
  assert.equal(parsed.graph.nodes[0].config.zero, 0);
  assertRegistryLockMatches(parsed, document.registryLock);
  assert.throws(() => assertRegistryLockMatches(parsed, {
    ...document.registryLock, bindings: [{ ...document.registryLock.bindings[0], contractsDigest: 'c'.repeat(64) }],
  }), /REGISTRY_LOCK_MISMATCH/);
  delete document.layout.viewport;
  delete document.graph.nodes[0].config;
  document.graph.version = 1;
  assert.equal(parseGraphDocument(document).graph.version, 1);
});

test('document admission refuses malformed data and bounds before any host resolves bindings', () => {
  for (const mutate of [
    d => { d.format = 'other'; }, d => { d.version = 2; }, d => { d.extra = true; },
    d => { delete d.graph; }, d => { d.workspaceId = ''; }, d => { d.documentId = 1; },
    d => { d.draftRevision = -1; }, d => { d.draftRevision = 0.1; }, d => { d.draftRevision = '1'; },
    d => { d.graph.nodes = null; }, d => { d.graph.version = 3; },
    d => { d.graph.nodes.push(d.graph.nodes[0]); }, d => { d.graph.nodes[0].id = ''; },
    d => { d.graph.nodes[0].component = ''; }, d => { d.graph.nodes[0].config = NaN; },
    d => { d.graph.nodes[0].config = Infinity; }, d => { d.graph.nodes[0].config = () => {}; },
    d => { d.graph.nodes[0].component = 'demo@9007199254740992'; },
    d => { d.graph.nodes[0].taskTimeoutMs = -1; },
    d => { d.graph.nodes[0].retry = { maxRetries: 9 }; },
    d => { d.graph.outputs = { '': { node: 'a', port: 'out' } }; },
    ...['3', 0, 257].map(capacity => d => { d.graph.edges = [{ from: { node: 'a', port: 'out' }, to: { node: 'a', port: 'in' }, capacity }]; }),
    d => { d.graph.inputs = { input: { node: 'missing', port: 'in' } }; },
    d => { d.graph.outputs = { output: { node: 'a', port: '' } }; },
    d => { d.layout.positions = { missing: { x: 1, y: 2 } }; },
    d => { d.layout.positions.a.x = '1'; }, d => { d.layout.positions.a.y = null; },
    d => { d.layout.groups = []; }, d => { d.layout.groups = { '': [] }; },
    d => { d.layout.groups.team = ['missing']; }, d => { d.layout.groups.team = [1]; },
    d => { d.layout.viewport.x = null; }, d => { d.layout.viewport.y = null; },
    d => { d.layout.viewport.zoom = 0; }, d => { d.layout.viewport.zoom = '1'; },
    d => { d.registryLock.version = 2; }, d => { d.registryLock.policyVersion = null; },
    d => { d.registryLock.bindings = null; }, d => { d.registryLock.bindings = []; },
    d => { d.registryLock.bindings[0].component = 'unknown@1'; },
    d => { d.registryLock.bindings[0].component = null; },
    d => { d.registryLock.bindings[0].contractsDigest = 'no'; },
    d => { d.registryLock.bindings[0].implementationDigest = 'no'; },
    d => { d.registryLock.bindings[0].moduleBindingId = ''; },
    d => { d.registryLock.representations.push(d.registryLock.representations[0]); },
    d => { d.registryLock.representations[0].id = ''; },
    d => { d.registryLock.representations[0].version = 0; },
    d => { d.registryLock.representations[0].version = 1.5; },
    d => { d.registryLock.representations[0].version = '1'; },
    d => { d.graph.nodes.push({ id: 'b', component: 'other@1' }); d.registryLock.bindings.push(d.registryLock.bindings[0]); },
    d => { d.graph.nodes.push({ id: 'b', component: 'demo@1' }); d.layout.groups.team = ['a', 'a']; },
    d => { d.layout.groups = Object.fromEntries(Array.from({ length: 1001 }, (_, index) => [index, []])); },
  ]) {
    const document = specimen();
    mutate(document);
    assert.throws(() => fingerprintGraphDocument(document), /INVALID_ARTIFACT/);
  }
  for (const mutate of [
    d => { d.graph.nodes[0].config = 'é'.repeat(6 * 1024 * 1024); },
    d => { d.graph.nodes = Array(1001).fill(d.graph.nodes[0]); },
    d => { d.graph.edges = Array(4097).fill({ from: { node: 'a', port: 'out' }, to: { node: 'a', port: 'in' } }); },
  ]) {
    const document = specimen();
    mutate(document);
    assert.throws(() => fingerprintGraphDocument(document), /ARTIFACT_LIMIT/);
  }
});

test('artifact fixtures reuse the reviewed regression schema', () => {
  const fixture = {
    format: 'nodeflow.fixture', version: 1, caseId: 'example', executionIdentity: 'a'.repeat(64),
    input: { start: [{ value: 3 }] }, dependencyScripts: {}, expected: { outputs: {}, decisions: [] },
    redactionReview: { reviewId: 'review-1', substitutions: [] },
    provenance: { runId: '00000000-0000-4000-8000-000000000000', inputSequences: [1], outputSequences: [] },
  };
  assert.deepEqual(parseArtifactFixture(fixture), fixture);
  assert.throws(() => parseArtifactFixture({ ...fixture, version: 2 }), /INVALID_FIXTURE/);
});
