const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync, rmSync, realpathSync, mkdirSync, cpSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve, dirname } = require('node:path');
const { spawnSync } = require('node:child_process');
const root = resolve(__dirname, '..');

function npm(args, options = {}) {
  if (process.env.npm_execpath) return spawnSync(process.execPath, [process.env.npm_execpath, ...args], options);
  return spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { ...options, shell: process.platform === 'win32' });
}
/** Install the actual tarball in a real isolated consumer. Never link checkout source or dependencies. */
function installedPackage({ tools = false, contentOnlyCache = false } = {}) {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'fbp-installed-')));
  const attempt = (command, args, cwd = fixture) => {
    const options = { cwd, encoding: 'utf8', timeout: 60000, env: { ...process.env } };
    delete options.env.NODE_TEST_CONTEXT;
    return command === 'npm' ? npm(args, options) : spawnSync(command, args, options);
  };
  const run = (command, args, cwd) => {
    const result = attempt(command, args, cwd);
    assert.equal(result.status, 0, result.stdout + result.stderr); return result.stdout;
  };
  try {
    const packed = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--offline', '--pack-destination', fixture, '--cache', join(fixture, 'pack-cache')], root))[0];
    const pkg = require('../package.json'), locked = require('../package-lock.json');
    const dependencies = { 'event-driven-design': `file:${packed.filename}` };
    const selected = new Map();
    function include(name) {
      if (selected.has(name)) return;
      const record = { ...locked.packages[`node_modules/${name}`] };
      assert(record.integrity, `Missing locked dependency: ${name}`);
      delete record.dev;
      selected.set(name, record);
      for (const child of Object.keys(record.dependencies ?? {})) include(child);
    }
    for (const name of Object.keys(pkg.dependencies)) include(name);
    if (tools) for (const name of ['typescript', '@types/node']) { dependencies[name] = pkg.devDependencies[name]; include(name); }
    const sourceCache = run('npm', ['config', 'get', 'cache'], root).trim();
    const cache = contentOnlyCache ? join(fixture, 'content-only-cache') : sourceCache;
    if (contentOnlyCache) {
      // Copy only integrity-addressed tarball bytes: deliberately no registry metadata/index.
      for (const record of selected.values()) {
        const [algorithm, digest] = record.integrity.split('-'), hex = Buffer.from(digest, 'base64').toString('hex');
        const path = join('_cacache/content-v2', algorithm, hex.slice(0, 2), hex.slice(2, 4), hex.slice(4));
        const target = join(cache, path); mkdirSync(dirname(target), { recursive: true }); cpSync(join(sourceCache, path), target);
      }
    }
    const manifest = { name: 'fbp-installed-consumer', version: '1.0.0', private: true, dependencies };
    const packages = { '': manifest, 'node_modules/event-driven-design': { version: pkg.version,
      resolved: `file:${packed.filename}`, integrity: packed.integrity, dependencies: pkg.dependencies, engines: pkg.engines } };
    for (const [name, record] of selected) packages[`node_modules/${name}`] = record;
    writeFileSync(join(fixture, 'package.json'), JSON.stringify(manifest));
    writeFileSync(join(fixture, 'package-lock.json'), JSON.stringify({ name: manifest.name, version: manifest.version, lockfileVersion: 3, requires: true, packages }));
    run('npm', ['ci', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', cache]);
    return { fixture, root, packed, files: packed.files.map(file => file.path), run, attempt,
      installed: join(fixture, 'node_modules/event-driven-design'),
      dispose() { rmSync(fixture, { recursive: true, force: true }); } };
  } catch (error) { rmSync(fixture, { recursive: true, force: true }); throw error; }
}
module.exports = { installedPackage, npm };
