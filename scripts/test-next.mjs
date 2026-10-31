import assert from 'node:assert/strict';
import { realpathSync, mkdtempSync, cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { command, npmCommand } from './next/process.mjs';
import { measureFixture } from './next/coverage.mjs';
import { startServer } from './next/server.mjs';

const root = resolve(fileURLToPath(new globalThis.URL('..', import.meta.url)));
const session = realpathSync(mkdtempSync(join(tmpdir(), 'fbp-next-')));
const app = join(session, 'app'), evidence = join(session, 'evidence');
mkdirSync(evidence);
mkdirSync(join(evidence, 'v8-server'));
mkdirSync(join(evidence, 'v8-test'));
console.log('Next fixture evidence:', evidence);
const checked = async (file, args, options) => {
  const result = await command(file, args, options); assert.equal(result.code, 0, result.output); return result;
};
let serving;
try {
  await checked(process.execPath, [join(root, 'scripts/build.mjs')], { cwd: root, log: join(evidence, 'core-build.log') });
  cpSync(join(root, 'fixtures/next-consumer'), app, { recursive: true,
    filter: path => !['node_modules', '.next', 'vendor'].includes(basename(path)) });
  mkdirSync(join(app, 'vendor'));
  const packed = await npmCommand(['pack', '--offline', '--ignore-scripts', '--json', '--pack-destination', join(app, 'vendor')], { cwd: root });
  assert.equal(packed.code, 0, packed.output);
  const artifact = JSON.parse(packed.output)[0];
  writeFileSync(join(evidence, 'artifact.json'), JSON.stringify(artifact, null, 2));
  const lockPath = join(app, 'package-lock.json'), lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  assert.equal(lock.packages['node_modules/event-driven-design'].version, artifact.version);
  lock.packages['node_modules/event-driven-design'].integrity = artifact.integrity;
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
  const install = await npmCommand(['ci', '--no-audit', '--no-fund'], { cwd: app, log: join(evidence, 'install.log') });
  assert.equal(install.code, 0, install.output);
  const next = join(app, 'node_modules/next/dist/bin/next');
  if (!process.argv.includes('--serve')) {
    const client = join(app, 'app/demo.tsx'), original = readFileSync(client, 'utf8');
    try {
      writeFileSync(client, original + "\nimport { serverCanary } from '../lib/provider'; console.log(serverCanary);\n");
      const red = await command(process.execPath, [next, 'build', '--webpack'], { cwd: app, log: join(evidence, 'server-only-negative.log') });
      assert.equal(red.code, 1); assert.match(red.output, /server-only/);
      console.log('Expected server-only import rejection verified.');
    } finally { writeFileSync(client, original); rmSync(join(app, '.next'), { recursive: true, force: true }); }
  }
  await checked(process.execPath, [next, 'build', '--webpack'], { cwd: app, env: { NODE_V8_COVERAGE: join(evidence, 'v8-server') }, log: join(evidence, 'next-build.log') });
  if (process.argv.includes('--serve')) {
    serving = await startServer(app);
    console.log('Demo ready:', serving.url, '(Ctrl+C to stop)');
    await new Promise(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve); });
  } else {
    await checked(process.execPath, [join(app, 'node_modules/playwright/cli.js'), 'install', ...(process.platform === 'linux' && process.env.CI ? ['--with-deps'] : []), 'chromium'], {
      cwd: app, env: { PLAYWRIGHT_BROWSERS_PATH: join(tmpdir(), 'fbp-next-browsers') }, log: join(evidence, 'browser-install.log'),
    });
    const tested = await command(process.execPath, ['--test', '--test-reporter=tap', join(root, 'test/next/consumer.test.js')], {
      cwd: root, env: { FBP_NEXT_APP: app, FBP_NEXT_EVIDENCE: evidence, NODE_V8_COVERAGE: join(evidence, 'v8-test'), PLAYWRIGHT_BROWSERS_PATH: join(tmpdir(), 'fbp-next-browsers') },
      log: join(evidence, 'consumer-tests.log'),
    });
    console.log(tested.output); assert.equal(tested.code, 0, 'Next consumer tests failed; see evidence.');
    await measureFixture(app, evidence);
    const canary = join(app, 'lib/unexecuted-canary.ts');
    try {
      writeFileSync(canary, 'export function untouched() { return 1; }\n');
      await assert.rejects(measureFixture(app, evidence), /unexecuted-canary.*0%/);
      console.log('Expected unexecuted fixture coverage rejection verified.');
    } finally { rmSync(canary); }
    await measureFixture(app, evidence);
  }
} finally {
  await serving?.stop();
  // Logs and the isolated app are retained for review; their parent is a unique task-owned temp folder.
  console.log('Retained Next fixture:', session);
}
