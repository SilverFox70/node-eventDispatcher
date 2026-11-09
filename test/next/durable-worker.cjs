const { pathToFileURL } = require('node:url');
const { join } = require('node:path');

process.on('message', async ({ app, database, scope }) => {
  const base = join(app, 'node_modules/event-driven-design-durable/dist');
  const { openPostgresStore } = await import(pathToFileURL(join(base, 'postgres/index.js')));
  const { startStepWorker } = await import(pathToFileURL(join(base, 'index.js')));
  const { demoDurableProfile } = await import(pathToFileURL(join(app, 'lib/durable/profiles.ts')));
  const store = openPostgresStore(database);
  const profile = demoDurableProfile('wait');
  const worker = startStepWorker({ store, profile, scope, workerId: 'browser-worker', timeoutMs: 3000, pollMs: 10 });
  try {
    for (let i = 0; i < 200; i++) {
      const state = await store.queryRun(scope, { actorId: 'fixture' }, () => true);
      if (state.steps.some(step => step.stage === 'waiting')) {
        process.send('waiting');
        return;
      }
      await new Promise(resolve => globalThis.setTimeout(resolve, 15));
    }
    process.send('timeout');
  } finally { await worker.stop(); await store.close(); }
});
