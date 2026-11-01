import type { ExecutionTraceSnapshot } from 'event-driven-design/model';

/** Public captured output only; no client-side application schema verdict is claimed. */
export default function PokemonResults({ trace }: { trace: ExecutionTraceSnapshot }) {
  const cards = trace.events.filter(event => event.kind === 'sent' && event.channelId === 'output:cards' && event.payloadState === 'captured');
  return <section aria-label="Pokémon results"><h2>Collated public API results</h2>
    <p>{trace.payloads ? 'Each card combines the two HTTP branches. Height is in decimetres; weight is in hectograms.' : 'Enable capture to inspect public results.'}</p>
    <div className="pokemon-results">{cards.map(event => <article key={event.packetId}>
      <h3>{event.jobId.replace('pokemon-', '')}</h3><pre>{JSON.stringify(event.payload, null, 2)}</pre>
    </article>)}</div>
  </section>;
}
