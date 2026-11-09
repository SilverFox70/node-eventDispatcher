import { openPostgresStore } from '../../dist/postgres/index.js';
import { joinProfile } from './join-profile.mjs';

process.on('message', async ({ url, scope }) => {
  const store = openPostgresStore(url);
  const profile = joinProfile();
  try {
    const claims = await store.claimSteps(scope, profile, { workerId: 'crash', leaseMs: 3000, limit: 1 });
    const [claim] = claims;
    if (claim.inputPort !== 'stats') throw Error('Expected the stats delivery first');
    const status = await store.commitRoutingStep(scope, profile, {
      stepId: claim.stepId, workerId: claim.workerId, epoch: claim.epoch, outputs: {},
    });
    process.send({ status });
  } catch (error) { process.send({ error: error.message }); }
  finally { await store.close(); }
});
