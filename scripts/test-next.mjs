import assert from 'node:assert/strict';
import { realpathSync, mkdtempSync, cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { command, npmCommand } from './next/process.mjs';
import { measureFixture } from './next/coverage.mjs';
import { startServer } from './next/server.mjs';
import { demoOptions } from './next/demo-options.mjs';
const demo = demoOptions(process.argv.slice(2));
if (!demo.serve && !process.env.FBP_POSTGRES_TEST_URL) throw Error('Set FBP_POSTGRES_TEST_URL to a disposable PostgreSQL server for the packaged consumer tests.');

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
  const editorBuild = await npmCommand(['run', 'build:editor'], { cwd: root, log: join(evidence, 'editor-build.log') });
  assert.equal(editorBuild.code, 0, editorBuild.output);
  const artifactBuild = await npmCommand(['run', 'build:artifacts'], { cwd: root, log: join(evidence, 'artifact-build.log') });
  assert.equal(artifactBuild.code, 0, artifactBuild.output);
  const durableBuild = await npmCommand(['run', 'build:durable'], { cwd: root, log: join(evidence, 'durable-build.log') });
  assert.equal(durableBuild.code, 0, durableBuild.output);
  cpSync(join(root, 'fixtures/next-consumer'), app, { recursive: true,
    filter: path => !['node_modules', '.next', 'vendor'].includes(basename(path)) });
  mkdirSync(join(app, 'vendor'));
  const packed = await npmCommand(['pack', '--offline', '--ignore-scripts', '--json', '--pack-destination', join(app, 'vendor')], { cwd: root });
  assert.equal(packed.code, 0, packed.output);
  const artifact = JSON.parse(packed.output)[0];
  const editorPack = await npmCommand(['pack', '--offline', '--ignore-scripts', '--json',
    '--workspace', 'event-driven-design-editor', '--pack-destination', join(app, 'vendor')], { cwd: root });
  assert.equal(editorPack.code, 0, editorPack.output);
  const editorArtifact = JSON.parse(editorPack.output)[0];
  const draftPack = await npmCommand(['pack', '--offline', '--ignore-scripts', '--json',
    '--workspace', 'event-driven-design-artifacts', '--pack-destination', join(app, 'vendor')], { cwd: root });
  assert.equal(draftPack.code, 0, draftPack.output);
  const draftArtifact = JSON.parse(draftPack.output)[0];
  const durablePack = await npmCommand(['pack', '--offline', '--ignore-scripts', '--json',
    '--workspace', 'event-driven-design-durable', '--pack-destination', join(app, 'vendor')], { cwd: root });
  assert.equal(durablePack.code, 0, durablePack.output);
  const durableArtifact = JSON.parse(durablePack.output)[0];
  assert(editorArtifact.files.some(file => file.path === 'dist/styles.css'));
  assert(!artifact.files.some(file => file.path.startsWith('packages/editor')));
  writeFileSync(join(evidence, 'artifact.json'), JSON.stringify({ core: artifact, editor: editorArtifact, artifacts: draftArtifact, durable: durableArtifact }, null, 2));
  const lockPath = join(app, 'package-lock.json'), lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  assert.equal(lock.packages['node_modules/event-driven-design'].version, artifact.version);
  lock.packages['node_modules/event-driven-design'].integrity = artifact.integrity;
  lock.packages['node_modules/event-driven-design-editor'].integrity = editorArtifact.integrity;
  lock.packages['node_modules/event-driven-design-artifacts'].integrity = draftArtifact.integrity;
  lock.packages['node_modules/event-driven-design-durable'].integrity = durableArtifact.integrity;
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
  const install = await npmCommand(['ci', '--no-audit', '--no-fund'], { cwd: app, log: join(evidence, 'install.log') });
  assert.equal(install.code, 0, install.output);
  const next = join(app, 'node_modules/next/dist/bin/next');
  if (!demo.serve) {
    const client = join(app, 'app/demo.tsx'), original = readFileSync(client, 'utf8');
    try {
      writeFileSync(client, original + "\nimport { serverCanary } from '../lib/provider'; console.log(serverCanary);\n");
      const red = await command(process.execPath, [next, 'build', '--webpack'], { cwd: app, log: join(evidence, 'server-only-negative.log') });
      assert.equal(red.code, 1); assert.match(red.output, /server-only/);
      console.log('Expected server-only import rejection verified.');
    } finally { writeFileSync(client, original); rmSync(join(app, '.next'), { recursive: true, force: true }); }
  }
  await checked(process.execPath, [next, 'build', '--webpack'], { cwd: app,
    env: { NODE_V8_COVERAGE: join(evidence, 'v8-server'),
      NODE_OPTIONS: '--import=' + new globalThis.URL('./next/coverage-exit.mjs', import.meta.url).href },
    log: join(evidence, 'next-build.log'),
  });
  if (demo.serve) {
    serving = await startServer(app, { host: demo.host, port: demo.port, draftDatabase: process.env.FBP_DRAFT_DATABASE ?? join(root, '.nodeflow-drafts.sqlite') });
    console.log('Demo ready:', serving.url, '(Ctrl+C to stop)');
    await new Promise(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve); });
  } else {
    const playwright = join(app, 'node_modules/playwright/cli.js');
    const browserEnv = { PLAYWRIGHT_BROWSERS_PATH: join(tmpdir(), 'fbp-next-browsers') };
    await checked(process.execPath, [playwright, 'install', 'chromium'], {
      cwd: app, env: browserEnv, log: join(evidence, 'browser-install.log'),
    });
    const launch = ['--input-type=module', '-e',
      "import { chromium } from 'playwright'; const browser = await chromium.launch({ timeout: 15000 }); await browser.close();"];
    const probe = await command(process.execPath, launch, {
      cwd: app, env: browserEnv, log: join(evidence, 'browser-launch.log'), timeoutMs: 30000,
    });
    if (probe.code !== 0 && process.platform === 'linux' && process.env.CI) {
      // Hosted runners may already be able to launch Chromium without installing extra packages.
      await checked('sudo', ['--non-interactive', 'env', 'DEBIAN_FRONTEND=noninteractive', 'NEEDRESTART_SUSPEND=1',
        process.execPath, playwright, 'install-deps', 'chromium'], {
        cwd: app, log: join(evidence, 'browser-dependencies.log'),
      });
      await checked(process.execPath, launch, {
        cwd: app, env: browserEnv, log: join(evidence, 'browser-launch-after-deps.log'), timeoutMs: 30000,
      });
    } else {
      assert.equal(probe.code, 0, probe.output || `Chromium launch stopped with ${probe.signal}`);
    }
    cpSync(join(root, 'examples/content-review'), join(app, 'lib/s24f'), { recursive: true });
    const tests = ['consumer', 'inspector', 'inspector-state', 'coverage-signal', 'execution', 'demo-address', 'http', 'diagnostics', 'diagnostic-state', 'diagnostic-api', 'editor', 'content-review', 'content-comparison', 'durable-progress'].map(name => join(root, `test/next/${name}.test.js`));
    const tested = await command(process.execPath, ['--test', '--test-reporter=tap', ...tests], {
      cwd: root, env: { FBP_NEXT_APP: app, FBP_NEXT_EVIDENCE: evidence, NODE_V8_COVERAGE: join(evidence, 'v8-test'), ...browserEnv },
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
