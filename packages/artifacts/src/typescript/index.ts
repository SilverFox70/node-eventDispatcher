import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { inspectGraphBundle, writeGraphBundle, assertTrustedBundle } from '../bundle/index.js';
import type { BundleTrust } from '../bundle/index.js';
import type { GraphSpec } from 'event-driven-design/model';
import { renderGraph } from './render.js';

export type TypeScriptExportTrust = BundleTrust & Readonly<{
  approveConfiguration: (graph: GraphSpec) => boolean;
}>;

/** Preview a deterministic export. The host reviews configuration for portability and disclosure. */
export function previewTypeScriptExport(input: string | Uint8Array, trust: TypeScriptExportTrust) {
  const source = inspectGraphBundle(input);
  assertTrustedBundle(source, trust);
  if (!trust.approveConfiguration(structuredClone(source.revision.graph))) throw Error('EXPORT_CONFIGURATION_REFUSED');
  const dependencies = [...new Set(['event-driven-design', ...source.bindingManifest.bindings.map(binding => binding.specifier)])].sort();
  const files = {
    'graph.ts': renderGraph(source),
    'graph.bundle.json': writeGraphBundle(source.revision, source.bindingManifest, source.layout),
    'README.md': 'Build graph.ts with TypeScript using Node module resolution. Install the host dependencies listed in export-manifest.json and match the registry lock in graph.bundle.json.\n' +
      'Use the compiled result with the ordinary runtime. Keep graph.bundle.json for re-import.\n',
  };
  const hashes = Object.fromEntries(Object.entries(files).map(([path, contents]) =>
    [path, createHash('sha256').update(contents, 'utf8').digest('hex')]));
  return { ...files, 'export-manifest.json': JSON.stringify({
    version: 1, revisionId: source.revision.revisionId, dependencies, files: hashes,
  }, null, 2) + '\n' };
}

/** Publish only into an unused directory. The generated paths are fixed. */
export async function writeTypeScriptExport(root: string, name: string, input: string | Uint8Array, trust: TypeScriptExportTrust) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(name)) throw Error('EXPORT_PATH_REFUSED');
  const directory = join(root, name);
  const files = previewTypeScriptExport(input, trust);
  try { await mkdir(directory); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw Error('EXPORT_CONFLICT');
    throw error;
  }
  for (const [path, contents] of Object.entries(files)) {
    await writeFile(join(directory, path), contents, { flag: 'wx', encoding: 'utf8' });
  }
  return files;
}
