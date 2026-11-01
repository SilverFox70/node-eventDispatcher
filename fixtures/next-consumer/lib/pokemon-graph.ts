import 'server-only';
import { z } from 'zod';
import { contract, broadcast, defineComponent, defineFunction, joinByKey, createGraph, compileGraph, describeRegistry } from 'event-driven-design';
import { readStats, readSpecies } from './pokemon-http.ts';

export function pokemonGraph() {
  const name = contract('pokemon-name@1', z.enum(['pikachu', 'bulbasaur', 'charmander']));
  const stats = contract('pokemon-stats@1', z.strictObject({ name: z.string(), height: z.number(), weight: z.number(), types: z.array(z.string()) }));
  const species = contract('pokemon-species@1', z.strictObject({ name: z.string(), genus: z.string() }));
  const split = defineComponent({ ...broadcast(name, ['stats', 'species']), title: 'Parallel lookups', description: 'Send one name to both HTTP branches.' });
  const loadStats = defineFunction({ id: 'pokemon-stats', version: 1, title: 'Fetch Pokémon stats',
    description: 'GET public types, height and weight.', input: name, output: stats,
    handler: (value, context) => readStats(value, context.signal) });
  const loadSpecies = defineFunction({ id: 'pokemon-species', version: 1, title: 'Fetch Pokémon species',
    description: 'GET public species information.', input: name, output: species,
    handler: (value, context) => readSpecies(value, context.signal) });
  const join = defineComponent({ ...joinByKey({ stats, species }, { outputId: 'pokemon-card@1', maxKeys: 8 }),
    title: 'Collate Pokémon', description: 'Match both HTTP results by job and key.' });
  const graph = createGraph();
  const fork = graph.add('split', split), a = graph.add('stats', loadStats, { taskTimeoutMs: 5000 });
  const b = graph.add('species', loadSpecies, { taskTimeoutMs: 5000 }), result = graph.add('collate', join);
  graph.connect(fork, 'stats', a, 'in', 1); graph.connect(fork, 'species', b, 'in', 1);
  graph.connect(a, 'out', result, 'stats', 1); graph.connect(b, 'out', result, 'species', 1);
  graph.exposeInput('pokemon', fork, 'in'); graph.exposeOutput('cards', result, 'out');
  const registry = Object.fromEntries([split, loadStats, loadSpecies, join].map(component => [`${component.id}@1`, component]));
  const spec = graph.toSpec();
  const candidate = process.env.FBP_INSPECTION_BAD_GRAPH === '1' ? { ...spec, edges: [] } : spec;
  const compiled = compileGraph(candidate, registry);
  if (!compiled.ok) throw Error('Invalid Pokémon graph');
  return { compiled: compiled.graph, spec: graph.toSpec(), catalog: describeRegistry(registry) };
}
