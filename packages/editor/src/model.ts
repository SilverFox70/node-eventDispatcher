import type { Catalog, ComponentDescriptorV2, PortDescriptor } from 'event-driven-design/model';

export { applyEditorCommand, createEditorState } from './document/state.js';
export { copySelection } from './document/clipboard.js';
export { draftIssues } from './document/topology.js';
export type { CommandResult, EditorState } from './document/state.js';
export type { EditorNode, EditorCommand, EditorDocument, EditorIssue } from './document/types.js';
export type PaletteEntry = Readonly<{ identity: string; descriptor: ComponentDescriptorV2 }>;

export function paletteEntries(catalog: Catalog): readonly PaletteEntry[] {
  return catalog.components.map(descriptor => ({
    identity: `${descriptor.id}@${descriptor.version}`, descriptor,
  }));
}

export function portType(port: PortDescriptor): string {
  const schema = port.schema as { type?: string | string[] };
  return Array.isArray(schema.type) ? schema.type.join(' | ') : schema.type ?? 'JSON';
}
