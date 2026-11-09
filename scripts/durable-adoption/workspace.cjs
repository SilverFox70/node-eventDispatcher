const assert = require('node:assert/strict');
const { cpSync, mkdirSync, readFileSync, realpathSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { runCommand } = require('../../test/package-fixture.cjs');

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const write = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');

function installWorkspace(root, target) {
  const core = join(target, 'packages/core');
  mkdirSync(core, { recursive: true });
  for (const path of ['src', 'scripts/build.mjs', 'package.json', 'tsconfig.base.json', 'tsconfig.esm.json', 'tsconfig.cjs.json']) {
    cpSync(join(root, path), join(core, path), { recursive: true });
  }
  const locked = read(join(root, 'package-lock.json'));
  const original = read(join(core, 'package.json'));
  const coreManifest = { name: original.name, version: original.version, type: original.type, exports: original.exports,
    dependencies: original.dependencies, scripts: { build: original.scripts.build } };
  write(join(core, 'package.json'), coreManifest);
  for (const name of ['artifacts', 'durable']) {
    const folder = join(target, 'packages', name);
    mkdirSync(folder, { recursive: true });
    for (const path of ['src', 'package.json', 'tsconfig.json', ...(name === 'durable' ? ['migrations'] : [])]) {
      cpSync(join(root, 'packages', name, path), join(folder, path), { recursive: true });
    }
    const config = read(join(folder, 'tsconfig.json'));
    delete config.compilerOptions.paths;
    write(join(folder, 'tsconfig.json'), config);
  }
  const host = join(target, 'apps/approval');
  cpSync(join(root, 'examples/durable/approval'), join(host, 'src'), { recursive: true });
  const app = {
    name: 'approval-host', version: '1.0.0', private: true, type: 'module',
    dependencies: { 'event-driven-design': '1.0.0', 'event-driven-design-artifacts': '1.0.0', 'event-driven-design-durable': '1.0.0', zod: original.dependencies.zod },
    scripts: { build: "node -e \"require('node:fs').cpSync('src','dist',{recursive:true})\"" },
  };
  write(join(host, 'package.json'), app);
  const locations = ['packages/core', 'packages/artifacts', 'packages/durable', 'apps/approval'];
  const manifest = { name: 'approval-workspace', version: '1.0.0', private: true, workspaces: locations,
    devDependencies: { typescript: original.devDependencies.typescript, '@types/node': original.devDependencies['@types/node'] } };
  const packages = { '': manifest };
  function include(dependency) {
    const key = 'node_modules/' + dependency;
    if (packages[key]) return;
    const record = locked.packages[key];
    assert(record, 'Missing dependency lock: ' + dependency);
    packages[key] = record;
    for (const child of Object.keys({ ...record.dependencies, ...record.optionalDependencies })) include(child);
  }
  for (const location of locations) {
    const entry = read(join(target, location, 'package.json'));
    packages[location] = entry;
    packages['node_modules/' + entry.name] = { link: true, resolved: location };
  }
  for (const location of locations) {
    const entry = packages[location];
    for (const dependency of Object.keys({ ...entry.dependencies, ...entry.devDependencies })) include(dependency);
  }
  for (const dependency of Object.keys(manifest.devDependencies)) include(dependency);
  write(join(target, 'package.json'), manifest);
  write(join(target, 'package-lock.json'), { name: manifest.name, version: manifest.version, lockfileVersion: 3, requires: true, packages });
  runCommand('npm', ['ci', '--offline', '--ignore-scripts', '--no-audit', '--no-fund'], target, 180000);
  for (const location of locations) {
    const name = packages[location].name;
    assert.equal(realpathSync(join(target, 'node_modules', name)), realpathSync(join(target, location)));
    runCommand('npm', ['run', 'build', '--workspace', name], target);
  }
  return { target, host, entry: join(host, 'dist/cli.mjs'), handler: join(host, 'src/handler.mjs'),
    build: () => runCommand('npm', ['run', 'build', '--workspace', app.name], target) };
}

module.exports = { installWorkspace };
