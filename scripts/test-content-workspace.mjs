import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { command, npmCommand } from './next/process.mjs';
import { startServer } from './next/server.mjs';

const root = fileURLToPath(new globalThis.URL('..', import.meta.url));
const target = realpathSync(mkdtempSync(join(tmpdir(), 'fbp-content-workspace-')));
const framework = join(target, 'packages/nodeflow'), editor = join(target, 'packages/editor'), artifacts = join(target, 'packages/artifacts'), web = join(target, 'apps/web');
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const write = (file, data) => writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
mkdirSync(framework, { recursive: true });
for (const path of ['src', 'scripts/build.mjs', 'package.json', 'tsconfig.base.json', 'tsconfig.esm.json', 'tsconfig.cjs.json']) {
  cpSync(join(root, path), join(framework, path), { recursive: true });
}
cpSync(join(root, 'packages/editor'), editor, { recursive: true,
  filter: path => !['node_modules', 'dist'].includes(basename(path)) });
cpSync(join(root, 'packages/artifacts'), artifacts, { recursive: true,
  filter: path => !['node_modules', 'dist'].includes(basename(path)) });
const durable = join(target, 'packages/durable');
cpSync(join(root, 'packages/durable'), durable, { recursive: true,
  filter: path => !['node_modules', 'dist'].includes(basename(path)) });
const durableManifest = read(join(durable, 'package.json'));
const durableConfig = read(join(durable, 'tsconfig.json'));
delete durableConfig.compilerOptions.paths;
write(join(durable, 'tsconfig.json'), durableConfig);
const fixture = join(root, 'fixtures/next-consumer');
cpSync(fixture, web, { recursive: true, filter: path => !['node_modules', '.next', 'vendor', 'package-lock.json'].includes(basename(path)) });
const frameworkManifest = read(join(framework, 'package.json')), webManifest = read(join(web, 'package.json'));
delete frameworkManifest.workspaces;
write(join(framework, 'package.json'), frameworkManifest);
const editorManifest = read(join(editor, 'package.json'));
const artifactManifest = read(join(artifacts, 'package.json'));
const artifactConfig = read(join(artifacts, 'tsconfig.json'));
delete artifactConfig.compilerOptions.paths;
write(join(artifacts, 'tsconfig.json'), artifactConfig);
webManifest.dependencies[frameworkManifest.name] = frameworkManifest.version;
webManifest.dependencies[editorManifest.name] = editorManifest.version;
webManifest.dependencies[artifactManifest.name] = artifactManifest.version;
webManifest.dependencies[durableManifest.name] = durableManifest.version;
write(join(web, 'package.json'), webManifest);
const manifest = { name: 'fbp-content-workspace', version: '1.0.0', private: true, workspaces: ['packages/nodeflow', 'packages/editor', 'packages/artifacts', 'packages/durable', 'apps/web'],
  scripts: { build: 'npm run build --workspace event-driven-design && npm run build --workspace event-driven-design-editor && npm run build --workspace event-driven-design-artifacts && npm run build --workspace event-driven-design-durable && npm run build --workspace fbp-next-consumer',
    start: 'npm run start --workspace fbp-next-consumer' } };
write(join(target, 'package.json'), manifest);
const frameworkLock = read(join(root, 'package-lock.json')), webLock = read(join(fixture, 'package-lock.json'));
const packages = { ...frameworkLock.packages, ...webLock.packages, '': manifest,
  'packages/nodeflow': frameworkManifest, 'packages/editor': editorManifest, 'packages/artifacts': artifactManifest, 'packages/durable': durableManifest, 'apps/web': webManifest,
  'node_modules/event-driven-design': { resolved: 'packages/nodeflow', link: true },
  'node_modules/event-driven-design-editor': { resolved: 'packages/editor', link: true },
  'node_modules/event-driven-design-artifacts': { resolved: 'packages/artifacts', link: true },
  'node_modules/event-driven-design-durable': { resolved: 'packages/durable', link: true },
  'node_modules/fbp-next-consumer': { resolved: 'apps/web', link: true } };
write(join(target, 'package-lock.json'), { name: manifest.name, version: manifest.version, lockfileVersion: 3, requires: true, packages });

async function npm(args) {
  const result = await npmCommand(args, { cwd: target });
  assert.equal(result.code, 0, result.output);
}
const chair = { slug: 'chair', title: 'Chair', description: 'Oak chair.', altText: 'Oak chair from the side.', archived: false };
async function review() {
  const server = await startServer(web, { nextPath: join(target, 'node_modules/next/dist/bin/next') });
  try {
    const response = await globalThis.fetch(server.url + '/api/content-review', { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify(chair) });
    assert.equal(response.status, 200);
    return response.json();
  } finally { await server.stop(); }
}
console.log('Content workspace:', target);
await npm(['ci', '--ignore-scripts', '--no-audit', '--no-fund']);
assert.equal(realpathSync(join(target, 'node_modules/event-driven-design')), realpathSync(framework));
assert.equal(realpathSync(join(target, 'node_modules/event-driven-design-editor')), realpathSync(editor));
await npm(['run', 'build']);
const resolveFrom = path => createRequire(join(path, 'package.json')).resolve('event-driven-design/model');
assert.equal(resolveFrom(editor), resolveFrom(web));
const evidence = join(target, 'evidence');
mkdirSync(join(evidence, 'v8-server'), { recursive: true });
const browser = await npmCommand(['exec', '--offline', '--', 'playwright', 'install', 'chromium'], {
  cwd: target, env: { PLAYWRIGHT_BROWSERS_PATH: join(tmpdir(), 'fbp-next-browsers') },
});
assert.equal(browser.code, 0, browser.output);
const editorTest = await command(process.execPath,
  ['--test', join(root, 'test/next/editor.test.js')], { cwd: root, env: {
    FBP_NEXT_APP: web, FBP_NEXT_EVIDENCE: evidence, FBP_NEXT_PATH: join(target, 'node_modules/next/dist/bin/next'),
    PLAYWRIGHT_BROWSERS_PATH: join(tmpdir(), 'fbp-next-browsers'),
  } });
assert.equal(editorTest.code, 0, editorTest.output);
console.log(editorTest.output);
assert.equal((await review()).review.preview.title, 'Chair');
const file = join(framework, 'src/components/filter.ts');
const previous = readFileSync(file, 'utf8');
assert(previous.includes("if (keep) await ctx.send('out', packet);"));
writeFileSync(file, previous.replace("if (keep) await ctx.send('out', packet);", "if (!keep) await ctx.send('out', packet);"));
await npm(['run', 'build']);
assert.equal((await review()).review, null);
assert.equal(readFileSync(join(web, 'lib/content-review/nodes.ts'), 'utf8'), readFileSync(join(fixture, 'lib/content-review/nodes.ts'), 'utf8'));
console.log('Workspace link and rebuild verified: chair preview became no output after the framework edit.');
console.log('Workspace retained for inspection:', resolve(target));
