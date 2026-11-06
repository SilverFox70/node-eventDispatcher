import type { Catalog, ComponentDescriptorV2, PortDescriptor } from 'event-driven-design/model';

export type EditorNode = Readonly<{ id: string; component: string }>;
export type PaletteEntry = Readonly<{ identity: string; descriptor: ComponentDescriptorV2 }>;

export function paletteEntries(catalog: Catalog): readonly PaletteEntry[] {
  return catalog.components.map(descriptor => ({
    identity: `${descriptor.id}@${descriptor.version}`, descriptor,
  }));
}

export function placeNode(nodes: readonly EditorNode[], component: string): readonly EditorNode[] {
  const ids = new Set(nodes.map(node => node.id));
  let index = nodes.length + 1;
  while (ids.has(`node-${index}`)) index++;
  return [...nodes, { id: `node-${index}`, component }];
}

export function portType(port: PortDescriptor): string {
  const schema = port.schema as { type?: string | string[] };
  return Array.isArray(schema.type) ? schema.type.join(' | ') : schema.type ?? 'JSON';
}
