'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { InspectionSnapshot, ExecutionTraceSnapshot } from 'event-driven-design/model';
import { connectInspection } from '../../lib/inspection-connection';
import type { ConnectionStatus } from '../../lib/inspection-connection';
import { inspectionDiagram } from '../../lib/inspection-diagram';
import DiagramView from './diagram';
import ExecutionView from './execution';

export default function Inspector() {
  const [snapshot, setSnapshot] = useState<InspectionSnapshot | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('Connecting');
  const [sourceId, setSourceId] = useState('account-flow');
  const [selected, setSelected] = useState<string | null>(null);
  const [execution, setExecution] = useState<ExecutionTraceSnapshot | null>(null);
  const [payloads, setPayloads] = useState(false);
  const [restart, setRestart] = useState(0);
  useEffect(() => {
    setSnapshot(null); setExecution(null); setSelected(null); setStatus('Connecting');
    return connectInspection((snapshot, execution) => { setSnapshot(snapshot); setExecution(execution); }, setStatus,
      () => new EventSource('/api/inspection?payloads=' + (payloads ? '1' : '0')));
  }, [payloads, restart]);
  const source = snapshot?.sources.find(item => item.id === sourceId);
  const diagram = source ? inspectionDiagram(source) : null;
  const trace = source?.kind === 'graph' && source.run?.runId === execution?.runId ? execution : null;
  const detail = diagram?.vertices.find(vertex => vertex.id === selected);
  return <section className="inspector">
    <p role="status" aria-live="polite">Connection: {status}</p>
    <p>A real local example: account ID → asynchronous sample lookup → display summary. Three invented accounts run through typed ports; packet markers reflect observed sends.</p>
    <div className="execution-controls">
      <button type="button" onClick={() => { setSourceId('account-flow'); setRestart(value => value + 1); }}>Run account example again</button>
      <label className="payload-choice"><input type="checkbox" checked={payloads} onChange={event => { setSourceId('account-flow'); setPayloads(event.target.checked); }} />Capture sample payloads</label>
    </div>
    <p>Payloads are off by default. Changing capture restarts this local example and clears the previous view.</p>
    <label>Inspected source <select value={sourceId} onChange={event => { setSourceId(event.target.value); setSelected(null); }}>
      {snapshot?.sources.map(item => <option key={item.id} value={item.id}>{item.id} ({item.kind})</option>)}
    </select></label>
    <p>Legend: defined wiring (solid), declared publisher (dashed), active subscription (dotted).</p>
    {source && !diagram && <p>Invalid graph metadata</p>}
    {diagram && <>
      <DiagramView key={sourceId} trace={trace} diagram={diagram} selected={selected} select={setSelected} />
      {trace && <ExecutionView key={trace.runId} trace={trace} allowPayloads={payloads} />}
      <h2>Relationship text</h2>
      <ul aria-label="Entities">{diagram.vertices.map(vertex => <li key={vertex.id}>
        <button type="button" aria-pressed={selected === vertex.id} onClick={() => setSelected(vertex.id)}>{vertex.label}</button>
        {' — ' + vertex.lines.join(', ')}
      </li>)}</ul>
      <table><caption>Current relationships</caption><thead><tr><th>From</th><th>To</th><th>Connection</th><th>Kind</th></tr></thead>
        <tbody>{diagram.edges.map((edge, index) => <tr key={index} data-text-relationship={edge.kind}>
          <td>{diagram.vertices.find(vertex => vertex.id === edge.from)!.label}</td>
          <td>{diagram.vertices.find(vertex => vertex.id === edge.to)!.label}</td><td>{edge.label}</td><td>{edge.kind}</td>
        </tr>)}</tbody></table>
      <details><summary>Selected metadata: {detail?.label ?? 'choose an entity'}</summary><pre data-testid="inspection-details">{detail ? detail.details : 'Choose an entity to inspect its metadata.'}</pre></details>
    </>}
    {source?.kind === 'graph' && <details><summary>Backend run state</summary><pre data-testid="inspection-run">{JSON.stringify(source.run, null, 2)}</pre></details>}
    <Link href="/">Back to flow demo</Link>
  </section>;
}
