import type { InspectionSource, ComponentDescriptor, PortDescriptor } from 'event-driven-design/model';
import type { Diagram } from './inspection-diagram';
type GraphSource = Extract<InspectionSource, { kind: 'graph' }>;

const portType = (port: PortDescriptor) => {
  const schema = port.schema as { type?: string | string[] };
  return Array.isArray(schema.type) ? schema.type.join(' | ') : schema.type ?? 'JSON';
};
const ports = (side: string, values: ComponentDescriptor['in']) => Object.entries(values).map(([name, port]) => `${side} ${name}: ${portType(port)}`);

/** Cards describe contracts and actual process/channel state; they never guess business behavior. */
export function graphCards(source: GraphSource): Diagram {
  const vertices: Diagram['vertices'] = [], edges: Diagram['edges'] = [];
  const ids = new Map(source.spec.nodes.map((node, index) => [node.id, 'node-' + index]));
  const columns = new Map<string, number>();
  function column(id: string): number {
    if (columns.has(id)) return columns.get(id)!;
    const parents = source.spec.edges.filter(edge => edge.to.node === id);
    const value = parents.length ? Math.max(...parents.map(edge => column(edge.from.node))) + 1 : 0;
    columns.set(id, value); return value;
  }
  const channels = new Map(source.run?.channels.map(channel => [channel.id, channel]));
  const counts = new Map(source.spec.nodes.map(node => [node.id, { received: 0, sent: 0 }]));
  function count(id: string, from: string | null, to: string | null) {
    const channel = channels.get(id);
    if (channel && from) counts.get(from)!.sent += channel.sent;
    if (channel && to) counts.get(to)!.received += channel.received;
  }
  source.spec.edges.forEach((edge, index) => count('edge:' + index, edge.from.node, edge.to.node));
  Object.entries(source.spec.inputs).forEach(([name, endpoint]) => count('input:' + name, null, endpoint.node));
  Object.entries(source.spec.outputs).forEach(([name, endpoint]) => count('output:' + name, endpoint.node, null));
  for (const node of source.spec.nodes) {
    const component = source.catalog.components.find(item => `${item.id}@${item.version}` === node.component)!;
    const status = source.run?.nodes.find(item => item.id === node.id)?.status ?? 'idle';
    const totals = counts.get(node.id)!;
    vertices.push({ id: ids.get(node.id)!, label: component.title, nodeId: node.id, column: column(node.id),
      lines: [component.description, node.id + ' · ' + node.component, ...ports('Input', component.in), ...ports('Output', component.out),
        `Process: ${status}`, `Received: ${totals.received} · Sent: ${totals.sent}`],
      details: JSON.stringify({ node, component, status, counts: totals }, null, 2) });
  }
  source.spec.edges.forEach((edge, index) => edges.push({ from: ids.get(edge.from.node)!, to: ids.get(edge.to.node)!,
    label: `${edge.from.port} → ${edge.to.port} · capacity ${edge.capacity ?? 'default'}`, kind: 'defined', channelId: 'edge:' + index }));
  for (const [side, endpoints] of [['input', source.spec.inputs], ['output', source.spec.outputs]] as const) {
    for (const [name, endpoint] of Object.entries(endpoints)) {
      const node = source.spec.nodes.find(node => node.id === endpoint.node)!;
      const component = source.catalog.components.find(item => `${item.id}@${item.version}` === node.component)!;
      const descriptor = (side === 'input' ? component.in : component.out)[endpoint.port]!;
      const id = `${side}-${vertices.length}`, target = ids.get(endpoint.node)!;
      vertices.push({ id, label: `${side === 'input' ? 'Input' : 'Output'}: ${name}`, column: side === 'input' ? Math.max(0, column(endpoint.node) - 1) : column(endpoint.node) + 1,
        lines: [portType(descriptor), `${side === 'input' ? 'Feeds' : 'From'} ${component.title}.${endpoint.port}`],
        details: JSON.stringify({ endpoint, contract: descriptor }, null, 2) });
      edges.push({ from: side === 'input' ? id : target, to: side === 'input' ? target : id,
        label: name + ' → ' + endpoint.port, kind: 'defined', channelId: side + ':' + name });
    }
  }
  return { vertices, edges };
}
