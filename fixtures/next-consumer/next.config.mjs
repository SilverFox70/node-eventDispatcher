import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export default {
  productionBrowserSourceMaps: true,
  experimental: { serverSourceMaps: true, cpus: 2 },
  webpack(config) {
    config.module.rules.push({
      enforce: 'pre', test: /\.js$/,
      include: dirname(fileURLToPath(import.meta.resolve('event-driven-design-editor'))),
      use: [fileURLToPath(new URL('./editor-source-map.cjs', import.meta.url))],
    });
    return config;
  },
};
