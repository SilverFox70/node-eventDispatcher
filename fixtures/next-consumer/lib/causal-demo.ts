import 'server-only';
import { broadcast, compileGraph, createGraph, defineComponent, defineFunction,
  describeRegistry, filter, joinByKey, jsonContract } from 'event-driven-design';

export function causalGraph() {
  const predicate = filter(jsonContract, (value, context) => {
    if (typeof value === 'number' && value >= 5) return true;
    context.recordDecision({ code: 'BELOW_THRESHOLD', ruleVersion: 'v1', outcome: 'drop',
      facts: [{ name: 'amount', sourcePacketId: context.packet.packetId, fieldPath: '' }] });
    return false;
  });
  const gate = defineComponent({ ...predicate, title: 'Check eligibility',
    decisions: [{ code: 'BELOW_THRESHOLD', ruleVersion: 'v1', outcomes: ['drop'], facts: ['amount'] }] });
  const split = broadcast(jsonContract, ['left', 'right']);
  const transform = (id: string, title: string, multiplier: number) => defineFunction({
    id, title, version: 1, description: 'Compute an independent part of the result.',
    input: jsonContract, output: jsonContract, handler: async value => Number(value) * multiplier,
  });
  const left = transform('causal-left', 'Double amount', 2), right = transform('causal-right', 'Triple amount', 3);
  const join = joinByKey({ left: jsonContract, right: jsonContract }, { outputId: 'causal-result@1', maxKeys: 8 });
  const graph = createGraph();
  const input = graph.add('eligibility', gate), fork = graph.add('split', split);
  const a = graph.add('left', left), b = graph.add('right', right), result = graph.add('join', join);
  graph.exposeInput('amount', input, 'in');
  graph.connect(input, 'out', fork, 'in');
  graph.connect(fork, 'left', a, 'in');
  graph.connect(fork, 'right', b, 'in');
  graph.connect(a, 'out', result, 'left');
  graph.connect(b, 'out', result, 'right');
  graph.exposeOutput('result', result, 'out');
  const registry = Object.fromEntries([gate, split, left, right, join].map(node => [node.id + '@1', node]));
  const spec = graph.toSpec(), compiled = compileGraph(spec, registry);
  if (!compiled.ok) throw Error('Invalid causal demo graph');
  return { compiled: compiled.graph, spec, catalog: describeRegistry(registry) };
}
