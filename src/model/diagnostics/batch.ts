import type { DiagnosticRecord } from './index.js';
import { validateDiagnostics } from './index.js';
import { assertJsonMetadata, metadataRecord, metadataArray } from '../contracts.js';
import type { ValidationResult } from '../contracts.js';
import { ensure, keys, uuid, integer } from './packet.js';

export type DiagnosticBatch = Readonly<{ version: 1; runId: string; captureMode: 'omitted' | 'retained';
  loss: Readonly<{ sourceRecords: number; droppedRecords: number; droppedBytes: number }>;
  events: readonly DiagnosticRecord[] }>;

/** Validate transported batches without inventing continuity across dropped observations. */
export function validateDiagnosticBatch(value: unknown): ValidationResult {
  try {
    assertJsonMetadata(value);
    const batch = metadataRecord(value);
    keys(batch, ['version', 'runId', 'captureMode', 'loss', 'events']);
    ensure(batch.version === 1 && uuid(batch.runId) && ['omitted', 'retained'].includes(batch.captureMode as string));
    const loss = metadataRecord(batch.loss);
    keys(loss, ['sourceRecords', 'droppedRecords', 'droppedBytes']);
    ensure(Object.values(loss).every(integer));
    const events = metadataArray(batch.events); ensure(events.length <= 32);
    let previousSequence = 0, previousTime = 0;
    for (const value of events) {
      const event = metadataRecord(value);
      ensure(typeof event.sequence === 'number' && event.sequence > previousSequence &&
        typeof event.timeMs === 'number' && event.timeMs >= previousTime);
      ensure(validateDiagnostics({ version: 1, runId: batch.runId, total: event.sequence,
        dropped: event.sequence - 1, events: [value] }).ok);
      if (batch.captureMode === 'omitted') ensure(!Object.hasOwn(event, 'capture'));
      previousSequence = event.sequence; previousTime = event.timeMs;
    }
    return { ok: true };
  } catch { return { ok: false, issues: [{ code: 'INVALID_DIAGNOSTIC_BATCH', path: '$' }] }; }
}
