import { toMermaid } from 'event-driven-design/model';
import type { InspectionSnapshot } from 'event-driven-design/model';

export type ConnectionStatus = 'Connecting' | 'Live' | 'Disconnected — showing stale data' | 'Invalid inspection data';
type Source = Pick<EventSource, 'onopen' | 'onerror' | 'onmessage' | 'close'>;

/** Native EventSource owns one rate-limited reconnect loop; disposed callbacks cannot publish. */
export function connectInspection(publish: (snapshot: InspectionSnapshot) => void,
  status: (value: ConnectionStatus) => void, create: () => Source = () => new EventSource('/api/inspection')) {
  const source = create();
  let active = true, sequence = 0;
  const stop = () => { active = false; source.close(); };
  source.onopen = () => { if (active) { sequence = 0; status('Connecting'); } };
  source.onerror = () => { if (active) status('Disconnected — showing stale data'); };
  source.onmessage = event => {
    if (!active) return;
    try {
      const frame = JSON.parse(event.data) as { sequence: number; snapshot: InspectionSnapshot };
      if (!Number.isSafeInteger(frame.sequence) || frame.sequence < 1) throw Error('Invalid sequence');
      if (frame.sequence <= sequence) return;
      toMermaid(frame.snapshot); // Shared metadata admission, never application payload evaluation.
      sequence = frame.sequence;
      publish(frame.snapshot); status('Live');
    } catch { stop(); status('Invalid inspection data'); }
  };
  return stop;
}
