import { graphCards } from './inspection-graph-cards.ts';
import { validateGraph } from 'event-driven-design/model';
import type { InspectionSource } from 'event-driven-design/model';

export type Vertex = { id: string; label: string; lines: string[]; details: string; column: number };
export type Edge = { from: string; to: string; label: string; kind: 'defined' | 'declared' | 'active'; channelId?: string };
export type Diagram = { vertices: Vertex[]; edges: Edge[] };

/** Presentation only: synthetic IDs, text labels and the authoritative model's relationships. */
export function inspectionDiagram(source: InspectionSource): Diagram | null {
  const vertices: Vertex[] = [], edges: Edge[] = [];
  if (source.kind === 'graph') {
    if (!validateGraph(source.spec, source.catalog).ok) return null;
    return graphCards(source);
  } else {
    const ids = new Map(source.topology.events.map(event => [event.name, 'event-' + Array.from(event.name, character => character.codePointAt(0)!.toString(16)).join('-')]));
    source.topology.events.forEach(event => vertices.push({ id: ids.get(event.name)!, label: event.name,
      lines: ['event'], details: event.name, column: 1 }));
    source.topology.publishers.forEach(publisher => {
      const id = 'publisher-' + publisher.id;
      vertices.push({ id, label: publisher.ownerId, lines: ['declared publisher'], details: JSON.stringify(publisher, null, 2), column: 0 });
      edges.push({ from: id, to: ids.get(publisher.event)!, label: 'publishes', kind: 'declared' });
    });
    source.topology.subscribers.forEach(subscriber => {
      const id = 'subscriber-' + subscriber.id;
      vertices.push({ id, label: subscriber.ownerId ?? 'Unassigned', lines: [subscriber.callbackName, subscriber.once ? 'once' : 'subscription'],
        details: JSON.stringify(subscriber, null, 2), column: 2 });
      edges.push({ from: ids.get(subscriber.event)!, to: id, label: subscriber.once ? 'once' : 'subscribes', kind: 'active' });
    });
  }
  return { vertices, edges };
}
