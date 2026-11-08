const assert = require('node:assert/strict');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { installedPackage } = require('../../../test/package-fixture.cjs');

const consumer = installedPackage({ tools: true });
const { fixture, root, run } = consumer;
try {
  const [packed] = JSON.parse(run('npm', [
    'pack', './packages/artifacts', '--ignore-scripts', '--json', '--offline', '--pack-destination', fixture,
  ], root));
  run('npm', ['install', '--ignore-scripts', '--offline', '--no-audit', '--no-fund', './' + packed.filename]);
  run(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { registerHooks } from 'node:module';
    const seen = [];
    const guard = registerHooks({
      resolve(specifier, context, next) {
        const result = next(specifier, context);
        assert(!result.url.startsWith('node:'), result.url);
        assert(!/\\/(?:runtime|testing|sqlite|postgres)(?:[./])/.test(result.url), result.url);
        seen.push(result.url);
        return result;
      },
    });
    const { parseGraphDocument } = await import('event-driven-design-artifacts/model');
    assert(seen.some(url => url.endsWith('/event-driven-design/dist/esm/model/index.js')));
    guard.deregister();
    const { compileGraph, defineComponent } = await import('event-driven-design');
    const { fingerprintGraphDocument } = await import('event-driven-design-artifacts');
    const document = parseGraphDocument({
      format: 'nodeflow.document', version: 1, workspaceId: 'w', documentId: 'd', draftRevision: 0,
      graph: { version: 1, nodes: [{ id: 'idle', component: 'idle@1' }], edges: [], inputs: {}, outputs: {} },
      layout: { positions: {}, groups: {} },
      registryLock: { version: 1, policyVersion: 'policy@1', representations: [],
        bindings: [{ component: 'idle@1', moduleBindingId: 'idle', implementationDigest: 'a'.repeat(64), contractsDigest: 'b'.repeat(64) }] },
    });
    assert.match(fingerprintGraphDocument(document).semanticHash, /^[a-f0-9]{64}$/);
    assert(compileGraph(document.graph, { 'idle@1': defineComponent({
      id: 'idle', version: 1, title: 'Idle', description: '', in: {}, out: {}, create: () => async () => {},
    }) }).ok);
    const { openDraftRepository } = await import('event-driven-design-artifacts/sqlite');
    const repository = openDraftRepository(':memory:');
    try {
      const scope = { workspaceId: document.workspaceId, documentId: document.documentId };
      assert((await repository.createDraft(scope, document)).ok);
      assert((await repository.loadDraft(scope)).ok);
    } finally { await repository.close(); }
  `]);
  writeFileSync(join(fixture, 'artifact-types.mts'), `
    import { parseGraphDocument, type GraphDocument } from 'event-driven-design-artifacts/model';
    import { compileSubflowGraph, fingerprintGraphDocument, type SubflowDocument, type SubflowTrust } from 'event-driven-design-artifacts';
    import { openDraftRepository, type DraftVerification, type TestReceipt } from 'event-driven-design-artifacts/sqlite';
    declare const verification: DraftVerification;
    declare const composition: SubflowDocument;
    declare const trust: SubflowTrust;
    const { origins, compiled } = compileSubflowGraph(composition, trust);
    const instancePath: readonly string[] | undefined = origins[0]?.parentInstancePath;
    export { compiled, instancePath };
    const repository = openDraftRepository(':memory:');
    const scope = { workspaceId: 'w', documentId: 'd' };
    const receipt: TestReceipt = await repository.testDraft(scope, 0, verification);
    const locked = await repository.lockRevision(scope, 0, receipt.receiptId, 'actor', verification);
    await repository.forkDraft(scope, locked.revision.revisionId, 'fork');
    const document: GraphDocument = parseGraphDocument({});
    const { semanticHash, layoutHash }: { semanticHash: string; layoutHash: string } = fingerprintGraphDocument(document);
    // @ts-expect-error Unknown document versions cannot be constructed as v1.
    const bad: GraphDocument = { ...document, version: 2 };
    export { semanticHash, layoutHash, bad };
  `);
  run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--ignoreConfig', '--module', 'nodenext',
    '--strict', '--noEmit', 'artifact-types.mts']);
  const revisions = readFileSync(join(root, 'packages/artifacts/test/revisions.test.js'), 'utf8')
    .replace('../dist/index.js', 'event-driven-design-artifacts')
    .replace('../dist/store/index.js', 'event-driven-design-artifacts/sqlite');
  writeFileSync(join(fixture, 'revisions.test.mjs'), revisions);
  const tested = run(process.execPath, ['--test', '--test-reporter=tap',
    '--test-name-pattern=trusted test evidence|the SQLite v1 migration', 'revisions.test.mjs']);
  assert.match(tested, /^# pass 2$/m);
  const subflows = readFileSync(join(root, 'packages/artifacts/test/subflows.test.js'), 'utf8')
    .replace('../dist/index.js', 'event-driven-design-artifacts')
    .replace('../dist/store/index.js', 'event-driven-design-artifacts/sqlite');
  writeFileSync(join(fixture, 'subflows.test.mjs'), subflows);
  const composed = run(process.execPath, ['--test', '--test-reporter=tap', 'subflows.test.mjs']);
  assert.match(composed, /^# pass 6$/m);
  require('./export-packed.cjs')(consumer);
  require('./adoption-packed.cjs')(consumer);

  console.log('Installed artifact package, passive model, declarations and SQLite revision lifecycle passed.');
} finally {
  consumer.dispose();
}
