import pg from 'pg';
import { openPostgresStore } from '../../dist/postgres/index.js';
import { startStepWorker } from '../../dist/index.js';
import { stepProfile } from './step-profile.mjs';

let store, loop, claim, listener;
const profile = stepProfile({ retry: true });
process.on('message', async ({ action, url, scope, workerId }) => {
  try {
    store ??= openPostgresStore(url);
    if (action === 'claim') {
      const claims = await store.claimSteps(scope, profile, { workerId, leaseMs: 60000, limit: 1 });
      [claim] = claims;
      process.send({ action, claims });
    } else if (action === 'finish') {
      const result = await profile.invokeOnce(claim.nodeId, claim.input, { timeoutMs: 1000 });
      const receipt = await store.commitStep(scope, profile, {
        ...{ stepId: claim.stepId, epoch: claim.epoch, workerId: claim.workerId },
        commitKey: claim.stepId, result: { kind: 'computed', packet: result.packet },
      });
      process.send({ action, receipt });
    } else if (action === 'listen') {
      listener = new pg.Client({ connectionString: url });
      await listener.connect();
      await listener.query('LISTEN nodeflow_step_ready');
      process.send({ action });
    } else if (action === 'loop') {
      const observed = { ...store, async claimSteps(...args) {
        const claims = await store.claimSteps(...args);
        if (claims.length) process.send({ action: 'batch', size: claims.length });
        return claims;
      } };
      loop = startStepWorker({ store: observed, scope, profile, workerId, timeoutMs: 1000, pollMs: 10,
        concurrency: 2, onError: error => process.send({ action: 'error', code: error.code }) });
      process.send({ action });
    } else {
      await loop?.stop();
      await listener?.end();
      await store.close();
      process.disconnect();
    }
  } catch (error) { process.send({ action, code: error.code ?? error.message }); }
});
