import { startNetwork, type CompiledGraph, type DiagnosticRecord, type TaskOptions, type ProcessContext, jsonContract } from '../../dist/cjs';
import { validateDiagnostics, type DiagnosticSnapshot } from '../../dist/cjs/model';
declare const compiled: CompiledGraph;
const run = startNetwork(compiled, { diagnostics: { limit: 128 } });
const snapshot: DiagnosticSnapshot = run.diagnostics();
validateDiagnostics(snapshot);
run.onDiagnostics(() => run.diagnostics());
declare const event: DiagnosticRecord;
if (event.kind === 'attempt-started') event.inputs.map(input => input.jobId);
// @ts-expect-error Payload history is not a diagnostic metadata field.
const forbiddenPayload = event.payload;
void forbiddenPayload;
// @ts-expect-error Immutable snapshot.
snapshot.events.push(event);
// @ts-expect-error S21 cannot enable payload capture.
startNetwork(compiled, { diagnostics: { payloads: true } });
declare const ctx: ProcessContext<{ in: typeof jsonContract }, { out: typeof jsonContract }>;
declare const options: TaskOptions;
ctx.task(() => 1, options);
ctx.task(() => 1);
// @ts-expect-error Explicit binding requires packet objects, not identifiers.
ctx.task(() => 1, { inputs: ['packet-id'] });
