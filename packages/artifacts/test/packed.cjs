const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { installedPackage } = require('../../../test/package-fixture.cjs');

const consumer = installedPackage();
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
    await assert.rejects(import('event-driven-design-artifacts/sqlite'), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
  `]);
  writeFileSync(join(fixture, 'artifact-types.mts'), `
    import { parseGraphDocument, type GraphDocument } from 'event-driven-design-artifacts/model';
    import { fingerprintGraphDocument } from 'event-driven-design-artifacts';
    const document: GraphDocument = parseGraphDocument({});
    const { semanticHash, layoutHash }: { semanticHash: string; layoutHash: string } = fingerprintGraphDocument(document);
    // @ts-expect-error Unknown document versions cannot be constructed as v1.
    const bad: GraphDocument = { ...document, version: 2 };
    export { semanticHash, layoutHash, bad };
  `);
  run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--ignoreConfig', '--module', 'nodenext',
    '--strict', '--noEmit', 'artifact-types.mts']);
  console.log('Installed artifact package, passive model, declarations and ordinary core compiler passed.');
} finally {
  consumer.dispose();
}
