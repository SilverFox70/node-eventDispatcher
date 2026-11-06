import type { Json, Endpoint, GraphSpecV2 } from 'event-driven-design/model';

export type EditorNode = GraphSpecV2['nodes'][number];
export type Wire = GraphSpecV2['edges'][number];
export type Position = Readonly<{ x: number; y: number }>;
export type Layout = Readonly<{
  positions: Readonly<Record<string, Position>>;
  groups: Readonly<Record<string, readonly string[]>>;
}>;
export type EditorDocument = Readonly<{ graph: GraphSpecV2; layout: Layout }>;
export type Clipboard = Readonly<{ nodes: readonly EditorNode[]; wires: readonly Wire[]; positions: Layout['positions'] }>;
export type Edit =
  | { type: 'addNode'; node: EditorNode }
  | { type: 'setConfig'; node: string; config?: Json }
  | { type: 'removeNode'; node: string }
  | { type: 'moveNode'; node: string; position: Position }
  | { type: 'connect'; wire: Wire }
  | { type: 'disconnect'; wire: Wire }
  | { type: 'exposeInput' | 'exposeOutput'; name: string; endpoint: Endpoint }
  | { type: 'unexposeInput' | 'unexposeOutput'; name: string }
  | { type: 'group'; name: string; nodes: readonly string[] }
  | { type: 'ungroup'; name: string }
  | { type: 'paste'; clipboard: Clipboard };
export type EditorCommand = (Edit | { type: 'undo' } | { type: 'redo' }) & Readonly<{ id: string; expectedRevision: number }>;
export type EditorIssue = Readonly<{ code: string; path: string }>;
