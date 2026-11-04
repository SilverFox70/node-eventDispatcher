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

const captureRun = startNetwork(compiled, { capturePolicy: { allowedNodes: ['worker'], denyInputs: [], denyOutputs: [], maxPayloadBytes: 2048, maxSessionMs: 1000 } });
const session = captureRun.openDiagnosticsSession({ rules: [{ nodeId: 'worker', inputs: true, outputs: false, ports: ['in'], jobIds: ['job-A'] }], expiresInMs: 1000 });
session.update({ expectedEpoch: session.snapshot().epoch, rules: [] });
session.subscribe(() => session.snapshot()); session.dispose();
// @ts-expect-error Host must specify all ceilings and denies.
startNetwork(compiled, { capturePolicy: { allowedNodes: ['worker'] } });
// @ts-expect-error Updates need an explicit epoch.
session.update({ rules: [] });
// @ts-expect-error Selectors are immutable.
session.snapshot().rules[0]?.ports?.push('out');
if (event.kind === 'sent' && event.capture) {
  const sessionId: string = event.captureSessionId;
  void sessionId;
  if (event.capture.state === 'captured') void event.capture.value;
  else void event.capture.preview;
}
// @ts-expect-error Captures require session attribution.
const unscoped: DiagnosticRecord = { version: 1, runId: '', sequence: 1, timeMs: 0, kind: 'received', nodeId: 'a', port: 'in', packet: { version: 1, packetId: '', jobId: '', parentPacketIds: [] }, capture: { state: 'captured', value: 1, bytes: 1 } };
void unscoped;
