import { attachDiagnosticsSink, exportDiagnostics, type NetworkRun, type DiagnosticSink, type DiagnosticBatch } from '../../dist/cjs';
import { validateDiagnosticBatch } from '../../dist/cjs/model';
declare const run: NetworkRun;
const sink: DiagnosticSink = { write: async (batch: DiagnosticBatch, signal) => { validateDiagnosticBatch(batch); void signal.aborted; } };
const controller = attachDiagnosticsSink(run, sink, { includeCaptures: false, recordLimit: 128, byteLimit: 262144, batchSize: 32 });
void controller.flush({ timeoutMs: 1000 }); void controller.dispose();
exportDiagnostics(run.diagnostics());
// @ts-expect-error Writes must be asynchronous.
attachDiagnosticsSink(run, { write: () => {} });
// @ts-expect-error Flush requires a finite explicit deadline.
controller.flush({});
// @ts-expect-error Batches cannot grant capture permission.
exportDiagnostics(run.diagnostics(), { payloads: true });
// @ts-expect-error Sink status is immutable.
controller.snapshot().droppedRecords = 0;
