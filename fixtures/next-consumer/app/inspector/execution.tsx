'use client';
import { useState } from 'react';
import type { ExecutionTraceSnapshot } from 'event-driven-design/model';

export default function ExecutionView({ trace, allowPayloads }: { trace: ExecutionTraceSnapshot; allowPayloads: boolean }) {
  const [selected, setSelected] = useState<number | null>(null);
  const event = trace.events.find(event => event.sequence === selected);
  return <section className="execution-panel" aria-label="Packet execution">
    <h2>Packet activity</h2>
    <p>{trace.total} transfer observations · {trace.dropped} older observations outside the retained window</p>
    <small>Run: {trace.runId}</small>
    <div className="table-scroll"><table><caption>Observed packet transfers</caption>
      <thead><tr><th>Elapsed</th><th>Transfer</th><th>Channel</th><th>Job</th><th>Packet</th></tr></thead>
      <tbody>{trace.events.map(item => <tr key={item.sequence} data-transfer={item.kind}>
        <td>{item.timeMs.toFixed(1)} ms</td><td>{item.kind}</td><td>{item.channelId}</td><td>{item.jobId}</td>
        <td><button type="button" aria-pressed={selected === item.sequence} onClick={() => setSelected(item.sequence)}
          aria-label={`Inspect transfer ${item.sequence}`}>{item.packetId.slice(0, 8)}</button></td>
      </tr>)}</tbody>
    </table></div>
    <h3>Packet details</h3>
    {event ? <>
      <dl><dt>Packet ID</dt><dd>{event.packetId}</dd><dt>Job ID</dt><dd>{event.jobId}</dd>
        <dt>Immediate parent packets</dt><dd>{event.parentPacketIds.join(', ') || 'Root packet'}</dd>
        <dt>Route</dt><dd>{JSON.stringify({ from: event.from, to: event.to })}</dd></dl>
      {!allowPayloads ? <p>Payload capture is off.</p> : event.payloadState === 'captured'
        ? <pre data-testid="packet-payload">{JSON.stringify(event.payload, null, 2)}</pre>
        : <p>Payload omitted: {event.payloadState}.</p>}
    </> : <p>Select a transfer to inspect its identity and immediate lineage.</p>}
    <p>Each handoff produces a sent and a received observation. Process status and counters come from the runtime.</p>
  </section>;
}
