import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { npmCommand } from './next/process.mjs';
import { startServer } from './next/server.mjs';

const root = fileURLToPath(new globalThis.URL('..', import.meta.url));
const target = realpathSync(mkdtempSync(join(tmpdir(), 'fbp-content-workspace-')));
const framework = join(target, 'packages/nodeflow'), web = join(target, 'apps/web');
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const write = (file, data) => writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
mkdirSync(framework, { recursive: true });
for (const path of ['src', 'scripts/build.mjs', 'package.json', 'tsconfig.base.json', 'tsconfig.esm.json', 'tsconfig.cjs.json']) {
  cpSync(join(root, path), join(framework, path), { recursive: true });
}
const fixture = join(root, 'fixtures/next-consumer');
cpSync(fixture, web, { recursive: true, filter: path => !['node_modules', '.next', 'vendor', 'package-lock.json'].includes(basename(path)) });
const frameworkManifest = read(join(framework, 'package.json')), webManifest = read(join(web, 'package.json'));
webManifest.dependencies[frameworkManifest.name] = frameworkManifest.version;
write(join(web, 'package.json'), webManifest);
const manifest = { name: 'fbp-content-workspace', version: '1.0.0', private: true, workspaces: ['packages/nodeflow', 'apps/web'],
  scripts: { build: 'npm run build --workspace event-driven-design && npm run build --workspace fbp-next-consumer',
    start: 'npm run start --workspace fbp-next-consumer' } };
write(join(target, 'package.json'), manifest);
const frameworkLock = read(join(root, 'package-lock.json')), webLock = read(join(fixture, 'package-lock.json'));
const packages = { ...frameworkLock.packages, ...webLock.packages, '': manifest,
  'packages/nodeflow': frameworkManifest, 'apps/web': webManifest,
  'node_modules/event-driven-design': { resolved: 'packages/nodeflow', link: true },
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
await npm(['run', 'build']);
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
