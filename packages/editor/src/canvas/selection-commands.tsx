import type { FormEvent } from 'react';
import type { CanvasNode } from '../canvas-node.js';
import type { Clipboard, Edit, Layout } from '../document/types.js';

type Props = {
  nodes: CanvasNode[];
  groups: Layout['groups'];
  marked: readonly string[];
  mark: (id: string) => void;
  clipboard: Clipboard | undefined;
  copy: () => void;
  dispatch: (command: Edit) => void;
  select: (id: string) => void;
};

export function SelectionCommands({ nodes, groups, marked, mark, clipboard, copy, dispatch, select }: Props) {
  function group(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get('name'));
    dispatch({ type: 'group', name, nodes: marked });
  }
  return <>
    <h3>Nodes on canvas</h3>
    <ul>{nodes.map(node => <li key={node.id}>
      <button type="button" aria-label={`Select ${node.data.label} · ${node.id}`} aria-pressed={node.selected}
        onClick={() => select(node.id)}>{node.data.label} · {node.id}</button>{' '}
      <label><input type="checkbox" aria-label={`Mark ${node.id} for group or copy`}
        checked={marked.includes(node.id)} onChange={() => mark(node.id)} /> Mark</label>
    </li>)}</ul>
    <button type="button" disabled={!marked.length} onClick={copy}>Copy marked nodes</button>{' '}
    <button type="button" disabled={!clipboard} onClick={() => {
      if (clipboard) dispatch({ type: 'paste', clipboard });
    }}>Paste nodes</button>
    <form aria-label="Group nodes" onSubmit={group}>
      <label>Group name <input name="name" required /></label>
      <button type="submit" disabled={!marked.length}>Group marked nodes</button>
    </form>
    <ul aria-label="Node groups">{Object.entries(groups).map(([name, ids]) =>
      <li key={name}><span>{name} · {ids.join(', ')}</span>{' '}
        <button type="button" aria-label={`Ungroup ${name}`} onClick={() => dispatch({ type: 'ungroup', name })}>Ungroup</button>
      </li>)}
    </ul>
  </>;
}
