'use client';
import { useEffect, useId, useRef } from 'react';
import type { ExecutionTraceEvent, ExecutionTraceSnapshot } from 'event-driven-design/model';
import type { Vertex } from '../../lib/inspection-diagram';

function Observation({ event, direction, allowPayloads }: {
  event: ExecutionTraceEvent; direction: 'input' | 'output'; allowPayloads: boolean;
}) {
  const port = direction === 'input' ? event.to!.port : event.from!.port;
  return <article className="node-observation">
    <strong>Port: {port}</strong>
    <small>{event.timeMs.toFixed(1)} ms · Packet: {event.packetId}</small>
    <small>Immediate parents: {event.parentPacketIds.join(', ') || 'Root packet'}</small>
    {allowPayloads && event.payloadState === 'captured'
      ? <pre>{JSON.stringify(event.payload, null, 2)}</pre>
      : <p>{event.payloadState === 'oversize' ? 'Payload exceeded the capture size limit.' : 'Payload is not available in this view.'}</p>}
  </article>;
}

/** Present the current run's retained channel observations, never infer a missing value. */
export default function NodeDetails({ vertex, trace, allowPayloads, close }: {
  vertex: Vertex; trace: ExecutionTraceSnapshot | null; allowPayloads: boolean; close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null), heading = useId();
  useEffect(() => {
    const element = dialog.current!; element.showModal();
    return () => element.close();
  }, []);
  const observations = trace?.events.filter(event =>
    (event.kind === 'received' && event.to?.node === vertex.nodeId) ||
    (event.kind === 'sent' && event.from?.node === vertex.nodeId)) ?? [];
  const jobs = [...new Set(observations.map(event => event.jobId))];
  return <dialog ref={dialog} className="node-details" aria-labelledby={heading} onClose={close}>
    <header><h2 id={heading}>{vertex.label}</h2><button type="button" autoFocus onClick={() => dialog.current!.close()}>Close node details</button></header>
    <p>{vertex.lines[0]}</p>
    <p>Inputs show packets received by this node. Outputs show packets it sent; delivery alone does not prove business success.</p>
    {trace ? <>
      <small>Run: {trace.runId}</small>
      {!allowPayloads && <p>Payload capture is off. Enable capture and run the example again to inspect values; previous values cannot be recovered.</p>}
      {trace.dropped > 0 && <p>{trace.dropped} older observations are no longer retained. This view may be incomplete.</p>}
      {jobs.length === 0 && <p>No input or output observations are retained for this node yet.</p>}
      {jobs.map(jobId => <section key={jobId} className="node-job" aria-label={'Job ' + jobId}>
        <h3>Job: {jobId}</h3>
        <div className="node-io">{(['input', 'output'] as const).map(direction => {
          const events = observations.filter(event => event.jobId === jobId && event.kind === (direction === 'input' ? 'received' : 'sent'));
          return <div key={direction}><h4>{direction === 'input' ? 'Inputs' : 'Outputs'}</h4>
            {events.length === 0 && <p>No {direction} observation retained.</p>}
            {events.map(event => <Observation key={event.sequence} event={event} direction={direction} allowPayloads={allowPayloads} />)}
          </div>;
        })}</div>
      </section>)}
    </> : <p>No execution trace is available for this graph definition.</p>}
    <details><summary>Node definition and state</summary><pre>{vertex.details}</pre></details>
  </dialog>;
}
