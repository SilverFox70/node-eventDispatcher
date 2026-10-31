const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync, rmSync, realpathSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');
const root = resolve(__dirname, '..');

function npm(args, options = {}) {
  if (process.env.npm_execpath) return spawnSync(process.execPath, [process.env.npm_execpath, ...args], options);
  return spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { ...options, shell: process.platform === 'win32' });
}
/** Install the actual tarball in a real isolated consumer. Never link checkout source or dependencies. */
function installedPackage({ tools = false } = {}) {
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
    writeFileSync(join(fixture, 'package.json'), '{"private":true}\n');
    const cache = run('npm', ['config', 'get', 'cache'], root).trim();
    const dependencies = [join(fixture, packed.filename)];
    if (tools) {
      const pkg = require('../package.json');
      dependencies.push(`typescript@${pkg.devDependencies.typescript}`, `@types/node@${pkg.devDependencies['@types/node']}`);
    }
    run('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--cache', cache, ...dependencies]);
    return { fixture, root, packed, files: packed.files.map(file => file.path), run, attempt,
      installed: join(fixture, 'node_modules/event-driven-design'),
      dispose() { rmSync(fixture, { recursive: true, force: true }); } };
  } catch (error) { rmSync(fixture, { recursive: true, force: true }); throw error; }
}
module.exports = { installedPackage, npm };
