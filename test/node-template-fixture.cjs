const { mkdtempSync, mkdirSync, cpSync, symlinkSync, readFileSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');
const root = resolve(__dirname, '..');
const testArguments = ['--test', '--test-reporter=tap', '--test-timeout=5000', 'dist/node.test.js'];
function childTestEnvironment() {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return env;
}

/** Copy the recipe into an ESM consumer using built package exports, not source aliases. */
function buildTemplate(change = source => source) {
  const directory = mkdtempSync(join(tmpdir(), 'fbp-node-template-'));
  try {
    for (const file of ['contract.ts', 'node.ts', 'node.test.ts', 'examples.json']) {
      cpSync(join(root, 'templates/node', file), join(directory, file));
    }
    const node = join(directory, 'node.ts');
    writeFileSync(node, change(readFileSync(node, 'utf8')));
    writeFileSync(join(directory, 'package.json'), '{"private":true,"type":"module"}\n');
    mkdirSync(join(directory, 'node_modules'));
    const dependencies = [
      ['event-driven-design', root],
      ['zod', join(root, 'node_modules/zod')],
      ['@types', join(root, 'node_modules/@types')],
    ];
    for (const [name, target] of dependencies) symlinkSync(target, join(directory, 'node_modules', name), process.platform === 'win32' ? 'junction' : 'dir');
    const build = spawnSync(process.execPath, [
      join(root, 'node_modules/typescript/bin/tsc'), '--target', 'ES2022', '--module', 'NodeNext',
      '--sourceMap', '--strict', '--types', 'node', '--noUncheckedIndexedAccess', '--exactOptionalPropertyTypes',
      '--resolveJsonModule', '--noEmitOnError', '--outDir', 'dist', 'contract.ts', 'node.ts', 'node.test.ts',
    ], { cwd: directory, encoding: 'utf8', timeout: 30000 });
    return {
      directory, build, module: join(directory, 'dist/node.js'),
      test() {
        return spawnSync(process.execPath, testArguments, { cwd: directory, env: childTestEnvironment(), encoding: 'utf8', timeout: 15000 });
      },
      coverage() {
        const env = childTestEnvironment();
        delete env.NODE_V8_COVERAGE;
        writeFileSync(join(directory, '.c8rc.json'), JSON.stringify({
          tempDirectory: join(directory, 'coverage/tmp'), all: true, src: ['dist'], include: ['dist/node.js', 'dist/contract.js'], extension: ['.js', '.ts'],
          reporter: ['json', 'text'], checkCoverage: true, perFile: true, statements: 95, lines: 95, branches: 95, functions: 95,
        }));
        const result = spawnSync(process.execPath, [join(root, 'node_modules/c8/bin/c8.js'), process.execPath, ...testArguments],
          { cwd: directory, env, encoding: 'utf8', timeout: 15000 });
        const report = JSON.parse(readFileSync(join(directory, 'coverage/coverage-final.json'), 'utf8'));
        return { result, report };
      },
      dispose() { rmSync(directory, { recursive: true, force: true }); },
    };
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}
module.exports = { buildTemplate };
