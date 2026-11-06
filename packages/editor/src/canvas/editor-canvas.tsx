import { useState } from 'react';
import { Background, Controls, Position, ReactFlow } from '@xyflow/react';
import type { Connection, Edge, NodeChange } from '@xyflow/react';
import type { ExecutionTraceEvent } from 'event-driven-design/model';
import { CanvasNodeCard } from '../canvas-node.js';
import type { CanvasNode } from '../canvas-node.js';
import { wireId } from '../document/topology.js';
import type { Edit, Position as Point, Wire } from '../document/types.js';

const nodeTypes = { component: CanvasNodeCard };
type Props = {
  nodes: CanvasNode[];
  wires: readonly Wire[];
  activity?: readonly ExecutionTraceEvent[];
  select: (id: string) => void;
  dispatch: (command: Edit) => void;
};

export function EditorCanvas({ nodes, wires, activity, select, dispatch }: Props) {
  const [preview, setPreview] = useState<{ id: string; position: Point }>();
  const transfers = activity ?? [];
  const channels = new Set(transfers.map(event => event.channelId));
  const touched = new Set(transfers.map(event => event.kind === 'sent' ? event.from?.node : event.to?.node));
  const visible = nodes.map(node => ({
    ...node, position: preview?.id === node.id ? preview.position : node.position,
    className: touched.has(node.id) ? 'nodeflow-node-active' : '',
  }));
  const edges: Edge[] = wires.map((wire, index) => ({
    animated: channels.has(`edge:${index}`),
    id: wireId(wire), source: wire.from.node, target: wire.to.node,
    sourceHandle: wire.from.port, targetHandle: wire.to.port,
    sourcePosition: Position.Right, targetPosition: Position.Left,
  }));
  function change(changes: NodeChange<CanvasNode>[]) {
    for (const item of changes) {
      if (item.type === 'position' && item.dragging && item.position) {
        setPreview({ id: item.id, position: item.position });
      }
    }
  }
  function connect(connection: Connection) {
    if (connection.sourceHandle === null || connection.targetHandle === null) return;
    dispatch({ type: 'connect', wire: {
      from: { node: connection.source, port: connection.sourceHandle },
      to: { node: connection.target, port: connection.targetHandle },
    } });
  }
  return <div className="nodeflow-viewport">
    <ReactFlow nodes={visible} edges={edges} nodeTypes={nodeTypes} onNodesChange={change}
      onNodeClick={(_, node) => select(node.id)} onNodeDragStart={(_, node) => select(node.id)}
      onNodeDragStop={(_, node) => {
        setPreview(undefined);
        dispatch({ type: 'moveNode', node: node.id, position: node.position });
      }}
      onConnect={connect} nodesFocusable={false} edgesFocusable={false}
      multiSelectionKeyCode={null} selectionKeyCode={null} deleteKeyCode={null}>
      <Background />
      <Controls showInteractive={false} />
    </ReactFlow>
  </div>;
}
