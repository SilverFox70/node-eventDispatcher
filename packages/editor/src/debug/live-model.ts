import { validateExecutionTrace } from 'event-driven-design/model';
import type { ExecutionTraceEvent, ExecutionTraceSnapshot, GraphSpecV2, Snapshot } from 'event-driven-design/model';

export type DebugSession = { id: string; graph: GraphSpecV2; revision: number; graphHash: string };
export type LiveSnapshot = {
  revision: number; graphHash: string; status: Snapshot['status']; trace: ExecutionTraceSnapshot;
};

export function readLiveSnapshot(value: unknown, session: DebugSession): LiveSnapshot {
  const view = value as Partial<LiveSnapshot> | null;
  if (!view || view.revision !== session.revision || view.graphHash !== session.graphHash ||
    !view.status || !['running', 'draining', 'completed', 'cancelled', 'failed'].includes(view.status) ||
    !validateExecutionTrace(view.trace).ok) throw Error('INVALID_LIVE_SNAPSHOT');
  return view as LiveSnapshot;
}

export function freshTransfers(trace: ExecutionTraceSnapshot, cursor: number, resumed: boolean): readonly ExecutionTraceEvent[] {
  if (resumed) return [];
  return trace.events.filter(event => event.sequence > cursor);
}

export function stageEvents(events: readonly ExecutionTraceEvent[], job: string, stage: string) {
  return events.filter(event => event.jobId === job && (
    stage === '' ? event.kind === 'sent' && event.to === null
      : event.kind === 'received' ? event.to?.node === stage : event.from?.node === stage
  ));
}

export function waitingPorts(graph: GraphSpecV2, events: readonly ExecutionTraceEvent[], stage: string) {
  const inputs = [...graph.edges.map(edge => edge.to), ...Object.values(graph.inputs)].filter(port => port.node === stage);
  if (inputs.length < 2 || !events.some(event => event.kind === 'received') || events.some(event => event.kind === 'sent')) return [];
  const arrived = new Set(events.map(event => event.to?.port));
  return inputs.filter(port => !arrived.has(port.port)).map(port => port.port);
}
