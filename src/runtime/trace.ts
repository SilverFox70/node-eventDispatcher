import { performance } from 'node:perf_hooks';
import type { Packet } from '../packet.js';
import type { Endpoint } from '../model/graph.js';
import type { ExecutionTraceEvent, ExecutionTraceSnapshot } from '../model/execution-trace.js';
import { traceEventLimit, tracePayloadBytes } from '../model/execution-trace.js';
import { copyJson } from '../packet/json.js';
import { readRecord } from '../packet/data.js';
import { FlowError } from '../errors.js';
import { createChanges } from '../observation/changes.js';

export type TraceOptions = Readonly<{ limit?: number; payloads?: boolean }>;
export type TraceRoute = Readonly<{ channelId: string; from: Endpoint | null; to: Endpoint | null }>;

/** Optional per-run observation. Ring eviction never touches the execution ledger. */
export function createExecutionTrace(runId: string, options: unknown) {
  const fields = readRecord(options, 'INVALID_ARGUMENT');
  const limit = Object.hasOwn(fields, 'limit') ? fields.limit : 128;
  const payloads = Object.hasOwn(fields, 'payloads') ? fields.payloads : false;
  if (Object.keys(fields).some(key => !['limit', 'payloads'].includes(key)) ||
    !Number.isSafeInteger(limit) || (limit as number) < 1 || (limit as number) > traceEventLimit || typeof payloads !== 'boolean') {
    throw new FlowError('INVALID_ARGUMENT');
  }
  const events: ExecutionTraceEvent[] = [], changes = createChanges();
  const started = performance.now();
  let total = 0;
  return {
    subscribe: changes.subscribe,
    clear() { events.length = 0; changes.changed(); },
    record(kind: 'sent' | 'received', route: TraceRoute, packet: Packet) {
      let capture: Pick<ExecutionTraceEvent, 'payloadState' | 'payload'> = { payloadState: 'omitted' };
      if (payloads) {
        capture = Buffer.byteLength(JSON.stringify(packet.value), 'utf8') <= tracePayloadBytes
          ? { payloadState: 'captured', payload: copyJson(packet.value) } : { payloadState: 'oversize' };
      }
      events.push(Object.freeze({ ...route, from: route.from && Object.freeze({ ...route.from }),
        to: route.to && Object.freeze({ ...route.to }), sequence: ++total, timeMs: performance.now() - started,
        kind, packetId: packet.packetId, jobId: packet.jobId,
        parentPacketIds: Object.freeze([...packet.parentPacketIds]), ...capture }));
      if (events.length > (limit as number)) events.shift();
      changes.changed();
    },
    snapshot(): ExecutionTraceSnapshot {
      return Object.freeze({ version: 1, runId, total, dropped: total - events.length, payloads,
        events: Object.freeze([...events]) });
    }
  };
}
