const assert = require('node:assert/strict');
const { copyFileSync, mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

module.exports = function verifyExport({ fixture, root, run }) {
  const tsc = join(root, 'node_modules/typescript/bin/tsc');
  for (const type of ['module', 'commonjs']) {
    const cwd = join(fixture, type);
    const nodes = join(cwd, 'node_modules/@fixture/nodes');
    mkdirSync(nodes, { recursive: true });
    writeFileSync(join(cwd, 'package.json'), JSON.stringify({ type }));
    writeFileSync(join(nodes, 'package.json'), JSON.stringify({ name: '@fixture/nodes', type, exports: './nodes.js' }));
    copyFileSync(join(root, 'packages/artifacts/test/fixtures/typescript-nodes.ts'), join(nodes, 'nodes.ts'));
    const build = files => run(process.execPath, [tsc, '--ignoreConfig', '--strict', '--module', 'nodenext', '--target', 'es2022', ...files], cwd);
    build(['node_modules/@fixture/nodes/nodes.ts']);
    run(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import { writeFileSync } from 'node:fs';
      import { createRequire } from 'node:module';
      const load = ${JSON.stringify(type)} === 'module' ? specifier => import(specifier) : createRequire(import.meta.url);
      const bindings = await load('@fixture/nodes');
      const { createGraph } = await load('event-driven-design');
      import { fingerprintGraphDocument, writeGraphBundle, writeTypeScriptExport } from 'event-driven-design-artifacts';

      const suffix = '"; globalThis.injected = true; //\\n\\u2028\\u2029';
      const config = { suffix, extras: ['?'] };
      const builder = createGraph();
      const split = builder.add('split', bindings.split);
      const left = builder.add('left-branch', bindings.left, { config, taskTimeoutMs: 1000 });
      const right = builder.add('right branch', bindings.right);
      const join = builder.add('results', bindings.join);
      builder.connect(split, 'left', left, 'in', 1);
      builder.connect(split, 'right', right, 'in');
      builder.connect(left, 'out', join, 'left');
      builder.connect(right, 'out', join, 'right');
      builder.exposeInput('input', split, 'in');
      builder.exposeOutput('output', join, 'out');

      const graph = builder.toSpec();
      const entries = Object.entries(bindings).filter(([name]) => ['split', 'left', 'right', 'join'].includes(name));
      const registryLock = { version: 1, policyVersion: 'policy', representations: [],
        bindings: entries.map(([name, component]) => ({ component: component.id + '@' + component.version,
          moduleBindingId: name, implementationDigest: 'a'.repeat(64), contractsDigest: 'b'.repeat(64) }))
          .sort((a, b) => a.component < b.component ? -1 : 1) };
      const bindingManifest = { version: 1, bindings: entries.map(([name]) => name).sort().map(name =>
        ({ moduleBindingId: name, specifier: '@fixture/nodes', exportName: name })) };
      const layout = { positions: {}, groups: {} };
      const { semanticHash } = fingerprintGraphDocument({
        format: 'nodeflow.document', version: 1, workspaceId: 'w', documentId: 'd', draftRevision: 0, graph, layout, registryLock,
      });
      const revision = { format: 'nodeflow.revision', version: 1, revisionId: 'revision */\\nunsafe', documentId: 'd',
        semanticHash, graph, registryLock, actorId: 'host', createdAt: '2026-01-01T00:00:00.000Z',
        testReceipt: { version: 1, receiptId: 'receipt', semanticHash, outcome: 'passed', policyVersion: 'policy',
          fixtureHash: 'c'.repeat(64), assertionSetHash: 'd'.repeat(64), serviceProfileHash: 'e'.repeat(64), runtimeVersion: 'runtime' } };
      await writeTypeScriptExport(process.cwd(), 'generated', writeGraphBundle(revision, bindingManifest, layout),
        { registryLock, bindingManifest, approveConfiguration: () => true });
      writeFileSync('expected.json', JSON.stringify({ graph, suffix, revisionId: revision.revisionId }));
    `], cwd);
    build(['generated/graph.ts']);
    const output = run(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import { readFileSync } from 'node:fs';
      import { canonicalJson } from 'event-driven-design/model';
      import { createRequire } from 'node:module';
      const load = ${JSON.stringify(type)} === 'module' ? specifier => import(specifier) : createRequire(import.meta.url);
      const { packet } = await load('event-driven-design');
      const { runGraph } = await load('event-driven-design/testing');
      const { compiled, graph, sourceRevisionId } = await load('./generated/graph.js');
      const expected = JSON.parse(readFileSync('expected.json', 'utf8'));
      assert(compiled.ok, JSON.stringify(compiled));
      assert.equal(canonicalJson(graph), canonicalJson(expected.graph));
      assert.equal(sourceRevisionId, expected.revisionId);
      const result = await runGraph(compiled.graph, { inputs: { input: [packet('hello', { key: 'export' })] } });
      assert.equal(result.terminal.status, 'completed');
      assert.deepEqual(result.outputs.output[0].value, { left: 'hello' + expected.suffix + '?', right: 'HELLO' });
      assert.equal(globalThis.injected, undefined);
      console.log('generated graph executed');
    `], cwd);
    assert.match(output, /generated graph executed/);
  }
};
