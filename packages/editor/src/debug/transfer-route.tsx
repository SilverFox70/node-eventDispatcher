import type { ExecutionTraceEvent } from 'event-driven-design/model';

function endpoint(port: ExecutionTraceEvent['from'], boundary: string) {
  return port ? `${port.node}.${port.port}` : boundary;
}

export function TransferRoute({ event }: { event: ExecutionTraceEvent }) {
  return <span>{endpoint(event.from, 'Graph input')} → {endpoint(event.to, 'Graph output')}</span>;
}
