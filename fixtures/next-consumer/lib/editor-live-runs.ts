import 'server-only';
import type { NetworkRun } from 'event-driven-design';

type Entry = {
  id: string; revision: number; graphHash: string; run: NetworkRun; expires?: number;
};

// The demo admits one run. Retain only the latest bounded observation for reconnect.
let current: Entry | undefined;
let activeId: string | undefined;
export const liveRuns = {
  begin(id: string) {
    current = undefined;
    activeId = id;
  },
  attach(id: string, revision: number, graphHash: string, run: NetworkRun) {
    if (activeId === id) current = { id, revision, graphHash, run };
  },
  finish(id: string) {
    if (activeId === id) {
      activeId = undefined;
      if (current) current.expires = Date.now() + 60000;
    }
  },
  read(id: string) {
    if (current?.expires !== undefined && Date.now() >= current.expires) current = undefined;
    if (!current || current.id !== id) return;
    const { revision, graphHash, run } = current;
    return { revision, graphHash, status: run.snapshot().status, trace: run.trace() };
  },
};
