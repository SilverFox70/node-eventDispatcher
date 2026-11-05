import 'server-only';
import { createGraph, describeRegistry, compileGraph } from 'event-driven-design';
import { loadAccount, buildSummary } from './inspection-components.ts';

export function accountGraph() {
  const registry = { 'load-account@1': loadAccount, 'account-summary@1': buildSummary };
  const graph = createGraph(), first = graph.add('lookup', loadAccount, { taskTimeoutMs: 2000 });
  const second = graph.add('summary', buildSummary, { taskTimeoutMs: 2000 });
  graph.connect(first, 'account', second, 'account', 2);
  graph.exposeInput('accountId', first, 'accountId'); graph.exposeOutput('summary', second, 'summary');
  const spec = graph.toSpec();
  const compiled = compileGraph(process.env.FBP_INSPECTION_BAD_GRAPH === '1' ? { ...spec, edges: [] } : spec, registry);
  if (!compiled.ok) throw Error('Invalid fixed inspection graph');
  return { compiled: compiled.graph, spec, catalog: describeRegistry(registry) };
}
