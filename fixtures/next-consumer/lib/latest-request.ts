import type { DemoResult } from './protocol';

/** Abort obsolete work and ignore late results even when a transport does not honor abort. */
export function createLatestRequest(update: (result: DemoResult | 'loading' | 'unavailable') => void,
  transport: typeof fetch = fetch) {
  let sequence = 0, active: AbortController | undefined;
  return {
    async run(value: number): Promise<void> {
      const current = ++sequence;
      active?.abort(); active = new AbortController();
      update('loading');
      try {
        const response = await transport('/api/demo', { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ value }), signal: active.signal });
        const reply = await response.json();
        if (current === sequence) update({ reply, requestId: response.headers.get('x-flow-request-id') ?? '',
          graphRevision: response.headers.get('x-graph-revision') ?? '', runId: response.headers.get('x-flow-run-id') ?? '' });
      } catch { if (current === sequence) update('unavailable'); }
    },
    cancel(): void { sequence++; active?.abort(); },
  };
}
