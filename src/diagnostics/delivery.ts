import { isPromise } from 'node:util/types';
import type { DiagnosticRecord } from '../model/diagnostics/index.js';
import type { DiagnosticBatch } from '../model/diagnostics/batch.js';
import { diagnosticBatch, exportRecord } from './export.js';
import { positive } from './options.js';
import type { sinkOptions } from './options.js';
import { readRecord } from '../packet/data.js';
import { FlowError } from '../errors.js';
export type DiagnosticSink = Readonly<{ write(batch: DiagnosticBatch, signal: AbortSignal): Promise<void> }>;
export type DiagnosticSinkSnapshot = Readonly<{ version: 1; runId: string; status: 'active' | 'disabled' | 'disposed';
  queuedRecords: number; queuedBytes: number; inFlightRecords: number; inFlightBytes: number; pendingWrites: number;
  writtenRecords: number; writtenBytes: number; droppedRecords: number; droppedBytes: number; sinkErrors: number }>;
export type DiagnosticSinkController = Readonly<{ snapshot(): DiagnosticSinkSnapshot;
  flush(options: Readonly<{ timeoutMs: number }>): Promise<Readonly<{ complete: boolean }>>; dispose(): Promise<void> }>;
type Entry = { record: DiagnosticRecord; bytes: number };

/** Own delivery independently of the business run, including noncooperative foreign writes. */
export function createDelivery(runId: string, sink: DiagnosticSink, options: ReturnType<typeof sinkOptions>, detach: () => void) {
  const queue: Entry[] = [], abort = new AbortController();
  const waiters = new Set<(complete: boolean) => void>();
  let status: DiagnosticSinkSnapshot['status'] = 'active', scheduled = false;
  let flight: Entry[] = [], pending = false, queuedBytes = 0, flightBytes = 0;
  let writtenRecords = 0, writtenBytes = 0, droppedRecords = 0, droppedBytes = 0, sinkErrors = 0;
  function drop(entries: readonly Entry[]): void {
    droppedRecords += entries.length;
    for (const entry of entries) droppedBytes += entry.bytes;
  }
  function notify(): void {
    if (status === 'active' && (queue.length || pending)) return;
    for (const finish of [...waiters]) finish(status === 'active');
  }
  function settle(failed: boolean): void {
    pending = false;
    if (failed) {
      sinkErrors++;
      if (status === 'active') {
        status = 'disabled'; detach(); drop(flight); drop(queue); queue.length = 0; queuedBytes = 0;
      }
    } else if (status === 'active') { writtenRecords += flight.length; writtenBytes += flightBytes; }
    flight = []; flightBytes = 0;
    schedule(); notify();
  }
  function schedule(): void {
    if (scheduled || status !== 'active' || pending || queue.length === 0) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      if (status !== 'active' || pending || queue.length === 0) return;
      flight = queue.splice(0, options.batchSize); flightBytes = flight.reduce((sum, entry) => sum + entry.bytes, 0);
      queuedBytes -= flightBytes; pending = true;
      const batch = diagnosticBatch(runId, options.includeCaptures,
        { sourceRecords: 0, droppedRecords, droppedBytes }, flight.map(entry => entry.record));
      try {
        const result = sink.write(batch, abort.signal);
        if (!isPromise(result)) { settle(true); return; }
        void Promise.prototype.then.call(result, () => settle(false), () => settle(true));
      } catch { settle(true); }
    });
  }
  const controller: DiagnosticSinkController = Object.freeze({
    snapshot() {
      return Object.freeze({ version: 1, runId, status, queuedRecords: queue.length, queuedBytes,
        inFlightRecords: flight.length, inFlightBytes: flightBytes, pendingWrites: pending ? 1 : 0,
        writtenRecords, writtenBytes, droppedRecords, droppedBytes, sinkErrors });
    },
    flush(value: Readonly<{ timeoutMs: number }>) {
      const fields = readRecord(value, 'INVALID_ARGUMENT');
      if (Object.keys(fields).length !== 1 || !Object.hasOwn(fields, 'timeoutMs')) throw new FlowError('INVALID_ARGUMENT');
      const timeoutMs = positive(fields.timeoutMs, 60000);
      if (waiters.size >= 64) throw new FlowError('INVALID_ARGUMENT');
      if (status !== 'active' || (!queue.length && !pending)) return Promise.resolve({ complete: status === 'active' });
      return new Promise<Readonly<{ complete: boolean }>>(resolve => {
        const finish = (complete: boolean) => { clearTimeout(timer); waiters.delete(finish); resolve(Object.freeze({ complete })); };
        const timer = setTimeout(() => finish(false), timeoutMs);
        waiters.add(finish); schedule();
      });
    },
    dispose() {
      if (status !== 'disposed') {
        if (status === 'active') { drop(flight); drop(queue); }
        status = 'disposed'; detach(); queue.length = 0; queuedBytes = 0;
        abort.abort(); notify();
      }
      return Promise.resolve();
    },
  });
  return { controller,
    available: () => status !== 'active' && !pending,
    record(input: DiagnosticRecord) {
      if (status !== 'active') return;
      const record = exportRecord(input, options.includeCaptures), bytes = Buffer.byteLength(JSON.stringify(record) + '\n', 'utf8');
      if (queue.length + flight.length >= options.recordLimit || queuedBytes + flightBytes + bytes > options.byteLimit) {
        droppedRecords++; droppedBytes += bytes; return;
      }
      queue.push({ record, bytes }); queuedBytes += bytes; schedule();
    },
  };
}
