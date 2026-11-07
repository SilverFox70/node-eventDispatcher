import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const draftSourceDigest = createHash('sha256')
  .update(readFileSync(new URL('./lib/editor-catalog.ts', import.meta.url)))
  .update(readFileSync(new URL('./lib/editor-run-fixture.ts', import.meta.url))).digest('hex');

export default {
  env: { FBP_DRAFT_SOURCE_DIGEST: draftSourceDigest },
  serverExternalPackages: ['event-driven-design-artifacts'],
  productionBrowserSourceMaps: true,
  experimental: { serverSourceMaps: true, cpus: 2 },
  webpack(config, { isServer }) {
    // Workspace symlinks also need to retain the actual package-relative worker URL.
    if (isServer) config.externals.push({
      'event-driven-design-artifacts/sqlite': 'commonjs event-driven-design-artifacts/sqlite',
    });
    config.module.rules.push({
      enforce: 'pre', test: /\.js$/,
      include: dirname(fileURLToPath(import.meta.resolve('event-driven-design-editor'))),
      use: [fileURLToPath(new URL('./editor-source-map.cjs', import.meta.url))],
    });
    return config;
  },
};
