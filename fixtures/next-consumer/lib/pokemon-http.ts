import { z } from 'zod';

const pokemon = z.object({ name: z.string().max(80), height: z.number(), weight: z.number(),
  types: z.array(z.object({ type: z.object({ name: z.string().max(80) }) })).max(8) });
const species = z.object({ name: z.string().max(80), genera: z.array(z.object({
  genus: z.string().max(120), language: z.object({ name: z.string().max(80) }) })).max(64) });

/** Only a server-owned loopback override is accepted; request data never supplies URLs. */
export function pokemonBase(override = process.env.FBP_POKEMON_BASE_URL): string {
  if (!override) return 'https://pokeapi.co/api/v2/';
  const url = new URL(override);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw Error('Invalid Pokémon test host');
  }
  return url.href;
}

/** Read a bounded response with cancellation. Next caches successful public GETs for one hour. */
async function read(resource: string, name: string, signal: AbortSignal) {
  const base = pokemonBase();
  const response = await fetch(base + resource + '/' + name, {
    signal, redirect: 'error', ...(base.startsWith('https:') ? { cache: 'force-cache', next: { revalidate: 3600 } } : { cache: 'no-store' })
  });
  if (!response.ok) { await response.body?.cancel(); throw Error('Pokémon HTTP ' + response.status); }
  if (!response.body) throw Error('Empty Pokémon response');
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 524288) throw Error('Pokémon response too large');
      chunks.push(value);
    }
  } finally { await reader.cancel(); reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

export async function readStats(name: string, signal: AbortSignal) {
  const result = pokemon.parse(await read('pokemon', name, signal));
  if (result.name !== name) throw Error('Pokémon identity mismatch');
  return { name, height: result.height, weight: result.weight, types: result.types.map(item => item.type.name) };
}
export async function readSpecies(name: string, signal: AbortSignal) {
  const result = species.parse(await read('pokemon-species', name, signal));
  if (result.name !== name) throw Error('Pokémon identity mismatch');
  return { name, genus: result.genera.find(item => item.language.name === 'en')?.genus ?? 'Unknown genus' };
}
