import type { Json } from '../packet.js';
import type { Endpoint } from './graph.js';
import { assertJsonMetadata, metadataRecord } from './contracts.js';
import type { ValidationResult } from './contracts.js';

export const traceEventLimit = 1024;
export const tracePayloadBytes = 2048;
export type ExecutionTraceEvent = Readonly<{
  sequence: number; timeMs: number; kind: 'sent' | 'received'; channelId: string;
  from: Endpoint | null; to: Endpoint | null; packetId: string; jobId: string;
  parentPacketIds: readonly string[]; payloadState: 'omitted' | 'captured' | 'oversize'; payload?: Json;
}>;
export type ExecutionTraceSnapshot = Readonly<{
  version: 1; runId: string; total: number; dropped: number; payloads: boolean;
  events: readonly ExecutionTraceEvent[];
}>;

function ensure(value: unknown): asserts value {
  if (!value) throw Error('Invalid trace metadata');
}
const text = (value: unknown) => typeof value === 'string' && value.length > 0 && value.length <= 384;
const integer = (value: unknown) => Number.isSafeInteger(value) && (value as number) >= 0;
function endpoint(value: unknown): void {
  if (value === null) return;
  const fields = metadataRecord(value);
  ensure(Object.keys(fields).length === 2 && text(fields.node) && text(fields.port));
}

/** Admit bounded observation metadata; never evaluate application payload contracts. */
export function validateExecutionTrace(value: unknown): ValidationResult {
  try {
    assertJsonMetadata(value);
    const fields = metadataRecord(value), events = fields.events;
    ensure(Object.keys(fields).length === 6 && fields.version === 1 && text(fields.runId) &&
      integer(fields.total) && integer(fields.dropped) && typeof fields.payloads === 'boolean' && Array.isArray(events));
    ensure(events.length <= traceEventLimit && fields.total === (fields.dropped as number) + events.length);
    let sequence = fields.dropped as number, time = 0;
    for (const raw of events) {
      const event = metadataRecord(raw);
      ensure(Object.keys(event).every(key => ['sequence', 'timeMs', 'kind', 'channelId', 'from', 'to', 'packetId', 'jobId', 'parentPacketIds', 'payloadState', 'payload'].includes(key)));
      ensure(event.sequence === ++sequence && typeof event.timeMs === 'number' && Number.isFinite(event.timeMs) && event.timeMs >= time);
      time = event.timeMs;
      ensure(['sent', 'received'].includes(event.kind as string) && text(event.channelId) && text(event.packetId) && text(event.jobId));
      endpoint(event.from); endpoint(event.to);
      ensure(event.from !== null || event.to !== null);
      ensure(Array.isArray(event.parentPacketIds) && event.parentPacketIds.length <= 256 && event.parentPacketIds.every(text));
      ensure(['omitted', 'captured', 'oversize'].includes(event.payloadState as string));
      if (event.payloadState === 'captured') {
        ensure(fields.payloads && Object.hasOwn(event, 'payload') && new TextEncoder().encode(JSON.stringify(event.payload)).length <= tracePayloadBytes);
      } else ensure(!Object.hasOwn(event, 'payload') && (fields.payloads || event.payloadState === 'omitted'));
    }
    return { ok: true };
  } catch { return { ok: false, issues: [{ code: 'INVALID_TRACE', path: '$' }] }; }
}
