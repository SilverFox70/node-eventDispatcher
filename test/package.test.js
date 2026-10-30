const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync, existsSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { spawnSync } = require('node:child_process');

const root = resolve(__dirname, '..');

test('both distribution entries load', () => {
  // Exercise the checkout build as well as the isolated tarball consumer.
  for (const entry of ['index', 'model/index', 'testing/index']) require(`../dist/cjs/${entry}.js`);
  const fixture = mkdtempSync(join(tmpdir(), 'fbp-package-'));
  const run = (command, args, cwd = fixture) => {
    const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return result.stdout;
  };
  try {
    const packed = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', fixture, '--cache', join(fixture, 'npm-cache'), '--offline'], root))[0];
    const files = packed.files.map(file => file.path);
    for (const format of ['esm', 'cjs']) {
      for (const entry of ['index', 'model/index', 'testing/index']) {
        for (const extension of ['js', 'js.map', 'd.ts', 'd.ts.map']) {
          assert.ok(files.includes(`dist/${format}/${entry}.${extension}`));
        }
      }
    }
    assert.ok(files.includes('src/index.ts'));
    const installed = join(fixture, 'node_modules/event-driven-design');
    mkdirSync(installed, { recursive: true });
    run('tar', ['-xf', join(fixture, packed.filename), '--strip-components=1', '-C', installed]);
    writeFileSync(join(fixture, 'package.json'), '{"private":true}\n');
    for (const [mode, load] of [['commonjs', 'require'], ['module', 'await import']]) {
      const expression = ['event-driven-design', 'event-driven-design/model', 'event-driven-design/testing'].map(name => `${load}('${name}')`).join(';');
      run(process.execPath, ['--input-type=' + mode, '-e', expression]);
    }
    for (const file of ['entries.mts', 'entries.cts', 'tsconfig.json']) cpSync(join(root, 'test/types', file), join(fixture, file));
    run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', join(fixture, 'tsconfig.json')]);
    assert.ok(existsSync(join(installed, 'server/src/eventDispatcher.js')));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
