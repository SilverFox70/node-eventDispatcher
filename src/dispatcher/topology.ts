import { dispatcherTopologyVersion } from '../model/dispatcher-topology.js';
import type {
  DispatcherPublisher, DispatcherSubscriber, DispatcherTopology, OwnerMetadata
} from '../model/dispatcher-topology.js';

function validateOwner(ownerId: string): string {
  if (typeof ownerId !== 'string' || ownerId.length === 0 || ownerId.length > 128) {
    throw new TypeError('ownerId must be a nonempty string of at most 128 characters');
  }
  return ownerId;
}

export function readOwnerMetadata(metadata?: OwnerMetadata): string | null {
  if (metadata === undefined) return null;
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
    throw new TypeError('Owner metadata must be an object');
  }
  return validateOwner(metadata.ownerId);
}

/** Publishers are explicit live declarations; emitting never adds history here. */
export function createDispatcherTopology() {
  let nextPublisherId = 0;
  const publishers = new Map<number, DispatcherPublisher>();

  return {
    declarePublisher(ownerId: string, event: string): () => void {
      validateOwner(ownerId);
      const id = ++nextPublisherId;
      publishers.set(id, { id, ownerId, event, provenance: 'declared' });
      return () => { publishers.delete(id); };
    },

    snapshot(registrations: readonly DispatcherSubscriber[]): DispatcherTopology {
      const subscribers = registrations.map(item => Object.freeze({
        id: item.id,
        event: item.event,
        ownerId: item.ownerId,
        callbackName: item.callbackName,
        once: item.once
      })).sort((a, b) => a.id - b.id);
      const declarations = [...publishers.values()].map(item => Object.freeze({ ...item }));
      const names = new Set([
        ...subscribers.map(item => item.event),
        ...declarations.map(item => item.event)
      ]);
      const events = [...names].sort().map(name => Object.freeze({ name }));
      return Object.freeze({
        version: dispatcherTopologyVersion,
        events: Object.freeze(events),
        subscribers: Object.freeze(subscribers),
        publishers: Object.freeze(declarations)
      });
    }
  };
}
