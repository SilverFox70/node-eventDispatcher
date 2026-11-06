import 'server-only';

const reserved = new Set(['serviceBindings', 'credentials']);
function containsHostBinding(value: unknown): boolean {
  return value !== null && typeof value === 'object' &&
    Object.entries(value).some(([key, child]) => reserved.has(key) || containsHostBinding(child));
}

export function hostBindingIssues(graph: unknown) {
  if (!graph || typeof graph !== 'object' || !('nodes' in graph) || !Array.isArray(graph.nodes)) return [];
  return graph.nodes.flatMap((node, index) =>
    containsHostBinding(node?.config) ? [{ code: 'HOST_BINDING_FORBIDDEN', path: `$.nodes[${index}].config` }] : []);
}
