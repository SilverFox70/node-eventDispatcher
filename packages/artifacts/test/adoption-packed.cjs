const assert = require('node:assert/strict');
const { cpSync, mkdirSync, readFileSync, realpathSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const writeJson = (path, value) => writeFileSync(path, JSON.stringify(value));

function useWorkspaceCore({ fixture, root, run }) {
  const relative = 'packages/nodeflow';
  const source = join(fixture, relative);
  mkdirSync(source, { recursive: true });
  for (const path of ['src', 'scripts/build.mjs', 'package.json', 'tsconfig.base.json', 'tsconfig.esm.json', 'tsconfig.cjs.json']) {
    cpSync(join(root, path), join(source, path), { recursive: true });
  }
  const name = 'event-driven-design';
  const core = readJson(join(source, 'package.json'));
  delete core.workspaces;
  // The fixture already installs the pinned compiler at its workspace root.
  delete core.devDependencies;
  writeJson(join(source, 'package.json'), core);
  const manifestPath = join(fixture, 'package.json');
  const lockPath = join(fixture, 'package-lock.json');
  const manifest = readJson(manifestPath);
  manifest.workspaces = [relative];
  manifest.dependencies[name] = core.version;
  const lock = readJson(lockPath);
  lock.packages[''] = manifest;
  lock.packages[relative] = core;
  lock.packages['node_modules/' + name] = { resolved: relative, link: true };
  writeJson(manifestPath, manifest);
  writeJson(lockPath, lock);
  run('npm', ['ci', '--offline', '--ignore-scripts', '--no-audit', '--no-fund'], fixture, 180000);
  assert.equal(realpathSync(join(fixture, 'node_modules', name)), realpathSync(source));
  run('npm', ['run', 'build', '--workspace', name], fixture, 180000);
}

module.exports = function verifyAdoption(consumer) {
  const { fixture, root, run, attempt } = consumer;
  const example = join(root, 'examples/adoption');
  const authoring = join(fixture, 'authoring');
  const author = mode => run(process.execPath, ['--import', './packages/artifacts/test/resolve-core.js',
    join(example, 'author.mjs'), authoring, mode], root);
  console.log(author('save').trim());
  console.log(author('restore').trim());

  const app = join(fixture, 'production');
  mkdirSync(app);
  writeJson(join(app, 'package.json'), { name: 'fbp-adoption-demo', type: 'module', exports: { './nodes': './nodes.mjs' } });
  for (const file of ['nodes.mjs', 'consume.mjs']) cpSync(join(example, file), join(app, file));
  for (const path of ['export', 'fixture.json']) cpSync(join(authoring, path), join(app, path), { recursive: true });
  assert.throws(() => realpathSync(join(fixture, 'node_modules/event-driven-design-editor')), { code: 'ENOENT' });
  assert.throws(() => realpathSync(join(app, 'author.sqlite')), { code: 'ENOENT' });

  const runConsumer = () => {
    const tsc = join(fixture, 'node_modules/typescript/bin/tsc');
    run(process.execPath, [tsc, '--ignoreConfig', '--strict', '--module', 'nodenext', '--target', 'es2022',
      '--allowJs', '--outDir', 'build', '--rootDir', '.', 'export/graph.ts'], app);
    cpSync(join(app, 'build/export/graph.js'), join(app, 'export/graph.js'));
    assert.match(run(process.execPath, ['--no-experimental-sqlite', 'consume.mjs'], app), /reproduced the locked fixture/);
  };
  runConsumer();
  useWorkspaceCore(consumer);
  runConsumer();

  const modulePath = join(app, 'nodes.mjs');
  const original = readFileSync(modulePath, 'utf8');
  for (const [before, after] of [
    ['input.value + delta', 'input.value - delta'],
    ['adoption-number@1', 'adoption-number@2'],
  ]) {
    assert(original.includes(before));
    writeFileSync(modulePath, original.replace(before, after));
    const refused = attempt(process.execPath, ['--no-experimental-sqlite', 'consume.mjs'], app);
    assert.equal(refused.status, 1, refused.stderr);
    assert.match(refused.stderr, /Error: BINDING_MISMATCH/);
  }
  writeFileSync(modulePath, original);
  const runtimePath = join(fixture, 'packages/nodeflow/package.json');
  const runtime = readJson(runtimePath);
  writeJson(runtimePath, { ...runtime, version: '2.0.0' });
  const wrongRuntime = attempt(process.execPath, ['--no-experimental-sqlite', 'consume.mjs'], app);
  assert.equal(wrongRuntime.status, 1, wrongRuntime.stderr);
  assert.match(wrongRuntime.stderr, /Error: BINDING_MISMATCH/);
  console.log(author('restore').trim());
  console.log('Artifact adoption passed with installed and local workspace core packages.');
};
