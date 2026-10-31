const { createRequire } = require('node:module');
const { join } = require('node:path');
const { writeFileSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const app = process.env.FBP_NEXT_APP, evidence = process.env.FBP_NEXT_EVIDENCE;

module.exports = async function browserFixture(name) {
  const { startServer } = await import('../../scripts/next/server.mjs');
  const server = await startServer(app, { coverage: join(evidence, 'v8-server'), log: join(evidence, `server-${name}.log`) });
  const browser = await createRequire(join(app, 'package.json'))('playwright').chromium.launch({ headless: true });
  return {
    server,
    async open() {
      const context = await browser.newContext();
      await context.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new globalThis.URL(route.request().url()).hostname) ? route.continue() : route.abort());
      const page = await context.newPage();
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
      let captureId = 0;
      async function capture() {
        const entries = (await page.coverage.stopJSCoverage()).filter(item => item.url.includes('/_next/static/')).map(item => ({ ...item,
          url: pathToFileURL(join(app, '.next', item.url.split('/_next/')[1])).href }));
        writeFileSync(join(evidence, `browser-${name}-${Date.now()}-${captureId++}.json`), JSON.stringify({ result: entries }));
      }
      return { context, page,
        async checkpoint() { await capture(); await page.coverage.startJSCoverage({ resetOnNavigation: false }); },
        async close() { await capture(); await context.close(); }
      };
    },
    async close() { await browser.close(); await server.stop(); }
  };
};
