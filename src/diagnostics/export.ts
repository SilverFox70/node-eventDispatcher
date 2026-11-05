import type { DiagnosticRecord, DiagnosticSnapshot } from '../model/diagnostics/index.js';
import { validateDiagnostics } from '../model/diagnostics/index.js';
import type { DiagnosticBatch } from '../model/diagnostics/batch.js';
import { FlowError } from '../errors.js';
import { readRecord } from '../packet/data.js';
export type DiagnosticExportOptions = Readonly<{ includeCaptures?: boolean }>;
export function captureOption(fields: Record<string, unknown>): boolean {
  if (Object.hasOwn(fields, 'includeCaptures') && typeof fields.includeCaptures !== 'boolean') throw new FlowError('INVALID_ARGUMENT');
  return fields.includeCaptures === true;
}
export function exportRecord(record: DiagnosticRecord, includeCaptures: boolean): DiagnosticRecord {
  if (includeCaptures || !('capture' in record)) return record;
  const metadata = Object.fromEntries(Object.entries(record).filter(([key]) =>
    !['capture', 'captureSessionId', 'captureEpoch'].includes(key)));
  return Object.freeze(metadata) as DiagnosticRecord;
}
export function diagnosticBatch(runId: string, includeCaptures: boolean, loss: DiagnosticBatch['loss'], events: readonly DiagnosticRecord[]): DiagnosticBatch {
  return Object.freeze({ version: 1, runId, captureMode: includeCaptures ? 'retained' : 'omitted',
    loss: Object.freeze({ ...loss }), events: Object.freeze([...events]) });
}
/** Explicit bounded snapshot export. Payloads remain omitted unless the host requests retained captures. */
export function exportDiagnostics(snapshot: DiagnosticSnapshot, options: DiagnosticExportOptions = {}): string {
  const fields = readRecord(options, 'INVALID_ARGUMENT');
  if (Object.keys(fields).some(key => key !== 'includeCaptures')) throw new FlowError('INVALID_ARGUMENT');
  const includeCaptures = captureOption(fields);
  if (!validateDiagnostics(snapshot).ok) throw new FlowError('INVALID_DIAGNOSTIC');
  const records = snapshot.events.map(event => exportRecord(event, includeCaptures)), lines: string[] = [];
  for (let offset = 0; offset < Math.max(1, records.length); offset += 32) {
    lines.push(JSON.stringify(diagnosticBatch(snapshot.runId, includeCaptures,
      { sourceRecords: snapshot.dropped, droppedRecords: 0, droppedBytes: 0 }, records.slice(offset, offset + 32))));
  }
  return lines.join('\n') + '\n';
}
