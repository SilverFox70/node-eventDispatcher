import type { GraphBundle } from '../bundle/index.js';

const quote = (value: string) => JSON.stringify(value).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function literal(value: unknown): string {
  if (typeof value === 'string') return quote(value);
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(literal).join(', ') + ']';
  return '{ ' + Object.entries(value).map(([key, item]) =>
    (key === '__proto__' ? '[' + quote(key) + ']' : quote(key)) + ': ' + literal(item)).join(', ') + ' }';
}

export function renderGraph({ revision, bindingManifest }: GraphBundle): string {
  const bindings = new Map(bindingManifest.bindings.map((binding, index) => [binding.moduleBindingId, {
    ...binding, alias: 'component_' + (index + 1),
  }]));
  const components = new Map(revision.registryLock.bindings.map(binding =>
    [binding.component, bindings.get(binding.moduleBindingId)!.alias]));
  const handles = new Map(revision.graph.nodes.map(({ id }, index) =>
    [id, 'node_' + id.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 48) + '_' + (index + 1)]));
  const { graph } = revision;
  const lines = [
    '// Generated graph. Keep the bundle for editing and re-export.',
    '// Source semantic hash: ' + revision.semanticHash,
    "import { compileGraph, createGraph } from 'event-driven-design';",
    ...[...bindings.values()].map(({ exportName, alias, specifier }) =>
      `import { ${exportName} as ${alias} } from ${quote(specifier)};`),
    '',
    'export const sourceRevisionId = ' + quote(revision.revisionId) + ';',
    'const builder = createGraph();',
  ];
  for (const { id, component, ...options } of graph.nodes) {
    const args = [quote(id), components.get(component)!];
    if (Object.keys(options).length) args.push(literal(options));
    lines.push(`const ${handles.get(id)} = builder.add(${args.join(', ')});`);
  }
  lines.push('');
  for (const edge of graph.edges) {
    const { from, to, capacity } = edge;
    const args = [handles.get(from.node)!, quote(from.port), handles.get(to.node)!, quote(to.port)];
    if (capacity !== undefined) args.push(String(capacity));
    lines.push(`builder.connect(${args.join(', ')});`);
  }
  for (const [method, endpoints] of [['exposeInput', graph.inputs], ['exposeOutput', graph.outputs]] as const) {
    for (const [name, endpoint] of Object.entries(endpoints)) {
      lines.push(`builder.${method}(${quote(name)}, ${handles.get(endpoint.node)}, ${quote(endpoint.port)});`);
    }
  }
  lines.push('', `export const graph = { ...builder.toSpec(), version: ${graph.version} as const };`,
    'export const registry = {',
    ...[...components].map(([identity, alias]) => `  ${quote(identity)}: ${alias},`),
    '};', 'export const compiled = compileGraph(graph, registry);', '');
  return lines.join('\n');
}
