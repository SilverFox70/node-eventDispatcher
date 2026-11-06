import { useState } from 'react';
import { stageEvents, waitingPorts } from './live-model.js';
import type { DebugSession } from './live-model.js';
import type { useLiveRun } from './use-live-run.js';

export function LiveRunPanel({ session, live, revision, chosenJob, setJob, stage, setStage, paused, setPaused }: {
  session: DebugSession; live: ReturnType<typeof useLiveRun>; revision: number;
  chosenJob: string; setJob: (id: string) => void; stage: string; setStage: (id: string) => void;
  paused: boolean; setPaused: (value: boolean) => void;
}) {
  const [frozen, setFrozen] = useState(live?.snapshot);
  const snapshot = paused ? frozen : live?.snapshot;
  const events = snapshot?.trace.events ?? [];
  const jobs = [...new Set(events.map(event => event.jobId))];
  const job = jobs.includes(chosenJob) ? chosenJob : jobs[0] ?? '';
  const visible = stageEvents(events, job, stage);
  const active = snapshot?.status === 'running' || snapshot?.status === 'draining';
  const waiting = active && snapshot.trace.dropped === 0 ? waitingPorts(session.graph, visible, stage) : [];
  const connection = live?.connection ?? 'connecting';

  return <section className="nodeflow-live" aria-label="Live packet view">
    <h3>Live packet view</h3>
    <p role="status">{connection === 'live' ? 'Live connection' : connection === 'disconnected' ? 'Live view disconnected. Reconnecting…' : 'Connecting live view…'}</p>
    {live?.reconnected && <p>Live view reconnected from the latest snapshot.</p>}
    {session.revision !== revision && <p>Watching an earlier draft revision.</p>}
    {snapshot && <p>Run {snapshot.status} · {snapshot.trace.runId}</p>}
    <details><summary>Follow one packet</summary>
      <p>Load the slow-branch input and choose Run test. Select a job and a node to inspect its received and sent packets, or choose Final outputs.</p>
      <p>Waiting means a join has received some inputs. Payload not captured means the transfer happened without a retained value. A history gap means older events were evicted.</p>
      <p>Pause display keeps the current snapshot while the test continues.</p>
    </details>
    <button type="button" onClick={() => { setFrozen(live?.snapshot); setPaused(!paused); }}>
      {paused ? 'Resume display' : 'Pause display'}
    </button>
    <label>Job <select aria-label="Job" value={job} onChange={event => setJob(event.currentTarget.value)}>
      <option value="">Waiting for packets</option>
      {jobs.map(id => <option key={id} value={id}>{id}</option>)}
    </select></label>
    <label>Stage <select aria-label="Stage" value={stage} onChange={event => setStage(event.currentTarget.value)}>
      <option value="">Final outputs</option>
      {session.graph.nodes.map(node => <option key={node.id} value={node.id}>{node.id}</option>)}
    </select></label>
    {snapshot && snapshot.trace.dropped > 0 && <p>History gap · {snapshot.trace.dropped} earlier events are unavailable.</p>}
    {waiting.length > 0 && <p>Waiting for {waiting.join(', ')}.</p>}
    <ol aria-label="Packet transfers" tabIndex={0}>{visible.map(event => <li key={event.sequence}>
      <strong>{event.kind} · {event.from?.port ?? 'input'} → {event.to?.port ?? 'output'}</strong>
      <div>Packet {event.packetId}</div>
      {event.parentPacketIds.length > 0 && <small>Parents {event.parentPacketIds.join(", ")}</small>}
      {event.payloadState === 'captured' ? <pre>{JSON.stringify(event.payload, null, 2)}</pre>
        : <p>{event.payloadState === 'oversize' ? 'Payload too large to capture.' : 'Payload not captured.'}</p>}
    </li>)}</ol>
    {visible.length === 0 && <p>No transfers at this stage yet.</p>}
  </section>;
}
