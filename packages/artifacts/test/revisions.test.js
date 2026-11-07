import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import * as sqlite from 'node:sqlite';
import { contract, defineConfiguredComponent, derivePacket, executionIdentity, packet } from 'event-driven-design';
import { canonicalJson } from 'event-driven-design/model';
import { runGraph } from 'event-driven-design/testing';
import { z } from 'zod';
import { compileLockedRevision, importGraphBundle, writeGraphBundle } from '../dist/index.js';
import { openDraftRepository } from '../dist/store/index.js';

const scope = { workspaceId: 'workspace', documentId: 'draft' };
const other = { ...scope, workspaceId: 'other' };
const node = 'increase@1';
const number = contract('revision-number@1', z.number());
const configuration = contract('revision-config@1', z.strictObject({ delta: z.number() }));
const registryLock = { version: 1, policyVersion: 'policy@1', representations: [{ id: 'json', version: 1 }],
  bindings: [{ component: node, moduleBindingId: 'increase', implementationDigest: 'a'.repeat(64), contractsDigest: 'b'.repeat(64) }] };
const graph = { version: 2, nodes: [{ id: 'increment', component: node, config: { delta: 1 } }], edges: [],
  inputs: { value: { node: 'increment', port: 'in' } }, outputs: { value: { node: 'increment', port: 'out' } } };
const content = { graph, registryLock, layout: { positions: { increment: { x: 0, y: 0 } }, groups: {} } };

function profile(value = 4) {
  const runtimeVersion = 'runtime@1', serviceProfileHash = 'd'.repeat(64);
  const identity = executionIdentity({ graph, bindings: registryLock.bindings.map(({ component, implementationDigest, contractsDigest }) =>
    ({ component, implementationDigest, contractsDigest })), runtimeVersion,
  serviceProfileDigest: serviceProfileHash, policyVersion: registryLock.policyVersion });
  assert.equal(identity.status, 'verified');
  return { registryLock, runtimeVersion, serviceProfileHash, fixture: {
    format: 'nodeflow.fixture', version: 1, caseId: 'increment', executionIdentity: identity.digest,
    input: { value: [{ value: 3 }] }, dependencyScripts: {},
    expected: { outputs: { value: [{ value }] }, decisions: [] },
    redactionReview: { reviewId: 'review-1', substitutions: [] },
    provenance: { runId: '00000000-0000-4000-8000-000000000000', inputSequences: [1], outputSequences: [2] },
  }, roles: [], approve: () => true };
}

function registry(counters) {
  counters.resolved++;
  return { [node]: defineConfiguredComponent({
    id: 'increase', version: 1, title: 'Increase', description: '', configuration,
    in: { in: number }, out: { out: number }, create: ({ delta }) => async ctx => {
      for await (const input of ctx.inputs.in) {
        counters.ran++;
        await ctx.send('out', derivePacket(input.value + delta, [input]));
      }
    },
  }) };
}

function countRows(path, table) {
  const database = new sqlite.Database(path, { readOnly: true });
  try { return database.prepare('SELECT count(*) AS count FROM ' + table).get().count; }
  finally { database.close(); }
}

test('trusted test evidence locks one immutable revision across real SQLite workers', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'nodeflow-revisions-'));
  const path = join(folder, 'draft.sqlite');
  const a = openDraftRepository(path), b = openDraftRepository(path);
  const counters = { resolved: 0, ran: 0 };
  const approved = { ...profile(), registry: () => registry(counters) };
  try {
    await assert.rejects(a.testDraft(scope, 0, approved), /DRAFT_NOT_FOUND/);
    assert((await a.createDraft(scope, content)).ok);
    assert((await a.createDraft(other, content)).ok);
    await assert.rejects(a.testDraft(scope, 1, approved), /DRAFT_CONFLICT/);
    await assert.rejects(a.testDraft(scope, 0, { ...approved, registryLock: { ...registryLock, policyVersion: 'other' } }), /REGISTRY_LOCK_MISMATCH/);
    await assert.rejects(a.testDraft(scope, 0, { ...approved, fixture: { ...approved.fixture, executionIdentity: 'f'.repeat(64) } }), /BINDING_MISMATCH/);
    assert.deepEqual(counters, { resolved: 0, ran: 0 });
    await assert.rejects(a.testDraft(scope, 0, { ...approved, registry: () => ({}) }), /INVALID_TEST_GRAPH/);
    await assert.rejects(a.testDraft(scope, 0, { ...profile(99), registry: approved.registry }), /Fixture outputs changed/);
    await assert.rejects(a.lockRevision(scope, 0, 'invented', 'developer', { ...approved, outcome: 'passed' }), /TEST_RECEIPT_NOT_FOUND/);
    assert.equal(countRows(path, 'test_receipts'), 0);
    const receipt = await a.testDraft(scope, 0, approved);
    const secondReceipt = await b.testDraft(scope, 0, approved);
    assert.notEqual(receipt.receiptId, secondReceipt.receiptId);
    for (const changed of [{ ...approved, runtimeVersion: 'runtime@2' }, { ...approved, serviceProfileHash: 'e'.repeat(64) }, profile(99)]) {
      await assert.rejects(a.lockRevision(scope, 0, receipt.receiptId, 'developer', changed), /TEST_RECEIPT_MISMATCH/);
    }
    assert.throws(() => a.lockRevision(scope, 0, receipt.receiptId, 'developer', { ...approved, serviceProfileHash: 'bad' }), /INVALID_TEST_PROFILE/);
    assert.throws(() => a.lockRevision(scope, 0, receipt.receiptId, 'developer', { ...approved, runtimeVersion: '' }), /INVALID_TEST_PROFILE/);
    await assert.rejects(a.lockRevision(scope, 0, '', 'developer', approved), /INVALID_LOCK_REQUEST/);
    await assert.rejects(a.lockRevision(scope, 0, receipt.receiptId, '', approved), /INVALID_LOCK_REQUEST/);
    await assert.rejects(a.lockRevision({ ...scope, documentId: 'missing' }, 0, receipt.receiptId, 'developer', approved), /DRAFT_NOT_FOUND/);
    await assert.rejects(a.lockRevision(other, 0, receipt.receiptId, 'developer', approved), /TEST_RECEIPT_NOT_FOUND/);

    const moved = { ...content, layout: { positions: { increment: { x: 10, y: 5 } }, groups: {} } };
    assert((await a.saveDraft(scope, 0, moved)).ok);
    await assert.rejects(a.lockRevision(scope, 0, receipt.receiptId, 'developer', approved), /DRAFT_CONFLICT/);
    const [first, second] = await Promise.all([
      a.lockRevision(scope, 1, receipt.receiptId, 'developer', approved),
      b.lockRevision(scope, 1, secondReceipt.receiptId, 'reviewer', approved),
    ]);
    const { revision, layout } = first;
    assert.deepEqual(first, second);
    assert.equal(countRows(path, 'locked_revisions'), 1);
    assert.deepEqual(layout, moved.layout);
    assert(['developer', 'reviewer'].includes(revision.actorId));
    assert.equal(new Date(revision.createdAt).toISOString(), revision.createdAt);
    await assert.rejects(b.loadLockedRevision(other, revision.revisionId), /LOCKED_REVISION_NOT_FOUND/);
    await assert.rejects(b.forkDraft(other, revision.revisionId, 'fork'), /LOCKED_REVISION_NOT_FOUND/);

    const changedGraph = globalThis.structuredClone(graph);
    changedGraph.nodes[0].config.delta = 2;
    assert((await a.saveDraft(scope, 1, { ...content, graph: changedGraph })).ok);
    await assert.rejects(a.lockRevision(scope, 2, receipt.receiptId, 'developer', approved), /TEST_RECEIPT_MISMATCH/);
    const changedLock = globalThis.structuredClone(registryLock);
    changedLock.bindings[0].implementationDigest = 'c'.repeat(64);
    await assert.rejects(a.lockRevision(scope, 2, receipt.receiptId, 'developer', { ...approved, registryLock: changedLock }), /REGISTRY_LOCK_MISMATCH/);
    const before = counters.resolved;
    assert.throws(() => compileLockedRevision(revision, changedLock, approved.registry), /REGISTRY_LOCK_MISMATCH/);
    for (const tampered of [{ ...revision, format: 'unknown' }, { ...revision, version: 2 },
      { ...revision, graph: changedGraph }, { ...revision, testReceipt: { ...receipt, semanticHash: 'changed' } },
      { ...revision, testReceipt: { ...receipt, outcome: 'failed' } },
      { ...revision, testReceipt: { ...receipt, policyVersion: 'changed' } }]) {
      assert.throws(() => compileLockedRevision(tampered, registryLock, approved.registry), /LOCKED_CONTENT_MISMATCH/);
    }
    assert.equal(counters.resolved, before);
    const compiled = compileLockedRevision(revision, registryLock, approved.registry);
    assert(compiled.ok);
    const run = await runGraph(compiled.graph, { inputs: { value: [packet(3)] } });
    assert.equal(run.outputs.value[0].value, 4);
    const bindingManifest = { version: 1, bindings: [
      { moduleBindingId: 'increase', specifier: '@fixture/nodes', exportName: 'increase' },
    ] };
    const imported = await importGraphBundle(writeGraphBundle(revision, bindingManifest, layout),
      { workspaceId: 'destination', documentId: 'imported' }, { registryLock, bindingManifest }, b);
    assert(imported.ok);
    assert.equal(imported.source.revision.revisionId, revision.revisionId);
    assert.equal(imported.draft.semanticHash, revision.semanticHash);
    assert.deepEqual(imported.draft.document.layout, layout);
    const importedGraph = compileLockedRevision({ ...imported.source.revision, graph: imported.draft.document.graph },
      registryLock, approved.registry);
    assert(importedGraph.ok);
    const importedRun = await runGraph(importedGraph.graph, { inputs: { value: [packet(3)] } });
    assert.equal(importedRun.outputs.value[0].value, run.outputs.value[0].value);
    const fork = await b.forkDraft(scope, revision.revisionId, 'fork');
    assert.equal(fork.draft.document.draftRevision, 0);
    assert.deepEqual(fork.draft.document.graph, graph);
    assert.deepEqual(fork.draft.document.layout, moved.layout);
    assert.deepEqual(await b.forkDraft(scope, revision.revisionId, 'fork'), { ok: false, code: 'DRAFT_EXISTS' });
    await a.close();
    await b.close();
    const reopened = openDraftRepository(path);
    try { assert.equal(canonicalJson(await reopened.loadLockedRevision(scope, revision.revisionId)), canonicalJson(first)); }
    finally { await reopened.close(); }
  } finally {
    await a.close();
    await b.close();
    rmSync(folder, { recursive: true, force: true });
  }
});

test('the SQLite v1 migration preserves an existing saved draft', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'nodeflow-revision-migration-'));
  const path = join(folder, 'draft.sqlite');
  try {
    const legacy = new sqlite.Database(path);
    legacy.exec('CREATE TABLE drafts (workspace_id TEXT, document_id TEXT, revision INTEGER, document TEXT, PRIMARY KEY (workspace_id, document_id)) STRICT; PRAGMA user_version = 1;');
    const document = { ...content, ...scope, format: 'nodeflow.document', version: 1, draftRevision: 4 };
    legacy.prepare('INSERT INTO drafts VALUES (?, ?, 4, ?)').run(scope.workspaceId, scope.documentId, canonicalJson(document));
    legacy.close();
    const repository = openDraftRepository(path);
    try {
      assert.deepEqual((await repository.loadDraft(scope)).draft.document, document);
      assert((await repository.saveDraft(scope, 4, content)).ok);
    } finally { await repository.close(); }
  } finally { rmSync(folder, { recursive: true, force: true }); }
});

test('verification refuses corrupted draft structure before resolving the registry', async () => {
  const { verifyDraft } = await import('../dist/revisions/verify.js');
  const draft = { document: { ...content, ...scope, graph: { ...graph, version: 3 } }, semanticHash: 'invalid' };
  await assert.rejects(verifyDraft(draft, { ...profile(), registry: () => assert.fail('Registry was resolved') }), /UNVERIFIED_TEST_IDENTITY/);
});
