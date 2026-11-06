import 'server-only';
import { setTimeout } from 'node:timers/promises';
import { broadcast, contract, createGraph, defineFunction, joinByKey } from 'event-driven-design';
import type { GraphSpecV2 } from 'event-driven-design';
import { z } from 'zod';

const item = contract('fixture-item@1', z.string().min(1).max(40));
const label = contract('fixture-label@1', z.string());
const units = contract('fixture-units@1', z.number());
const split = broadcast(item, ['label', 'units']);
const labelNode = defineFunction({
  id: 'fixture-label', version: 1, title: 'Look up label', description: 'Resolve a label from the local fixture.',
  input: item, output: label,
  handler: async (value, { signal }) => {
    console.log('FBP_EDITOR_TEST_LOOKUP');
    await setTimeout(value === 'slow' ? 2600 : 20, undefined, { signal });
    return value.toUpperCase();
  },
});
const unitsNode = defineFunction({
  id: 'fixture-units', version: 1, title: 'Look up units', description: 'Resolve a unit count from the local fixture.',
  input: item, output: units,
  handler: async (value, { signal }) => {
    console.log('FBP_EDITOR_TEST_LOOKUP');
    await setTimeout(10, undefined, { signal });
    return value.length;
  },
});
const join = joinByKey({ label, units }, { outputId: 'fixture-result@1' });
export const fixtureRegistry = {
  'broadcast@1': split, 'fixture-label@1': labelNode, 'fixture-units@1': unitsNode, 'join-by-key@1': join,
};

const graph = createGraph();
const a = graph.add('split', split);
const b = graph.add('labels', labelNode);
const c = graph.add('units', unitsNode);
const d = graph.add('join', join);
graph.connect(a, 'label', b, 'in');
graph.connect(a, 'units', c, 'in');
graph.connect(b, 'out', d, 'label');
graph.connect(c, 'out', d, 'units');
graph.exposeInput('item', a, 'in');
graph.exposeOutput('result', d, 'out');
export const fixtureGraph: GraphSpecV2 = { ...graph.toSpec(), version: 2 };
