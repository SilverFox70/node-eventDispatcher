import { openPostgresStore } from '../../dist/postgres/index.js';
import { stepProfile } from './step-profile.mjs';

process.on('message', async ({ url, scope }) => {
  const store = openPostgresStore(url);
  try {
    const profile = stepProfile();
    const [step] = await store.sweepReady(scope);
    const computation = await profile.invoke(step.nodeId, step.input, { timeoutMs: 1000 });
    if (computation.status !== 'computed') throw Error('COMPUTE_FAILED');
    const command = { stepId: step.stepId, epoch: step.epoch, commitKey: 'finish-A',
      result: { kind: 'computed', packet: computation.packet } };
    process.send({ state: 'committing', command });
    const receipt = await store.commitStep(scope, profile, command);
    process.send({ state: 'committed', receipt });
  } catch (error) {
    process.send({ state: 'failed', error: error.code ?? error.message });
  } finally { await store.close(); }
});
