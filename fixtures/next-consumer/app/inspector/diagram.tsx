'use client';
import { useId } from 'react';
import type { Diagram, Vertex } from '../../lib/inspection-diagram';
import { positionVertices, connectionPath } from '../../lib/inspection-layout';

export default function DiagramView({ diagram, selected, select }: {
  diagram: Diagram; selected: string | null; select: (id: string) => void;
}) {
  const arrow = useId();
  const positioned = positionVertices(diagram.vertices);
  const byId = new Map(positioned.map(vertex => [vertex.id, vertex]));
  const label = (vertex: Vertex) => vertex.label.slice(0, 30);
  return <div className="diagram-scroll">
    <svg role="img" aria-label="Current relationship diagram" viewBox={`0 0 920 ${Math.max(220, ...positioned.map(vertex => vertex.y + vertex.height)) + 30}`}>
      <defs><marker id={arrow} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" /></marker></defs>
      {diagram.edges.map((edge, index) => {
        const from = byId.get(edge.from)!, to = byId.get(edge.to)!;
        return <g key={index} data-relationship={edge.kind}>
          <path className={`connection ${edge.kind}`} markerEnd={`url(#${arrow})`} d={connectionPath(from, to)} />
          <title>{`${from.label} → ${to.label}: ${edge.label} (${edge.kind})`}</title>
        </g>;
      })}
      {positioned.map(vertex => <g key={vertex.id} role="button" tabIndex={0} aria-label={'Inspect ' + vertex.label}
        aria-pressed={selected === vertex.id} data-vertex={vertex.id}
        onClick={() => select(vertex.id)} onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(vertex.id); }
        }}>
        <rect className={selected === vertex.id ? 'selected' : ''} x={vertex.x} y={vertex.y} width="260" height={vertex.height} rx="8" />
        <title>{vertex.label}</title>
        <text x={vertex.x + 12} y={vertex.y + 25}>{label(vertex)}</text>
        {vertex.lines.map((line, index) => <text className="port-label" key={index} x={vertex.x + 12} y={vertex.y + 48 + index * 20}>{line.slice(0, 34)}</text>)}
      </g>)}
    </svg>
  </div>;
}
