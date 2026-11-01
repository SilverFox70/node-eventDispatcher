import 'server-only';
import { createInspectionScope, startNetwork, packet } from 'event-driven-design';
import { pokemonGraph } from './pokemon-graph.ts';

/** One stream owns six bounded HTTP operations, its graph and observer lifetime. */
export function createPokemonFixture(payloads: boolean) {
  const graph = pokemonGraph(), scope = createInspectionScope();
  const run = startNetwork(graph.compiled, { timeoutMs: 20000, trace: { payloads } });
  const remove = scope.addGraph('pokemon-flow', { spec: graph.spec, catalog: graph.catalog, run });
  const draining = (async () => { for await (const output of run.outputs.cards!) void output; })().catch(() => {});
  const feeding = (async () => {
    for (const name of ['pikachu', 'bulbasaur', 'charmander']) {
      await run.send('pokemon', packet(name, { jobId: 'pokemon-' + name, key: name }));
    }
    await run.finish();
  })().catch(() => run.cancel());
  return {
    snapshot: scope.snapshot, trace: run.trace,
    subscribe(listener: () => void) {
      let active = true;
      const stop = run.onTrace(listener);
      void run.done.then(() => { if (active) listener(); });
      return () => { active = false; stop(); };
    },
    advance() { return false; },
    dispose() { remove(); run.cancel(); run.clearTrace(); void draining; void feeding; }
  };
}
