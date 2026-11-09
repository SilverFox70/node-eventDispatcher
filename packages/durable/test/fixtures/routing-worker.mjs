import { openPostgresStore } from '../../dist/postgres/index.js';
import { routingProfile } from './routing-profile.mjs';

process.on('message', async ({ url, scope }) => {
  const store = openPostgresStore(url);
  const profile = routingProfile();
  try {
    for (let count = 0; count < 2; count++) {
      const [step] = await store.claimSteps(scope, profile, { workerId: 'crash', leaseMs: 60000, limit: 1 });
      const computed = await profile.invokeDelivery(step.nodeId, step.input, { timeoutMs: 5000 }, step.inputPort);
      await store.commitRoutingStep(scope, profile, {
        stepId: step.stepId, workerId: step.workerId, epoch: step.epoch, outputs: computed.outputs,
      });
    }
    process.send({ committed: true });
  } catch (error) { process.send({ error: error.message }); }
  finally { await store.close(); }
});
