'use client';
import { useState } from 'react';
import type { ExecutionTraceSnapshot } from 'event-driven-design/model';
import type { Diagram } from '../../lib/inspection-diagram';

/** Browse retained public outputs; changing the selected stage never executes work. */
export default function PokemonResults({ trace, diagram }: { trace: ExecutionTraceSnapshot; diagram: Diagram }) {
  const [stage, setStage] = useState('final');
  const stages = diagram.vertices.filter(vertex => vertex.nodeId);
  const cards = trace.events.filter(event => event.kind === 'sent' && event.from !== null && event.payloadState === 'captured' &&
    (stage === 'final' ? event.channelId === 'output:cards' : event.from.node === stage));
  return <section aria-label="Pokémon results"><h2>Public API flow results</h2>
    <label>Output stage <select value={stage} onChange={event => setStage(event.target.value)}>
      <option value="final">Final collated result</option>
      {stages.map(vertex => <option key={vertex.nodeId} value={vertex.nodeId}>{vertex.label}</option>)}
    </select></label>
    <p>{trace.payloads ? 'Browse the packets emitted at each stage. Height is in decimetres; weight is in hectograms.' : 'Enable capture to inspect public results.'}</p>
    <small>Retained outputs only · {trace.dropped} earlier transfer observations outside the retained window. Selecting a stage does not make another API call.</small>
    {cards.length === 0 && <p>No captured outputs retained for this stage.</p>}
    <div className="pokemon-results" role="region" aria-label="Stage outputs" tabIndex={0}>{cards.map(event => <article key={event.sequence}>
      <h3>{event.jobId.replace('pokemon-', '')}</h3>
      <small>Port: {event.from!.port} · {event.timeMs.toFixed(1)} ms</small>
      <small>Packet: {event.packetId}</small>
      <pre tabIndex={0} aria-label={'Output ' + event.jobId + ' port ' + event.from!.port}>{JSON.stringify(event.payload, null, 2)}</pre>
    </article>)}</div>
  </section>;
}
