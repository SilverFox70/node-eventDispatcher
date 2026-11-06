import type { Catalog } from 'event-driven-design/model';
import { pasteSelection } from './clipboard.js';
import { portUsed, topologyIssue, validName, wireId } from './topology.js';
import type { Edit, EditorDocument, EditorIssue } from './types.js';

export function refusal(code: string, path: string): EditorIssue { return { code, path }; }
const omit = <T>(record: Readonly<Record<string, T>>, key: string) =>
  Object.fromEntries(Object.entries(record).filter(([name]) => name !== key));

export const gridPosition = (index: number) => ({ x: 20 + (index % 3) * 200, y: 20 + Math.floor(index / 3) * 130 });

export function editDocument(document: EditorDocument, command: Edit, catalog: Catalog,
  used: ReadonlySet<string>): EditorDocument | EditorIssue {
  const { graph, layout } = document;
  switch (command.type) {
    case 'addNode': {
      const { node } = command;
      if (used.has(node.id)) return refusal('DUPLICATE_ID', '$.nodes');
      if (!catalog.components.some(item => `${item.id}@${item.version}` === node.component)) {
        return refusal('UNKNOWN_COMPONENT', '$.nodes');
      }
      const nextGraph = { ...graph, nodes: [...graph.nodes, node] };
      const occupied = new Set(Object.values(layout.positions).map(point => JSON.stringify([point.x, point.y])));
      let index = graph.nodes.length;
      let position = gridPosition(index);
      while (occupied.has(JSON.stringify([position.x, position.y]))) position = gridPosition(++index);
      return topologyIssue(nextGraph, catalog) ?? {
        graph: nextGraph, layout: { ...layout,
          positions: { ...layout.positions, [node.id]: position } },
      };
    }
    case 'setConfig': {
      const node = graph.nodes.find(node => node.id === command.node);
      if (!node) return refusal('UNKNOWN_NODE', '$.nodes');
      const descriptor = catalog.components.find(item => `${item.id}@${item.version}` === node.component);
      if (!descriptor || !('configuration' in descriptor)) return refusal('CONFIG_INVALID', '$.nodes');
      const { config: previous, ...rest } = node;
      if (Object.is(previous, command.config)) return document;
      const changed = command.config === undefined ? rest : { ...rest, config: command.config };
      const next = { ...graph, nodes: graph.nodes.map(item => item === node ? changed : item) };
      return topologyIssue(next, catalog) ?? { ...document, graph: next };
    }
    case 'removeNode': {
      const id = command.node;
      if (!Object.hasOwn(layout.positions, id)) return refusal('UNKNOWN_NODE', '$.nodes');
      const inputs = Object.fromEntries(Object.entries(graph.inputs).filter(([, endpoint]) => endpoint.node !== id));
      const outputs = Object.fromEntries(Object.entries(graph.outputs).filter(([, endpoint]) => endpoint.node !== id));
      const groups = Object.fromEntries(Object.entries(layout.groups).map(([name, ids]) =>
        [name, ids.filter(member => member !== id)] as const).filter(([, ids]) => ids.length));
      return {
        graph: { ...graph, nodes: graph.nodes.filter(node => node.id !== id),
          edges: graph.edges.filter(wire => wire.from.node !== id && wire.to.node !== id), inputs, outputs },
        layout: { positions: omit(layout.positions, id), groups },
      };
    }
    case 'moveNode': {
      const { node, position } = command;
      if (!Object.hasOwn(layout.positions, node)) return refusal('UNKNOWN_NODE', '$.layout');
      if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) return refusal('INVALID_POSITION', '$.layout');
      const previous = layout.positions[node]!;
      if (previous.x === position.x && previous.y === position.y) return document;
      return { graph, layout: { ...layout, positions: { ...layout.positions, [node]: { ...position } } } };
    }
    case 'connect': {
      const { wire } = command;
      if (portUsed(graph, 'outputs', wire.from) || portUsed(graph, 'inputs', wire.to)) {
        return refusal('PORT_CARDINALITY', '$.edges');
      }
      const next = { ...graph, edges: [...graph.edges, wire] };
      return topologyIssue(next, catalog) ?? { ...document, graph: next };
    }
    case 'disconnect': {
      const edges = graph.edges.filter(wire => wireId(wire) !== wireId(command.wire));
      if (edges.length === graph.edges.length) return refusal('UNKNOWN_EDGE', '$.edges');
      return { ...document, graph: { ...graph, edges } };
    }
    case 'exposeInput':
    case 'exposeOutput': {
      const side = command.type === 'exposeInput' ? 'inputs' : 'outputs';
      if (!validName(command.name) || Object.hasOwn(graph[side], command.name)) return refusal('INVALID_NAME', `$.${side}`);
      if (portUsed(graph, side, command.endpoint)) return refusal('PORT_CARDINALITY', `$.${side}`);
      const next = { ...graph, [side]: { ...graph[side], [command.name]: command.endpoint } };
      return topologyIssue(next, catalog) ?? { ...document, graph: next };
    }
    case 'unexposeInput':
    case 'unexposeOutput': {
      const side = command.type === 'unexposeInput' ? 'inputs' : 'outputs';
      if (!Object.hasOwn(graph[side], command.name)) return refusal('UNKNOWN_PORT', `$.${side}`);
      return { ...document, graph: { ...graph, [side]: omit(graph[side], command.name) } };
    }
    case 'group': {
      const { name, nodes } = command;
      if (!validName(name) || Object.hasOwn(layout.groups, name)) return refusal('INVALID_NAME', '$.layout.groups');
      const ids = [...new Set(nodes)];
      if (!ids.length || ids.some(id => !Object.hasOwn(layout.positions, id))) return refusal('UNKNOWN_NODE', '$.layout.groups');
      return { graph, layout: { ...layout, groups: { ...layout.groups, [name]: ids } } };
    }
    case 'ungroup':
      if (!Object.hasOwn(layout.groups, command.name)) return refusal('UNKNOWN_GROUP', '$.layout.groups');
      return { graph, layout: { ...layout, groups: omit(layout.groups, command.name) } };
    case 'paste': {
      if (!command.clipboard.nodes.length) return document;
      const ids = new Set(command.clipboard.nodes.map(node => node.id));
      if (ids.size !== command.clipboard.nodes.length || [...ids].some(id => {
        const point = Object.hasOwn(command.clipboard.positions, id) && command.clipboard.positions[id];
        return !point || !Number.isFinite(point.x) || !Number.isFinite(point.y);
      }) || command.clipboard.wires.some(wire => !ids.has(wire.from.node) || !ids.has(wire.to.node))) {
        return refusal('INVALID_CLIPBOARD', '$.clipboard');
      }
      for (const side of ['from', 'to'] as const) {
        const ports = command.clipboard.wires.map(wire => JSON.stringify([wire[side].node, wire[side].port]));
        if (new Set(ports).size !== ports.length) return refusal('PORT_CARDINALITY', '$.clipboard.wires');
      }
      const next = pasteSelection(document, command.clipboard, used);
      return topologyIssue(next.graph, catalog) ?? next;
    }
  }
}
