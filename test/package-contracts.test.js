const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readdirSync, readFileSync, cpSync, rmSync } = require('node:fs');
const { join, relative } = require('node:path');
const { installedPackage } = require('./package-fixture.cjs');
function filesIn(directory, root = directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path, root) : [relative(root, path).split('\\').join('/')];
  });
}

test('consumer uses packed package: exact public manifest and no private execution material', () => {
  const c = installedPackage();
  try {
    const pkg = JSON.parse(readFileSync(join(c.root, 'package.json'), 'utf8'));
    assert.deepEqual(pkg.files, ['dist', 'src', 'server/src/eventDispatcher.js', 'examples', 'templates', 'docs/guide.md', 'docs/migration.md', 'docs/architecture/fbp-runtime.md']);
    const expected = ['README.md', 'LICENSE', 'package.json', ...pkg.files.flatMap(path =>
      ['dist', 'src', 'examples', 'templates'].includes(path) ? filesIn(join(c.root, path)).map(file => `${path}/${file}`) : [path])].sort();
    assert.deepEqual([...c.files].sort(), expected);
    assert.deepEqual(pkg.dependencies, { zod: '4.6.7' });
    assert.equal(pkg.license, 'ISC'); assert(readFileSync(join(c.installed, 'LICENSE'), 'utf8').includes('William F Brinkert'));
    assert(!c.files.some(file => /(^|\/)(\.env|\.feedback-log|AGENTS\.md|node_modules|test)(\/|$)|cursor_plans/.test(file)));
  } finally { c.dispose(); }
});

test('built distributions usable: same-format public helpers and cross-format handles refuse', () => {
  const c = installedPackage();
  try {
    rmSync(join(c.installed, 'src'), { recursive: true });
    const output = c.run(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
      import * as esm from 'event-driven-design'; import { runNode, runGraph } from 'event-driven-design/testing';
      const require = createRequire(import.meta.url), cjs = require('event-driven-design'), ct = require('event-driven-design/testing');
      function graph(f) { const n = f.map(f.jsonContract, f.jsonContract, value => value * 2);
        const g = f.createGraph(), h = g.add('n', n); g.exposeInput('in', h, 'in'); g.exposeOutput('out', h, 'out');
        const compiled = f.compileGraph(g.toSpec(), { 'map@1': n }); assert(compiled.ok); return { n, graph: compiled.graph }; }
      const e = graph(esm), c = graph(cjs);
      assert.throws(() => cjs.startNetwork(e.graph), { code: 'INVALID_ARGUMENT' });
      assert.throws(() => esm.startNetwork(c.graph), { code: 'INVALID_ARGUMENT' });
      for (const [f, node, g, testing] of [[esm,e.n,e.graph,{runNode,runGraph}],[cjs,c.n,c.graph,ct]]) {
        const p = f.packet(2, {jobId:'installed-job',key:'x'});
        for (const r of [await testing.runNode(node,{inputs:{in:[p]}}),await testing.runGraph(g,{inputs:{in:[p]}})]) {
          assert.equal(r.terminal.status,'completed'); assert.equal(r.outputs.out[0].value,4);
          assert.equal(r.outputs.out[0].jobId,p.jobId); assert.deepEqual(r.outputs.out[0].parentPacketIds,[p.packetId]);
        }
      }
      console.log('same-format helpers: 4; cross-format handles: INVALID_ARGUMENT');
    `]);
    assert.match(output, /same-format helpers: 4; cross-format handles: INVALID_ARGUMENT/);
    for (const file of ['consumer.mts', 'consumer.cts', 'tsconfig.json']) cpSync(join(c.root, 'test/types/consumer', file), join(c.fixture, file));
    c.run(process.execPath, [join(c.root, 'node_modules/typescript/bin/tsc'), '-p', join(c.fixture, 'tsconfig.json')]);
    // A source alias or accidental checkout resolution must not conceal missing installed declarations.
    rmSync(join(c.installed, 'dist/cjs/testing/index.d.ts'));
    const broken = c.attempt(process.execPath, [join(c.root, 'node_modules/typescript/bin/tsc'), '-p', join(c.fixture, 'tsconfig.json')]);
    assert.notEqual(broken.status, 0); assert.match(broken.stdout, /TS7016/);
  } finally { c.dispose(); }
});


test('cold consumer cache needs only locked tarball bytes, not registry metadata', () => {
  const c = installedPackage({ tools: true, contentOnlyCache: true });
  try {
    c.run(process.execPath, ['-e', "const assert=require('node:assert/strict');assert.equal(typeof require('event-driven-design/testing').runNode,'function');require('typescript');require('undici-types/package.json');"]);
    c.run(process.execPath, [join(c.fixture, 'node_modules/typescript/bin/tsc'), '--version']);
  } finally { c.dispose(); }
});
