import type { Vertex } from './inspection-diagram';
export type PositionedVertex = Vertex & { x: number; y: number; height: number };

export function positionVertices(vertices: Vertex[]): PositionedVertex[] {
  const rows = new Map<number, number>();
  return vertices.map(vertex => {
    const y = rows.get(vertex.column) ?? 0;
    const height = Math.max(80, 50 + vertex.lines.length * 20);
    rows.set(vertex.column, y + height + 25);
    return { ...vertex, x: 20 + vertex.column * 300, y: y + 20, height };
  });
}

/** Connect facing card boundaries so arrowheads stay visible, including upward input links. */
export function connectionPath(from: PositionedVertex, to: PositionedVertex): string {
  if (from.x === to.x) {
    const downward = to.y > from.y;
    return `M${from.x + 130},${downward ? from.y + from.height : from.y} L${to.x + 130},${downward ? to.y : to.y + to.height}`;
  }
  const rightward = to.x > from.x;
  return `M${rightward ? from.x + 260 : from.x},${from.y + 30} L${rightward ? to.x : to.x + 260},${to.y + 30}`;
}
