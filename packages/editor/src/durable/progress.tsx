'use client';

import { useCallback, useState } from 'react';
import { useDurableProgress } from './use-progress.js';

export type DurableRunInspectorProps = Readonly<{
  endpoint: string;
  origin?: Readonly<{ revisionId: string; executionDigest: string; nodes: Readonly<Record<string, string>> }> | undefined;
}>;

/** Mount a separate inspector per run. All reads and commands go through the host endpoint. */
export function DurableRunInspector({ endpoint, origin }: DurableRunInspectorProps) {
  const [cursor, setCursor] = useState<string | null>(null);
  const reset = useCallback(() => setCursor(null), []);
  const { snapshot, connection, action, busy, send, refresh } = useDurableProgress(endpoint, cursor, reset);
  const mapped = origin?.revisionId === snapshot?.revisionId && origin?.executionDigest === snapshot?.executionDigest;
  const actionable = !busy && connection === 'Connected' && snapshot?.status === 'queued';
  return <section aria-label="Durable run progress">
    <p role="status">Connection: {connection}</p>
    <button type="button" onClick={refresh}>Refresh progress</button>
    {action && <p role="status">{action}</p>}
    {snapshot && <>
      <h2>Run: {snapshot.status}</h2>
      {connection === 'Disconnected' && <p>Showing the last saved view.</p>}
      <p>Graph revision: {snapshot.revisionId}{!mapped && ' · origin unavailable'}</p>
      {snapshot.failureCode && <p>{snapshot.failureCode}</p>}
      <button type="button" disabled={!actionable} onClick={() => void send({
        kind: 'cancel', expectedRevision: snapshot.lifecycleRevision,
      })}>Cancel run</button>
      <ul aria-label="Persisted steps">
        {snapshot.steps.map(step => <li key={step.stepId}>
          <strong>{(mapped && Object.hasOwn(origin!.nodes, step.nodeId) ? origin!.nodes[step.nodeId] : step.nodeId)}</strong> · {step.stage}
          <div>Attempts: {step.attempts} / {step.maxClaims}{step.failureCode && ' · ' + step.failureCode}</div>
          {step.wait?.state === 'waiting' && <button type="button" disabled={!actionable} onClick={() => void send({
            kind: 'signal', generation: step.stepId, nodeId: step.nodeId,
            signalName: step.wait!.signalName, expectedRevision: step.wait!.revision,
          })}>Approve wait</button>}
          {step.stage === 'uncertain' && step.operation && <button type="button" disabled={!actionable} onClick={() => void send({
            kind: 'resolve', stepId: step.stepId, operationId: step.operation!.operationId, expectedRevision: step.operation!.revision,
          })}>Check provider outcome</button>}
        </li>)}
      </ul>
      {cursor && <button type="button" onClick={reset}>First page</button>}
      {snapshot.nextCursor && <button type="button" onClick={() => setCursor(snapshot.nextCursor)}>Next page</button>}
    </>}
  </section>;
}
