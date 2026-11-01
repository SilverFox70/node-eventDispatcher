import Link from 'next/link';
import Demo from './demo';
import { graphSpec, catalog } from '../lib/registry';

export const dynamic = 'force-dynamic';

export default function Page() {
  const displayed = process.env.FBP_DEMO_BAD_CATALOG === '1' ? { ...catalog, version: 99 } : catalog;
  return <main><h1>NodeDispatcher in Next.js</h1><p>A packaged flow running on the server.</p><Demo spec={graphSpec} catalog={displayed as typeof catalog} />
    <section className="demo-launch" aria-label="Live Pokémon demo">
      <h2>Try a live Pokémon flow</h2>
      <p>Fetch Pikachu, Bulbasaur and Charmander from PokéAPI. Watch parallel stats and species calls join into result cards, with real packet activity and timings.</p>
      <p><Link href="/inspector#pokemon-demo">Open the live Pokémon demo</Link></p>
      <small>Choose Run live Pokémon example in the inspector to start the external calls and capture their public results. No API key needed; responses may be cached.</small>
    </section>
  </main>;
}
