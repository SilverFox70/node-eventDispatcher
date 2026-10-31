import type { DispatcherTopology } from '../dispatcher-topology.js';
import type { Diagram } from './writer.js';

export function dispatcherDiagram(topology: DispatcherTopology, diagram: Diagram): void {
  const events = new Map(topology.events.map(event => [event.name, diagram.vertex(`event ${event.name}`)]));
  const owners = new Map<string | null, string>();
  function owner(name: string | null): string {
    if (!owners.has(name)) owners.set(name, diagram.vertex(name === null ? 'unassigned' : `owner ${name}`));
    return owners.get(name)!;
  }
  for (const publisher of topology.publishers) {
    const vertex = diagram.vertex(`publisher ${publisher.id}`);
    diagram.edge(owner(publisher.ownerId), vertex, 'declared'); diagram.edge(vertex, events.get(publisher.event)!, 'declared');
  }
  for (const subscriber of topology.subscribers) {
    const vertex = diagram.vertex(`${subscriber.callbackName}${subscriber.once ? ' (once)' : ''}`);
    diagram.edge(events.get(subscriber.event)!, vertex, 'active'); diagram.edge(vertex, owner(subscriber.ownerId), 'active');
  }
  if (topology.events.length === 0) diagram.vertex('No active or declared relationships');
}
