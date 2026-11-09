import { packet } from 'event-driven-design';
import { canonicalJson } from 'event-driven-design/model';
import { startStepWorker } from 'event-driven-design-durable';
import { approvalArtifact, approvalProfile } from './profile.mjs';

const workspaceId = 'approval-demo';
const actorId = 'local-reviewer';
const authorize = (scope, command) => scope.workspaceId === workspaceId && command.actorId === actorId;
const read = (store, scope) => store.queryRun(scope, { actorId }, (target, actor) =>
  target.workspaceId === workspaceId && actor === actorId);

export async function stageApproval(store, jobId) {
  const artifact = await approvalArtifact();
  const profile = await approvalProfile(artifact);
  const { runId } = await store.withDurableTransaction(workspaceId, async tx => {
    await tx.query('INSERT INTO approval_artifacts VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [artifact.revisionId, canonicalJson(artifact.document)]);
    const run = await tx.stage({
      jobId, revisionId: artifact.revisionId, profilePin: profile.pin,
      inputs: { request: [packet(1, { jobId, key: 'approval' })] },
    });
    if (run.created) await tx.query('INSERT INTO approval_requests VALUES ($1,$2)', [jobId, run.runId]);
    return run;
  });
  const scope = { workspaceId, runId };
  await store.initializeSteps(scope, profile);
  await runUntil(store, scope, profile, snapshot => snapshot.status === 'completed' || snapshot.steps.some(step => step.stage === 'waiting'));
  return scope;
}

async function runUntil(store, scope, profile, ready) {
  const errors = [];
  const worker = startStepWorker({ store, scope, profile, workerId: 'approval-host',
    timeoutMs: 3000, pollMs: 10, onError: error => errors.push(error) });
  try {
    for (let count = 0; count < 200; count++) {
      const snapshot = await read(store, scope);
      if (ready(snapshot)) return;
      if (errors.length) throw errors[0];
      await new Promise(resolve => globalThis.setTimeout(resolve, 15));
    }
    throw Error('APPROVAL_PROGRESS_TIMEOUT');
  } finally { await worker.stop(); }
}

export async function resumeApproval(store, runId) {
  const scope = { workspaceId, runId };
  const snapshot = await read(store, scope);
  const { rows: [stored] } = await store.withDurableTransaction(workspaceId, tx =>
    tx.query('SELECT document FROM approval_artifacts WHERE revision_id=$1', [snapshot.revisionId]));
  if (!stored) throw Error('ARTIFACT_UNAVAILABLE');
  const profile = await approvalProfile({ document: JSON.parse(stored.document), revisionId: snapshot.revisionId }, {
    format: 'nodeflow.durable-profile', version: 1, executionDigest: snapshot.executionDigest, adapterDigest: snapshot.adapterDigest,
  });
  const waiting = snapshot.steps.find(step => step.wait);
  if (!waiting) throw Error('WAIT_UNAVAILABLE');
  const receipt = await store.submitSignal(scope, profile, {
    actorId, generation: waiting.stepId, nodeId: waiting.nodeId, signalName: waiting.wait.signalName,
    expectedRevision: 1, commandKey: 'approve-once', payload: { approved: true },
  }, authorize);
  await runUntil(store, scope, profile, state => state.status === 'completed');
  return { runId, jobId: snapshot.jobId, receipt, outputs: await store.readRoutedOutputs(scope) };
}
