import type { Clipboard, EditorDocument, Position } from './types.js';

export function copySelection(document: EditorDocument, ids: readonly string[]): Clipboard {
  const chosen = new Set(ids);
  const nodes = document.graph.nodes.filter(node => chosen.has(node.id));
  return {
    nodes,
    wires: document.graph.edges.filter(wire => chosen.has(wire.from.node) && chosen.has(wire.to.node)),
    positions: Object.fromEntries(nodes.map(node => [node.id, document.layout.positions[node.id]!])),
  };
}

export function nextNodeId(used: ReadonlySet<string>, start: number): string {
  while (used.has(`node-${start}`)) start++;
  return `node-${start}`;
}

export function pasteSelection(document: EditorDocument, clipboard: Clipboard, used: ReadonlySet<string>): EditorDocument {
  const { graph, layout } = document;
  const occupied = new Set(used);
  const remap = new Map<string, string>();
  const positions: Record<string, Position> = { ...layout.positions };
  const nodes = clipboard.nodes.map((node, index) => {
    const id = nextNodeId(occupied, graph.nodes.length + index + 1);
    occupied.add(id);
    remap.set(node.id, id);
    const { x, y } = clipboard.positions[node.id]!;
    positions[id] = { x: x + 30, y: y + 30 };
    return { ...node, id };
  });
  const wires = clipboard.wires.map(wire => ({
    ...wire, from: { ...wire.from, node: remap.get(wire.from.node)! },
    to: { ...wire.to, node: remap.get(wire.to.node)! },
  }));
  return {
    graph: { ...graph, nodes: [...graph.nodes, ...nodes], edges: [...graph.edges, ...wires] },
    layout: { ...layout, positions },
  };
}
