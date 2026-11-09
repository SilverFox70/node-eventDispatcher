'use client';

import { useEffect, useState } from 'react';
import type { DurableProgressAction, DurableProgressView } from './progress-types.js';

export function useDurableProgress(endpoint: string, cursor: string | null, reset: () => void) {
  const [snapshot, setSnapshot] = useState<DurableProgressView>();
  const [connection, setConnection] = useState('Connecting');
  const [request, refresh] = useState(0);
  const [action, setAction] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new globalThis.AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const read = async () => {
      try {
        const url = new globalThis.URL(endpoint, window.location.href);
        if (cursor) url.searchParams.set('after', cursor);
        const response = await fetch(url, {
          cache: 'no-store', signal: globalThis.AbortSignal.any([controller.signal, globalThis.AbortSignal.timeout(5000)]),
        });
        if (controller.signal.aborted) return;
        if (response.status === 400 && cursor) { reset(); return; }
        if (response.status === 404) {
          setSnapshot(undefined);
          setConnection('Run unavailable');
          return;
        }
        if (!response.ok) throw Error('Progress unavailable');
        const next = await response.json() as DurableProgressView;
        if (!controller.signal.aborted) {
          setSnapshot(next);
          setConnection('Connected');
        }
      } catch {
        if (!controller.signal.aborted) setConnection('Disconnected');
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(() => void read(), 1000);
      }
    };
    void read();
    const online = () => refresh(value => value + 1);
    window.addEventListener('online', online);
    return () => {
      controller.abort();
      clearTimeout(timer);
      window.removeEventListener('online', online);
    };
  }, [endpoint, cursor, request, reset]);

  async function send(command: DurableProgressAction) {
    setBusy(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command), signal: globalThis.AbortSignal.timeout(5000),
      });
      setAction(response.ok ? 'Action recorded' : response.status === 409 ? 'Action conflicts with current state' : 'Action refused');
    } catch { setAction('Action response unavailable'); }
    finally { setBusy(false); refresh(value => value + 1); }
  }

  return { snapshot, connection, action, busy, send, refresh: () => refresh(value => value + 1) };
}
