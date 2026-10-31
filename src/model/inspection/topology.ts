import { metadataRecord, snapshotJsonMetadata } from '../contracts.js';
import type { DispatcherTopology } from '../dispatcher-topology.js';
import { FlowError } from '../../errors.js';

function refuse(): never { throw new FlowError('INVALID_ARGUMENT'); }
function fields(value: unknown, keys: string[]): Record<string, unknown> {
  const record = metadataRecord(value);
  if (Object.keys(record).length !== keys.length || keys.some(key => !Object.hasOwn(record, key))) refuse();
  return record;
}
function text(value: unknown): value is string { return typeof value === 'string' && value.length > 0; }
function owner(value: unknown): value is string { return text(value) && value.length <= 128; }

/** Capture current topology only, refusing extra data and dangling or duplicate local identities. */
export function captureTopology(value: unknown): DispatcherTopology {
  try {
    const captured = snapshotJsonMetadata(value);
    const root = fields(captured, ['version', 'events', 'subscribers', 'publishers']);
    if (root.version !== 1 || !Array.isArray(root.events) || !Array.isArray(root.subscribers) || !Array.isArray(root.publishers)) refuse();
    const events = new Set<string>(), usedEvents = new Set<string>();
    for (const item of root.events) {
      const event = fields(item, ['name']);
      if (!text(event.name) || events.has(event.name)) refuse();
      events.add(event.name);
    }
    for (const kind of ['subscribers', 'publishers'] as const) {
      const ids = new Set<number>();
      for (const item of root[kind] as unknown[]) {
        const entry = fields(item, kind === 'subscribers' ? ['id', 'event', 'ownerId', 'callbackName', 'once'] : ['id', 'event', 'ownerId', 'provenance']);
        if (!Number.isSafeInteger(entry.id) || (entry.id as number) < 1 || ids.has(entry.id as number) ||
          !text(entry.event) || !events.has(entry.event)) refuse();
        ids.add(entry.id as number); usedEvents.add(entry.event);
        if (kind === 'subscribers') {
          if ((entry.ownerId !== null && !owner(entry.ownerId)) || !text(entry.callbackName) || typeof entry.once !== 'boolean') refuse();
        } else if (!owner(entry.ownerId) || entry.provenance !== 'declared') refuse();
      }
    }
    if (events.size !== usedEvents.size) refuse();
    return captured as unknown as DispatcherTopology;
  } catch { return refuse(); }
}
