import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { executionIdentity } from 'event-driven-design';
import { applyEditorCommand, createEditorState } from 'event-driven-design-editor/model';
import { writeGraphBundle, writeTypeScriptExport } from '../../packages/artifacts/dist/index.js';
import { openDraftRepository } from '../../packages/artifacts/dist/store/index.js';
import { bindingManifest, executionBindings, catalog, registry, registryLock, runtimeVersion, scope, serviceProfileHash } from './nodes.mjs';

const [folder, mode] = process.argv.slice(2);
const saved = join(folder, 'author.sqlite');
const restored = join(folder, 'restored.sqlite');
const exported = join(folder, 'export');

if (mode === 'restore') {
  const expected = JSON.parse(readFileSync(join(exported, 'graph.bundle.json'), 'utf8'));
  const repository = openDraftRepository(restored);
  try {
    const locked = await repository.loadLockedRevision(scope, expected.revision.revisionId);
    assert.deepEqual(locked.revision, expected.revision);
    assert.deepEqual(locked.layout, expected.layout);
    const draft = await repository.loadDraft(scope);
    assert(draft.ok);
    assert.equal(draft.draft.document.draftRevision, 1);
    assert.deepEqual(draft.draft.document.graph.nodes[0].config, { delta: 3 });
  } finally { await repository.close(); }
  console.log('Restored draft and locked revision in a fresh process.');
} else {
  mkdirSync(folder);
  let state = createEditorState();
  for (const edit of [
    { type: 'addNode', node: { id: 'increment', component: 'increase@1' } },
    { type: 'setConfig', node: 'increment', config: { delta: 2 } },
    { type: 'exposeInput', name: 'value', endpoint: { node: 'increment', port: 'in' } },
    { type: 'exposeOutput', name: 'result', endpoint: { node: 'increment', port: 'out' } },
  ]) {
    const result = applyEditorCommand(state, { ...edit, id: 'edit-' + state.revision, expectedRevision: state.revision }, catalog);
    assert(result.ok, JSON.stringify(result.issue));
    state = result.state;
  }
  const { graph, layout } = state.document;
  const identity = executionIdentity({ graph, bindings: executionBindings, runtimeVersion,
    serviceProfileDigest: serviceProfileHash, policyVersion: registryLock.policyVersion });
  assert.equal(identity.status, 'verified');
  const fixture = {
    format: 'nodeflow.fixture', version: 1, caseId: 'adoption', executionIdentity: identity.digest,
    input: { value: [{ value: 3 }] }, dependencyScripts: {},
    expected: { outputs: { result: [{ value: 5 }] }, decisions: [] },
    redactionReview: { reviewId: 'local-demo', substitutions: [] },
    provenance: { runId: '00000000-0000-4000-8000-000000000000', inputSequences: [1], outputSequences: [2] },
  };
  const verification = { fixture, runtimeVersion, registryLock, serviceProfileHash, registry: () => registry,
    roles: [], approve: () => true };
  const repository = openDraftRepository(saved);
  try {
    assert((await repository.createDraft(scope, { graph, layout, registryLock })).ok);
    const receipt = await repository.testDraft(scope, 0, verification);
    const locked = await repository.lockRevision(scope, 0, receipt.receiptId, 'demo-author', verification);
    const bundle = writeGraphBundle(locked.revision, bindingManifest, locked.layout);
    await writeTypeScriptExport(folder, 'export', bundle, {
      registryLock, bindingManifest, approveConfiguration: () => true,
    });
    writeFileSync(join(folder, 'fixture.json'), JSON.stringify(fixture));
    const edited = applyEditorCommand(state, {
      type: 'setConfig', node: 'increment', config: { delta: 3 }, id: 'next-draft', expectedRevision: state.revision,
    }, catalog);
    assert(edited.ok);
    assert((await repository.saveDraft(scope, 0, { ...edited.state.document, registryLock })).ok);
  } finally { await repository.close(); }
  copyFileSync(saved, restored);
  console.log('Saved, tested, locked and exported the graph.');
}
