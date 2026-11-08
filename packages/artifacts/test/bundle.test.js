import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { test } from 'node:test';
import { canonicalJson } from 'event-driven-design/model';
import { fingerprintGraphDocument, importGraphBundle, inspectGraphBundle, writeGraphBundle } from '../dist/index.js';
import { openDraftRepository } from '../dist/store/index.js';

const hash = value => createHash('sha256').update(value).digest('hex');
const graph = { version: 1, nodes: [{ id: 'a', component: 'alpha@1' }, { id: 'b', component: 'beta@1' }],
  edges: [], inputs: {}, outputs: {} };
const layout = { positions: { a: { x: 4, y: 8 } }, groups: {} };
const registryLock = { version: 1, policyVersion: 'policy', representations: [], bindings: [
  { component: 'alpha@1', moduleBindingId: 'alpha', implementationDigest: 'a'.repeat(64), contractsDigest: 'b'.repeat(64) },
  { component: 'beta@1', moduleBindingId: 'beta', implementationDigest: 'b'.repeat(64), contractsDigest: 'c'.repeat(64) },
] };
const bindingManifest = { version: 1, bindings: [
  { moduleBindingId: 'alpha', specifier: '@example/nodes/alpha', exportName: 'alpha' },
  { moduleBindingId: 'beta', specifier: '@example/nodes', exportName: 'beta' },
] };
const { semanticHash } = fingerprintGraphDocument({
  format: 'nodeflow.document', version: 1, workspaceId: 'source', documentId: 'doc', draftRevision: 0, graph, layout, registryLock,
});
const revision = { format: 'nodeflow.revision', version: 1, revisionId: 'source-revision', documentId: 'doc',
  semanticHash, graph, registryLock, createdAt: '2026-11-07T00:00:00.000Z', actorId: 'actor',
  testReceipt: { version: 1, receiptId: 'remote-receipt', semanticHash, policyVersion: 'policy', outcome: 'passed',
    fixtureHash: 'd'.repeat(64), assertionSetHash: 'e'.repeat(64), serviceProfileHash: 'f'.repeat(64), runtimeVersion: 'runtime' } };
const trust = { registryLock, bindingManifest };
const scope = { workspaceId: 'target', documentId: 'doc' };
const text = writeGraphBundle(revision, bindingManifest, layout);

function signedChange(change) {
  const bundle = JSON.parse(text);
  delete bundle.integrity;
  change(bundle);
  return JSON.stringify({ ...bundle, integrity: hash(canonicalJson(bundle)) });
}

test('bundles serialize canonically and import through one workspace-scoped SQLite create', async () => {
  const parsed = inspectGraphBundle(Buffer.from(text));
  assert.deepEqual(parsed.revision, revision);
  assert.deepEqual(parsed.layout, layout);
  const reversed = Object.fromEntries(Object.entries(revision).reverse());
  assert.equal(writeGraphBundle(reversed, bindingManifest, layout), text);
  assert.equal(inspectGraphBundle(JSON.stringify(parsed, null, 2)).integrity, parsed.integrity);
  const repository = openDraftRepository(':memory:');
  try {
    for (const bad of [{ ...trust, registryLock: { ...registryLock, policyVersion: 'wrong' } },
      { ...trust, bindingManifest: { ...bindingManifest, bindings: [] } }]) {
      await assert.rejects(importGraphBundle(text, scope, bad, repository), /BUNDLE_BINDING_MISMATCH/);
    }
    assert.deepEqual(await repository.loadDraft(scope), { ok: false, code: 'DRAFT_NOT_FOUND' });
    assert((await repository.createDraft({ ...scope, workspaceId: 'source' }, { graph, registryLock, layout })).ok);
    const imported = await importGraphBundle(text, scope, trust, repository);
    assert(imported.ok);
    assert.deepEqual(imported.source, parsed);
    assert.deepEqual(imported.draft.document.layout, layout);
    assert.equal(imported.draft.semanticHash, semanticHash);
    assert.deepEqual(await importGraphBundle(text, scope, trust, repository), { ok: false, code: 'DRAFT_EXISTS' });
    const noLayout = await importGraphBundle(writeGraphBundle(revision, bindingManifest), { ...scope, documentId: 'plain' }, trust, repository);
    assert.deepEqual(noLayout.draft.document.layout, { positions: {}, groups: {} });
    const profile = {
      registryLock, runtimeVersion: 'runtime', serviceProfileHash: 'f'.repeat(64),
      fixture: { format: 'nodeflow.fixture', version: 1, caseId: 'fixture', executionIdentity: 'a'.repeat(64),
        input: { value: [{ value: 1 }] }, expected: { outputs: {}, decisions: [] }, dependencyScripts: {},
        redactionReview: { reviewId: 'review', substitutions: [] },
        provenance: { runId: '00000000-0000-4000-8000-000000000000', inputSequences: [1], outputSequences: [] } },
    };
    await assert.rejects(repository.lockRevision(scope, 0, revision.testReceipt.receiptId, 'actor', profile), /TEST_RECEIPT_NOT_FOUND/);
  } finally { await repository.close(); }
});

test('strict bundle admission rejects malformed, tampered and oversized data before storage', async () => {
  const malformed = [
    b => { b.format = 'unknown'; }, b => { b.version = 2; }, b => { b.revision.format = 'unknown'; },
    b => { b.revision.version = 2; }, b => { b.revision.actorId = ''; }, b => { b.revision.createdAt = 0; },
    b => { b.revision.createdAt = '2026-11-07'; }, b => { b.revision.createdAt = 'invalid'; },
    b => { b.revision.testReceipt.version = 2; }, b => { b.revision.testReceipt.outcome = 'failed'; },
    b => { b.revision.testReceipt.fixtureHash = 'bad'; }, b => { b.revision.executable = 'bad'; },
    b => { b.layout = null; }, b => { b.bindingManifest.version = 2; },
    b => { b.bindingManifest.bindings.pop(); }, b => { b.bindingManifest.bindings.reverse(); },
    b => { b.bindingManifest.bindings[0].moduleBindingId = ''; },
    b => { b.bindingManifest.bindings[0].moduleBindingId = 'absent'; },
    b => { b.bindingManifest.bindings[0].specifier = 'https://example.com/a'; },
    b => { b.bindingManifest.bindings[0].specifier = '@example/nodes/../a'; },
    b => { b.bindingManifest.bindings[0].specifier = 'a'.repeat(257); },
    b => { b.bindingManifest.bindings[0].specifier = 1; },
    b => { b.bindingManifest.bindings[0].exportName = ''; },
    b => { b.bindingManifest.bindings[0].exportName = 'a-b'; },
  ];
  for (const mutate of malformed) assert.throws(() => inspectGraphBundle(signedChange(mutate)), /INVALID_BUNDLE/);
  for (const mutate of [b => { b.revision.graph.edges.push({ from: { node: 'a', port: 'out' }, to: { node: 'b', port: 'in' } }); },
    b => { b.revision.testReceipt.semanticHash = 'a'.repeat(64); }, b => { b.revision.testReceipt.policyVersion = 'wrong'; }]) {
    assert.throws(() => inspectGraphBundle(signedChange(mutate)), /BUNDLE_CONTENT_MISMATCH/);
  }
  assert.throws(() => inspectGraphBundle(text.replace('source-revision', 'changed')), /BUNDLE_INTEGRITY_MISMATCH/);
  assert.throws(() => inspectGraphBundle(JSON.stringify({ ...JSON.parse(text), integrity: 'bad' })), /BUNDLE_INTEGRITY_MISMATCH/);
  assert.throws(() => inspectGraphBundle(Buffer.from([0xff])), /INVALID_BUNDLE/);
  assert.throws(() => inspectGraphBundle('é'.repeat(6 * 1024 * 1024)), /BUNDLE_LIMIT/);
  assert.throws(() => inspectGraphBundle(Buffer.alloc(10 * 1024 * 1024 + 1)), /BUNDLE_LIMIT/);
  assert.throws(() => inspectGraphBundle(signedChange(b => {
    b.revision.graph.nodes = Array.from({ length: 1001 }, (_, index) => ({ id: 'n' + index, component: 'alpha@1' }));
  })), /BUNDLE_LIMIT/);
  assert.throws(() => writeGraphBundle({ ...revision, actorId: 'x'.repeat(11 * 1024 * 1024) }, bindingManifest), /BUNDLE_LIMIT/);
  await assert.rejects(importGraphBundle(text.replace('source-revision', 'changed'), scope, trust, {
    createDraft: () => assert.fail('Rejected input reached storage'),
  }), /BUNDLE_INTEGRITY_MISMATCH/);
});
