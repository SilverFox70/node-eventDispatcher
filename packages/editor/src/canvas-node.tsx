import type { Node, NodeProps } from '@xyflow/react';
import type { ComponentDescriptorV2 } from 'event-driven-design/model';
import { portType } from './model.js';

export type CanvasNode = Node<{
  label: string;
  descriptor: ComponentDescriptorV2 | undefined;
}, 'component'>;

export function CanvasNodeCard({ data, selected }: NodeProps<CanvasNode>) {
  return <div className="nodeflow-card" data-selected={selected}>
    <strong>{data.label}</strong>
    {data.descriptor && <>
      {Object.entries(data.descriptor.in).map(([id, port]) =>
        <small key={id}>In · {id} · {portType(port)}</small>)}
      {Object.entries(data.descriptor.out).map(([id, port]) =>
        <small key={id}>Out · {id} · {portType(port)}</small>)}
    </>}
  </div>;
}
