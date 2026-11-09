import { setTimeout as delay } from 'node:timers/promises';
import { startStepWorker } from '../../dist/index.js';
import { openPostgresStore } from '../../dist/postgres/index.js';
import { waitProfile } from './wait-profile.mjs';

process.on('message', async ({ url, scope, generation }) => {
  const store = openPostgresStore(url);
  const worker = startStepWorker({ store, scope, profile: waitProfile(), workerId: 'initial',
    timeoutMs: 3000, pollMs: 10, onError: error => process.send({ error: error.message }) });
  try {
    for (let i = 0; i < 200; i++) {
      const { rows } = await store.withDurableTransaction(scope.workspaceId, tx => tx.query(`
        SELECT w.state,s.lease_owner FROM nodeflow_durable.waits w
        JOIN nodeflow_durable.steps s ON (w.run_id,w.generation)=(s.run_id,s.step_id)
        WHERE w.run_id=$1 AND w.generation=$2`, [scope.runId, generation]));
      if (rows[0]) {
        process.send(rows[0]);
        return;
      }
      await delay(15);
    }
    process.send({ error: 'Wait did not register' });
  } finally { await worker.stop(); await store.close(); }
});
