import { useEffect, useState } from 'react';
import type { ExecutionTraceEvent } from 'event-driven-design/model';
import { freshTransfers, readLiveSnapshot } from './live-model.js';
import type { DebugSession, LiveSnapshot } from './live-model.js';

type LiveState = {
  id: string; connection: 'connecting' | 'live' | 'disconnected';
  snapshot?: LiveSnapshot; transfers: readonly ExecutionTraceEvent[]; reconnected: boolean;
};

export function useLiveRun(endpoint: string | undefined, session: DebugSession | undefined) {
  const [state, setState] = useState<LiveState>();
  useEffect(() => {
    if (!endpoint || !session) return;
    const { id } = session;
    const controller = new AbortController();
    let timer: ReturnType<typeof globalThis.setTimeout>;
    let latest: LiveSnapshot | undefined;
    let interrupted = false;
    let reconnected = false;
    async function poll() {
      try {
        const response = await globalThis.fetch(endpoint!, {
          headers: { 'x-flow-run-key': id }, signal: controller.signal, cache: 'no-store',
        });
        if (!response.ok) throw Error('LIVE_UNAVAILABLE');
        const snapshot = readLiveSnapshot(await response.json(), session!);
        if (controller.signal.aborted) return;
        if (latest && (latest.trace.runId !== snapshot.trace.runId || latest.trace.total > snapshot.trace.total)) {
          throw Error('STALE_LIVE_SNAPSHOT');
        }
        const transfers = freshTransfers(snapshot.trace, latest?.trace.total ?? 0, interrupted);
        reconnected ||= interrupted;
        latest = snapshot;
        interrupted = false;
        setState({ id, connection: 'live', snapshot, transfers, reconnected });
        if (snapshot.status !== 'running' && snapshot.status !== 'draining') {
          timer = globalThis.setTimeout(() => setState({ id, connection: 'live', snapshot, transfers: [], reconnected }), 240);
          return;
        }
      } catch {
        if (controller.signal.aborted) return;
        interrupted = latest !== undefined;
        setState({ id, connection: interrupted ? 'disconnected' : 'connecting',
          ...(latest ? { snapshot: latest } : {}), transfers: [], reconnected });
      }
      timer = globalThis.setTimeout(() => void poll(), 150);
    }
    void poll();
    return () => {
      controller.abort();
      globalThis.clearTimeout(timer);
    };
  }, [endpoint, session]);
  return state && state.id === session?.id ? state : undefined;
}
