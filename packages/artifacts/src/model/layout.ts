import { fields, finite, invalid, list, name, record } from './fields.js';

type Position = Readonly<{ x: number; y: number }>;
export type GraphLayout = Readonly<{
  positions: Readonly<Record<string, Position>>;
  groups: Readonly<Record<string, readonly string[]>>;
  viewport?: Position & Readonly<{ zoom: number }>;
}>;

export function checkLayout(value: unknown, nodes: ReadonlySet<string>) {
  const layout = fields(value, ['positions', 'groups'], ['viewport']);
  for (const [id, position] of Object.entries(record(layout.positions))) {
    const point = fields(position, ['x', 'y']);
    if (!nodes.has(id) || !finite(point.x) || !finite(point.y)) invalid();
  }
  const groups = Object.entries(record(layout.groups));
  if (groups.length > 1000) invalid();
  for (const [id, members] of groups) {
    if (!name(id)) invalid();
    const entries = list(members, nodes.size);
    if (new Set(entries).size !== entries.length || entries.some(node => !name(node) || !nodes.has(node))) invalid();
  }
  if (Object.hasOwn(layout, 'viewport')) {
    const viewport = fields(layout.viewport, ['x', 'y', 'zoom']);
    if (!finite(viewport.x) || !finite(viewport.y) || !finite(viewport.zoom) || viewport.zoom <= 0) invalid();
  }
}
