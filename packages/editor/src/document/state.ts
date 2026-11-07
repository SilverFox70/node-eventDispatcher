import type { Catalog } from 'event-driven-design/model';
import { editDocument, gridPosition, refusal } from './edit.js';
import { validName } from './topology.js';
import type { EditorCommand, EditorDocument, EditorIssue, EditorNode } from './types.js';

const historyLimit = 100;
type Entry = Readonly<{ id: string; before: EditorDocument; after: EditorDocument }>;
export type EditorState = Readonly<{
  document: EditorDocument;
  baseline: EditorDocument;
  revision: number;
  past: readonly Entry[];
  future: readonly Entry[];
  used: ReadonlySet<string>;
}>;
export type CommandResult = { ok: true; state: EditorState } | { ok: false; issue: EditorIssue; state: EditorState };

export function createEditorState(nodes: readonly EditorNode[] = [], initialGraph?: EditorDocument['graph'], initialLayout?: EditorDocument['layout']): EditorState {
  const graph = initialGraph ? structuredClone(initialGraph)
    : { version: 2 as const, nodes: structuredClone(nodes), edges: [], inputs: {}, outputs: {} };
  const initialPositions = initialLayout?.positions ?? {};
  const positions = Object.fromEntries(graph.nodes.map((node, index) => [
    node.id, Object.hasOwn(initialPositions, node.id) ? structuredClone(initialPositions[node.id]!) : gridPosition(index),
  ]));
  const document: EditorDocument = {
    graph,
    layout: {
      positions,
      groups: structuredClone(initialLayout?.groups ?? {}),
    },
  };
  return { document, baseline: document, revision: 0, past: [], future: [], used: new Set(graph.nodes.map(node => node.id)) };
}

/** An accepted command commits one snapshot. Refused edits leave revision and history intact. */
export function applyEditorCommand(state: EditorState, command: EditorCommand, catalog: Catalog): CommandResult {
  const reject = (issue: EditorIssue): CommandResult => ({ ok: false, issue, state });
  if (command.expectedRevision !== state.revision) return reject(refusal('STALE_REVISION', '$.revision'));
  if (!validName(command.id)) return reject(refusal('INVALID_COMMAND', '$.id'));
  const revision = state.revision + 1;
  if (command.type === 'undo' || command.type === 'redo') {
    const undo = command.type === 'undo';
    const entry = (undo ? state.past : state.future).at(-1);
    if (!entry) return reject(refusal('EMPTY_HISTORY', '$.history'));
    return { ok: true, state: { ...state, revision, document: undo ? entry.before : entry.after,
      past: undo ? state.past.slice(0, -1) : [...state.past, entry],
      future: undo ? [...state.future, entry] : state.future.slice(0, -1),
    } };
  }
  const document = editDocument(state.document, structuredClone(command), catalog, state.used);
  if ('code' in document) return reject(document);
  if (document === state.document) return { ok: true, state };
  const used = new Set(state.used);
  for (const node of document.graph.nodes) used.add(node.id);
  const entry = { id: command.id, before: state.document, after: document };
  return { ok: true, state: { ...state, document, revision, used,
    past: [...state.past, entry].slice(-historyLimit), future: [],
  } };
}
