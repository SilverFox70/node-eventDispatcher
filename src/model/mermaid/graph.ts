import type { InspectionSource } from '../inspection.js';
import type { Diagram } from './writer.js';

export function graphDiagram(source: Extract<InspectionSource, { kind: 'graph' }>, diagram: Diagram): void {
  const components = new Map(source.catalog.components.map(component => [`${component.id}@${component.version}`, component]));
  const ports = new Map<string, string>();
  const key = (node: string, side: string, port: string) => JSON.stringify([node, side, port]);
  for (const node of source.spec.nodes) {
    const component = components.get(node.component)!;
    const vertex = diagram.vertex(`${node.id}: ${component.title}`);
    for (const side of ['in', 'out'] as const) {
      for (const [name, port] of Object.entries(component[side])) {
        const id = diagram.vertex(`${side} ${name} (${port.contractId})`);
        ports.set(key(node.id, side, name), id);
        diagram.edge(side === 'in' ? id : vertex, side === 'in' ? vertex : id, 'defined');
      }
    }
  }
  for (const edge of source.spec.edges) diagram.edge(ports.get(key(edge.from.node, 'out', edge.from.port))!, ports.get(key(edge.to.node, 'in', edge.to.port))!, 'defined');
  for (const side of ['inputs', 'outputs'] as const) {
    for (const [name, endpoint] of Object.entries(source.spec[side])) {
      const external = diagram.vertex(`${side === 'inputs' ? 'input' : 'output'} ${name}`);
      const port = ports.get(key(endpoint.node, side === 'inputs' ? 'in' : 'out', endpoint.port))!;
      diagram.edge(side === 'inputs' ? external : port, side === 'inputs' ? port : external, 'defined');
    }
  }
  if (source.spec.nodes.length === 0) diagram.vertex('No nodes');
}
