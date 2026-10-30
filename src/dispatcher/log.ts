import { randomUUID } from 'node:crypto';

export type DispatcherAction = 'on' | 'once' | 'emit' | 'off' | 'unsubscribeAll';
export type DispatcherLogEntry = {
  action: DispatcherAction;
  timestamp: number;
  event: string;
  callbackName?: string;
};

/** A bounded metadata log: never retain callbacks, payloads or contexts. */
export function createDispatcherLog(limit: number) {
  let enabled = false;
  const entries: { id: string; entry: DispatcherLogEntry }[] = [];

  return {
    record(action: DispatcherAction, event: string, callbackName?: string): void {
      if (!enabled || limit === 0) return;
      const entry: DispatcherLogEntry = { action, event, timestamp: Date.now() };
      if (callbackName !== undefined) entry.callbackName = callbackName;
      entries.push({ id: randomUUID(), entry });
      if (entries.length > limit) entries.shift();
    },
    snapshot(): Record<string, DispatcherLogEntry> {
      return Object.fromEntries(entries.map(({ id, entry }) => [id, { ...entry }]));
    },
    enable(): void { enabled = true; },
    disable(): void { enabled = false; },
    isEnabled(): boolean { return enabled; }
  };
}
