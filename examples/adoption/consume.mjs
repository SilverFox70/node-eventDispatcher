import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { executionIdentity, packet } from 'event-driven-design';
import { canonicalJson } from 'event-driven-design/model';
import { runGraph, runRegressionFixture } from 'event-driven-design/testing';
import { compileLockedRevision, inspectGraphBundle } from 'event-driven-design-artifacts';
import { bindingManifest, executionBindings, hash, registry, registryLock, runtimeVersion, serviceProfileHash } from './nodes.mjs';

const read = name => readFileSync(new globalThis.URL(name, import.meta.url), 'utf8');
const bundle = inspectGraphBundle(read('./export/graph.bundle.json'));
const { revision } = bundle;
const { testReceipt } = revision;
const manifest = JSON.parse(read('./export/export-manifest.json'));
const fixture = JSON.parse(read('./fixture.json'));
if (manifest.revisionId !== revision.revisionId ||
  ['graph.ts', 'graph.bundle.json', 'README.md'].some(path => hash(read('./export/' + path)) !== manifest.files[path]) ||
  canonicalJson(bundle.bindingManifest) !== canonicalJson(bindingManifest) ||
  canonicalJson(revision.registryLock) !== canonicalJson(registryLock) ||
  testReceipt.runtimeVersion !== runtimeVersion || testReceipt.serviceProfileHash !== serviceProfileHash ||
  testReceipt.fixtureHash !== hash(canonicalJson(fixture)) ||
  testReceipt.assertionSetHash !== hash(canonicalJson(fixture.expected))) throw Error('BINDING_MISMATCH');

const json = compileLockedRevision(revision, registryLock, () => registry);
const ts = await import('./export/graph.js');
assert.equal(ts.sourceRevisionId, revision.revisionId);
assert.equal(canonicalJson(ts.graph), canonicalJson(revision.graph));
const identity = executionIdentity({ graph: revision.graph, bindings: executionBindings, runtimeVersion,
  serviceProfileDigest: serviceProfileHash, policyVersion: registryLock.policyVersion });
assert.equal(identity.status, 'verified');
for (const compiled of [json, ts.compiled]) {
  assert(compiled.ok, JSON.stringify(compiled));
  await runRegressionFixture(fixture, {
    executionIdentity: identity.digest, roles: [], approve: () => true, build: () => compiled.graph,
  });
  await assert.rejects(runGraph(compiled.graph, { inputs: { value: [packet('wrong type')] } }),
    { code: 'INPUT_CONTRACT' });
}
console.log('TypeScript and JSON reproduced the locked fixture: 3 + 2 = 5.');
