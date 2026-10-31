import { startNetwork, type CompiledGraph, type TraceOptions } from 'event-driven-design';
import type { ExecutionTraceSnapshot, ExecutionTraceEvent } from 'event-driven-design/model';
import { validateExecutionTrace } from 'event-driven-design/model';
declare const graph: CompiledGraph;
const options: TraceOptions = { limit: 128, payloads: false };
const run = startNetwork(graph, { trace: options });
const snapshot: ExecutionTraceSnapshot | null = run.trace();
const stop: () => void = run.onTrace(() => { const latest = run.trace(); void latest; });
stop(); run.clearTrace(); validateExecutionTrace(snapshot);
if (snapshot) {
  const event: ExecutionTraceEvent | undefined = snapshot.events[0]; void event;
  // @ts-expect-error trace events are readonly
  snapshot.events.push({});
  // @ts-expect-error packet lineage is readonly
  snapshot.events[0]!.parentPacketIds.push('fake');
}
// @ts-expect-error trace is an options object
startNetwork(graph, { trace: true });
// @ts-expect-error payload capture is a boolean
startNetwork(graph, { trace: { payloads: 'yes' } });
// @ts-expect-error limit is numeric
startNetwork(graph, { trace: { limit: '128' } });
// @ts-expect-error observers are functions
run.onTrace(42);
