import type { NetworkRun } from '../runtime.js';
import { getRunDefinition } from '../runtime.js';
import { observeDiagnosticRecords } from '../runtime/diagnostics/records.js';
import { readRecord } from '../packet/data.js';
import { FlowError } from '../errors.js';
import { sinkOptions } from './options.js';
import type { DiagnosticSinkOptions } from './options.js';
import { createDelivery } from './delivery.js';
import type { DiagnosticSink, DiagnosticSinkController } from './delivery.js';
const owners = new WeakMap<NetworkRun, { available(): boolean }>();

/** Attach prospective, bounded delivery. The host owns sink authorization and eventual disposal. */
export function attachDiagnosticsSink(run: NetworkRun, sink: DiagnosticSink, options: DiagnosticSinkOptions = {}): DiagnosticSinkController {
  getRunDefinition(run);
  const checked = sinkOptions(options), fields = readRecord(sink, 'INVALID_ARGUMENT');
  if (Object.keys(fields).length !== 1 || typeof fields.write !== 'function') throw new FlowError('INVALID_ARGUMENT');
  if (owners.has(run) && !owners.get(run)!.available()) throw new FlowError('SINK_ACTIVE');
  let detach = () => {};
  const delivery = createDelivery(run.runId, Object.freeze({ write: (fields.write as DiagnosticSink['write']).bind(sink) }), checked, () => detach());
  detach = observeDiagnosticRecords(run.diagnostics, delivery.record);
  owners.set(run, delivery);
  return delivery.controller;
}
