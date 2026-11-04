import type { Json } from '../../packet.js';
import { checkCapture } from './capture.js';
export type DiagnosticCapture = Readonly<{ state: 'captured'; value: Json; bytes: number } | { state: 'truncated'; preview: string; bytes: number }>;
type TransferCapture = Readonly<{ capture: DiagnosticCapture; captureSessionId: string; captureEpoch: number }> |
  Readonly<{ capture?: never; captureSessionId?: never; captureEpoch?: never }>;
import type { PacketMetadata } from '../../packet.js';

type Node = Readonly<{ nodeId: string }>;
type Operation = Node & Readonly<{ operationId: string }>;
type Attempt = Operation & Readonly<{ attemptId: string; attempt: number }>;
type Result = Readonly<{ outcome: 'succeeded'; durationMs: number }> |
  Readonly<{ outcome: 'failed' | 'cancelled'; code: string; durationMs: number }>;
export type DiagnosticData =
  (Node & Readonly<{ kind: 'input-admitted'; inputName: string; port: string; packet: PacketMetadata }> & TransferCapture) |
  (Node & Readonly<{ kind: 'received' | 'sent'; port: string; packet: PacketMetadata }> & TransferCapture) |
  (Operation & Readonly<{ kind: 'operation-started'; inputs: readonly PacketMetadata[] }>) |
  (Attempt & Readonly<{ kind: 'attempt-started'; inputs: readonly PacketMetadata[] }>) |
  (Attempt & Readonly<{ kind: 'attempt-finished' }> & (Result |
    Readonly<{ outcome: 'timed-out'; code: string; durationMs: number }>)) |
  (Operation & Readonly<{ kind: 'operation-finished' }> & Result) |
  (Node & Readonly<{ kind: 'process-error'; code: string }>) |
  Readonly<{ kind: 'run-terminal'; status: 'completed' }> |
  Readonly<{ kind: 'run-terminal'; status: 'failed' | 'cancelled'; code: string; nodeId?: string }>;
/** Bounded metadata observations, not payload history or a durable execution ledger. */
export type DiagnosticRecord = Readonly<{
  version: 1; runId: string; sequence: number; timeMs: number;
}> & DiagnosticData;
export type DiagnosticSnapshot = Readonly<{
  version: 1; runId: string; total: number; dropped: number; events: readonly DiagnosticRecord[];
}>;

import { assertJsonMetadata, metadataRecord, metadataArray } from '../contracts.js';
import type { ValidationResult } from '../contracts.js';
import { ensure, name, uuid, integer, time, keys, checkPacket, checkInputs } from './packet.js';
import { isDiagnosticCode } from './codes.js';

function checkEvent(value: unknown, runId: unknown, sequence: number, previousTime: number): number {
  const event = metadataRecord(value), base = ['version', 'runId', 'sequence', 'timeMs', 'kind'];
  ensure(event.version === 1 && event.runId === runId && event.sequence === sequence && time(event.timeMs) &&
    (event.timeMs as number) >= previousTime);
  const fields: string[] = [], optional: string[] = [];
  const add = (...names: string[]) => { fields.push(...names); };
  switch (event.kind) {
    case 'input-admitted': add('inputName'); ensure(name(event.inputName));
      add('nodeId', 'port', 'packet'); checkPacket(event.packet); break;
    case 'received': case 'sent': add('nodeId', 'port', 'packet'); checkPacket(event.packet); break;
    case 'attempt-started': add('attemptId', 'attempt', 'nodeId', 'operationId', 'inputs'); checkInputs(event.inputs); break;
    case 'operation-started': add('nodeId', 'operationId', 'inputs'); checkInputs(event.inputs); break;
    case 'attempt-finished': add('attemptId', 'attempt');
      add('nodeId', 'operationId', 'durationMs', 'outcome'); break;
    case 'operation-finished': add('nodeId', 'operationId', 'durationMs', 'outcome'); break;
    case 'process-error': add('nodeId', 'code'); break;
    case 'run-terminal':
      add('status'); ensure(['completed', 'cancelled', 'failed'].includes(event.status as string));
      if (event.status !== 'completed') { add('code'); optional.push('nodeId'); }
      break;
    default: throw Error('Invalid diagnostic kind');
  }
  if (fields.includes('outcome')) {
    const outcomes = event.kind === 'attempt-finished' ? ['succeeded', 'failed', 'timed-out', 'cancelled'] : ['succeeded', 'failed', 'cancelled'];
    ensure(outcomes.includes(event.outcome as string) && time(event.durationMs));
    if (event.outcome !== 'succeeded') add('code');
  }
  if (['input-admitted', 'received', 'sent'].includes(event.kind as string)) {
    optional.push('capture', 'captureSessionId', 'captureEpoch');
    checkCapture(event);
  }
  keys(event, [...base, ...fields], optional);
  if (Object.hasOwn(event, 'nodeId')) ensure(name(event.nodeId));
  if (Object.hasOwn(event, 'port')) ensure(name(event.port));
  if (Object.hasOwn(event, 'operationId')) ensure(uuid(event.operationId));
  if (Object.hasOwn(event, 'attemptId')) ensure(uuid(event.attemptId) && integer(event.attempt) && (event.attempt as number) >= 1);
  if (Object.hasOwn(event, 'code')) ensure(isDiagnosticCode(event.code));
  return event.timeMs as number;
}
/** Strict admission for browser-safe metadata; it does not execute nodes or validate application payloads. */
export function validateDiagnostics(value: unknown): ValidationResult {
  try {
    assertJsonMetadata(value);
    const fields = metadataRecord(value);
    keys(fields, ['version', 'runId', 'total', 'dropped', 'events']);
    ensure(fields.version === 1 && uuid(fields.runId) && integer(fields.total) && integer(fields.dropped));
    const events = metadataArray(fields.events);
    ensure(events.length <= 1024 && fields.total === (fields.dropped as number) + events.length);
    let previousTime = 0;
    events.forEach((event, index) => { previousTime = checkEvent(event, fields.runId, (fields.dropped as number) + index + 1, previousTime); });
    return { ok: true };
  } catch { return { ok: false, issues: [{ code: 'INVALID_DIAGNOSTIC', path: '$' }] }; }
}
