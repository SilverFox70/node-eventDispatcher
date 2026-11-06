'use client';

import { useMemo, useState } from 'react';
import { Background, Controls, ReactFlow } from '@xyflow/react';
import type { Catalog } from 'event-driven-design/model';
import { paletteEntries, placeNode } from './model.js';
import type { EditorNode } from './model.js';
import { NodeDetails } from './node-details.js';
import { CanvasNodeCard } from './canvas-node.js';
import type { CanvasNode } from './canvas-node.js';

const nodeTypes = { component: CanvasNodeCard };

export type GraphEditorProps = Readonly<{
  catalog: Catalog;
  initialNodes?: readonly EditorNode[];
}>;

/** An ephemeral palette and canvas over application-provided catalog metadata. */
export function GraphEditor({ catalog, initialNodes = [] }: GraphEditorProps) {
  const [draft, setDraft] = useState({ nodes: initialNodes, selected: undefined as string | undefined });
  const entries = useMemo(() => paletteEntries(catalog), [catalog]);
  const byIdentity = useMemo(() => new Map(entries.map(item => [item.identity, item.descriptor])), [entries]);
  const selected = draft.nodes.find(node => node.id === draft.selected);
  const selectedDescriptor = selected && byIdentity.get(selected.component);
  const canvas: CanvasNode[] = draft.nodes.map((node, index) => {
    const descriptor = byIdentity.get(node.component);
    return {
      id: node.id, type: 'component', position: { x: (index % 3) * 200, y: Math.floor(index / 3) * 130 },
      data: { label: descriptor?.title ?? `Unavailable · ${node.component}`, descriptor },
      width: 175, height: 100, selected: node.id === draft.selected,
    };
  });
  function select(id: string) {
    setDraft(current => ({ ...current, selected: id }));
  }

  return <div className="nodeflow-editor">
    <section aria-label="Node palette">
      <h2>Node palette</h2>
      <ul>{entries.map(({ identity, descriptor }) => <li key={identity}>
        <button type="button" aria-label={`Add ${descriptor.title}`} onClick={() => setDraft(current => {
          const nodes = placeNode(current.nodes, identity);
          return { nodes, selected: nodes.at(-1)?.id };
        })}>{descriptor.title}</button>
        <small>{identity}</small>
      </li>)}</ul>
    </section>
    <section aria-label="Graph canvas">
      <h2>Canvas</h2>
      <div className="nodeflow-viewport">
        <ReactFlow nodes={canvas} nodeTypes={nodeTypes} onNodeClick={(_, node) => select(node.id)}
          nodesDraggable={false} nodesConnectable={false} nodesFocusable={false}
          edgesFocusable={false} deleteKeyCode={null}>
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <h3>Nodes on canvas</h3>
      <ul>{canvas.map(node => <li key={node.id}>
        <button type="button" aria-label={`Select ${node.data.label} · ${node.id}`} aria-pressed={node.selected}
          onClick={() => select(node.id)}>{node.data.label} · {node.id}</button>
      </li>)}</ul>
    </section>
    <section aria-label="Selected node">
      <h2>Selected node</h2>
      {selected ? <>
        <h3>{selectedDescriptor?.title ?? 'Unavailable component'}</h3>
        <p>{selected.id} · {selected.component}</p>
        {selectedDescriptor && <NodeDetails descriptor={selectedDescriptor} />}
      </> : <p>Select a node to inspect its ports.</p>}
    </section>
  </div>;
}
