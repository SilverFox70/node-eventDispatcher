import { performance } from 'node:perf_hooks';
import type { Packet, PacketMetadata } from '../../packet.js';
import type { DiagnosticData, DiagnosticRecord, DiagnosticSnapshot } from '../../model/diagnostics/index.js';
import { createChanges } from '../../observation/changes.js';
import { readRecord } from '../../packet/data.js';
import { FlowError } from '../../errors.js';
export type DiagnosticOptions = Readonly<{ limit?: number }>;
export function packetMetadata(packet: Packet): PacketMetadata {
  const metadata: PacketMetadata = { version: 1, packetId: packet.packetId, jobId: packet.jobId,
    parentPacketIds: packet.parentPacketIds, ...(packet.key === undefined ? {} : { key: packet.key }) };
  return Object.freeze(metadata);
}
/** One metadata-only owner; its retention is independent of execution protection and EX1. */
export function createDiagnostics(runId: string, options: unknown = {}) {
  const fields = readRecord(options, 'INVALID_ARGUMENT');
  const limit = Object.hasOwn(fields, 'limit') ? fields.limit : 128;
  if (Object.keys(fields).some(key => key !== 'limit') || !Number.isSafeInteger(limit) ||
    (limit as number) < 1 || (limit as number) > 1024) throw new FlowError('INVALID_ARGUMENT');
  const started = performance.now(), changes = createChanges(), events: DiagnosticRecord[] = [];
  let total = 0;
  return {
    subscribe: changes.subscribe,
    record(data: DiagnosticData): void {
      events.push(Object.freeze({ ...data, version: 1 as const, runId, sequence: ++total, timeMs: performance.now() - started }));
      if (events.length > (limit as number)) events.shift();
      changes.changed();
    },
    snapshot(): DiagnosticSnapshot {
      return Object.freeze({ version: 1, runId, total, dropped: total - events.length, events: Object.freeze([...events]) });
    },
  };
}
export type Diagnostics = ReturnType<typeof createDiagnostics>;
