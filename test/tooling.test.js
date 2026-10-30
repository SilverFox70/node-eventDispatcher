const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, realpathSync, mkdtempSync, cpSync, symlinkSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { resolve, join } = require('node:path');
const { spawnSync } = require('node:child_process');

const root = resolve(__dirname, '..');
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));

test('runtime pins agree', () => {
  const pkg = readJson(join(root, 'package.json'));
  const version = process.versions.node;
  for (const file of ['.nvmrc', '.node-version']) {
    assert.equal(readFileSync(join(root, file), 'utf8').trim(), version, file);
  }
  assert.equal(pkg.engines.node, version);
  const npm = spawnSync('npm', ['--version'], { encoding: 'utf8' });
  assert.equal(npm.status, 0, npm.stderr);
  assert.equal(pkg.engines.npm, npm.stdout.trim());
  assert.equal(pkg.packageManager, `npm@${npm.stdout.trim()}`);
  assert.deepEqual(readJson(join(root, 'package-lock.json')).packages[''].engines, pkg.engines);
});

test('coverage sees unexecuted production', async () => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'fbp-coverage-')));
  try {
    for (const file of ['tsconfig.base.json', 'tsconfig.cjs.json', '.c8rc.json']) {
      cpSync(join(root, file), join(fixture, file));
    }
    cpSync(join(root, 'src'), join(fixture, 'src'), { recursive: true });
    symlinkSync(join(root, 'node_modules'), join(fixture, 'node_modules'), 'dir');
    writeFileSync(join(fixture, 'src/unexecuted.ts'), 'export function untouched(value: number): number {\n  return value + 1;\n}\n');
    const build = spawnSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.cjs.json'], { cwd: fixture, encoding: 'utf8' });
    assert.equal(build.status, 0, build.stdout + build.stderr);
    const measure = spawnSync(process.execPath, [join(root, 'node_modules/c8/bin/c8.js'), process.execPath, '-e', "require('./dist/cjs/index.js')"], { cwd: fixture, encoding: 'utf8' });
    assert.equal(measure.status, 0, measure.stdout + measure.stderr);
    const report = readJson(join(fixture, 'coverage/coverage-final.json'));
    const mapped = Object.keys(report);
    assert.ok(mapped.every(file => file.startsWith(join(fixture, 'src'))), mapped.join('\n'));
    const unused = mapped.find(file => file.endsWith('/src/unexecuted.ts'));
    assert.ok(unused, mapped.join('\n'));
    assert.ok(Object.values(report[unused].s).length > 0);
    assert.ok(Object.values(report[unused].s).every(count => count === 0));
    const gate = spawnSync(process.execPath, [join(root, 'scripts/coverage-thresholds.mjs')], { cwd: fixture, encoding: 'utf8' });
    assert.equal(gate.status, 1);
    assert.match(gate.stderr, /unexecuted\.ts: statements 0\.00%/);
    const { coverageFailures } = await import('../scripts/coverage-thresholds.mjs');
    assert.ok(coverageFailures({}).length > 0);
    assert.deepEqual(coverageFailures({ 'covered.ts': { s: { 0: 1 }, b: { 0: [1, 1] }, statementMap: { 0: { start: { line: 1 } } } } }), []);
    assert.match(coverageFailures({ 'branch.ts': { s: { 0: 1 }, b: { 0: [1, 0] }, statementMap: { 0: { start: { line: 1 } } } } }).join('\n'), /branches 50\.00%/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
