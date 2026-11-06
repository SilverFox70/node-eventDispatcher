import type { GraphSpecV2 } from 'event-driven-design/model';

export type RunResult = {
  revision: number; graphHash: string; runId: string;
  terminal: { status: 'completed' | 'cancelled' | 'failed'; code?: string };
  outputs: Record<string, unknown[]>;
};

export async function hashDraft(graph: GraphSpecV2): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(graph));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}

export function readRunResult(raw: unknown, revision: number, graphHash: string): RunResult {
  const value = raw as Partial<RunResult> | null;
  if (!value || value.revision !== revision || value.graphHash !== graphHash || typeof value.runId !== 'string' ||
    !value.terminal || !['completed', 'cancelled', 'failed'].includes(value.terminal.status) ||
    !value.outputs || Array.isArray(value.outputs) || typeof value.outputs !== 'object' ||
    !Object.values(value.outputs).every(Array.isArray)) throw Error('INVALID_RUN_RESULT');
  return value as RunResult;
}

export async function requestRun(endpoint: string, body: unknown, method = 'POST', signal?: AbortSignal): Promise<unknown> {
  const response = await globalThis.fetch(endpoint, {
    method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), ...(signal ? { signal } : {}),
  });
  const value = await response.json() as { code?: unknown } | null;
  if (!response.ok) throw Error(typeof value?.code === 'string' ? value.code : 'RUN_REQUEST_FAILED');
  return value;
}
