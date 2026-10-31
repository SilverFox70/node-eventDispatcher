import { toMermaid, validateExecutionTrace } from 'event-driven-design/model';
import type { InspectionSnapshot, ExecutionTraceSnapshot, InspectionSource } from 'event-driven-design/model';

export type ConnectionStatus = 'Connecting' | 'Live' | 'Disconnected — showing stale data' | 'Invalid inspection data';
type Source = Pick<EventSource, 'onopen' | 'onerror' | 'onmessage' | 'close'>;

/** Native EventSource owns one rate-limited reconnect loop; disposed callbacks cannot publish. */
export function connectInspection(publish: (snapshot: InspectionSnapshot, execution: ExecutionTraceSnapshot | null) => void,
  status: (value: ConnectionStatus) => void, create: () => Source = () => new EventSource('/api/inspection')) {
  const source = create();
  let active = true, sequence = 0;
  const stop = () => { active = false; source.close(); };
  source.onopen = () => { if (active) { sequence = 0; status('Connecting'); } };
  source.onerror = () => { if (active) status('Disconnected — showing stale data'); };
  source.onmessage = event => {
    if (!active) return;
    try {
      const frame = JSON.parse(event.data) as { sequence: number; snapshot: InspectionSnapshot; execution?: ExecutionTraceSnapshot | null };
      if (!Number.isSafeInteger(frame.sequence) || frame.sequence < 1) throw Error('Invalid sequence');
      if (frame.sequence <= sequence) return;
      toMermaid(frame.snapshot); // Shared metadata admission, never application payload evaluation.
      const execution = frame.execution ?? null;
      if (execution !== null) {
        const graph = frame.snapshot.sources.find((item): item is Extract<InspectionSource, { kind: 'graph' }> => item.kind === 'graph' && item.run?.runId === execution.runId);
        if (!validateExecutionTrace(execution).ok || !graph) throw Error('Invalid execution association');
        const channels = new Set([...graph.spec.edges.map((_, index) => 'edge:' + index),
          ...Object.keys(graph.spec.inputs).map(name => 'input:' + name), ...Object.keys(graph.spec.outputs).map(name => 'output:' + name)]);
        if (execution.events.some(event => !channels.has(event.channelId))) throw Error('Unknown trace channel');
      }
      sequence = frame.sequence;
      publish(frame.snapshot, execution); status('Live');
    } catch { stop(); status('Invalid inspection data'); }
  };
  return stop;
}
