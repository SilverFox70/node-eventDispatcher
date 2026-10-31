'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { InspectionSnapshot } from 'event-driven-design/model';
import { connectInspection } from '../../lib/inspection-connection';
import type { ConnectionStatus } from '../../lib/inspection-connection';
import { inspectionDiagram } from '../../lib/inspection-diagram';
import DiagramView from './diagram';

export default function Inspector() {
  const [snapshot, setSnapshot] = useState<InspectionSnapshot | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('Connecting');
  const [sourceId, setSourceId] = useState('account-flow');
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => connectInspection(setSnapshot, setStatus), []);
  const source = snapshot?.sources.find(item => item.id === sourceId);
  const diagram = source ? inspectionDiagram(source) : null;
  const detail = diagram?.vertices.find(vertex => vertex.id === selected);
  return <section className="inspector">
    <p role="status" aria-live="polite">Inspection: {status}</p>
    <p>Live example: once delivery, unsubscribe, publisher removal, then a new subscription. Each connection owns its demonstration.</p>
    <label>Inspected source <select value={sourceId} onChange={event => { setSourceId(event.target.value); setSelected(null); }}>
      {snapshot?.sources.map(item => <option key={item.id} value={item.id}>{item.id} ({item.kind})</option>)}
    </select></label>
    <p>Legend: defined wiring (solid), declared publisher (dashed), active subscription (dotted).</p>
    {source && !diagram && <p>Invalid graph metadata</p>}
    {diagram && <>
      <DiagramView diagram={diagram} selected={selected} select={setSelected} />
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
      <h2>Selected details</h2><pre data-testid="inspection-details">{detail ? detail.details : 'Choose an entity to inspect its metadata.'}</pre>
    </>}
    {source?.kind === 'graph' && <><h2>Backend run state</h2><pre data-testid="inspection-run">{JSON.stringify(source.run, null, 2)}</pre></>}
    <Link href="/">Back to flow demo</Link>
  </section>;
}
