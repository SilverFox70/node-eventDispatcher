import { validateDiagnosticBatch } from 'event-driven-design/model';
import type { InspectionSnapshot, ExecutionTraceSnapshot } from 'event-driven-design/model';
import { connectInspection } from './inspection-connection.ts';
import type { ConnectionStatus } from './inspection-connection.ts';
import { readDiagnosticView, latestDiagnosticView } from './diagnostic-model.ts';
import type { DiagnosticView } from './diagnostic-model.ts';
export type DiagnosticState = { snapshot: InspectionSnapshot | null; execution: ExecutionTraceSnapshot | null;
  view: DiagnosticView | null; status: ConnectionStatus; pending: boolean; error: string | null };
export type DiagnosticCommand = { action: 'load' } | { action: 'capture'; nodeId: string; inputs: boolean; outputs: boolean } |
  { action: 'export'; includeCaptures: boolean };

/** One browser connection owns requests; late responses cannot reach a replacement run or disposed view. */
export function connectDiagnosticControls(publish: (state: DiagnosticState) => void,
  create: () => EventSource, send: typeof fetch = fetch) {
  let active = true;
  let state: DiagnosticState = { snapshot: null, execution: null, view: null, status: 'Connecting', pending: false, error: null };
  let request: AbortController | null = null;
  function update(patch: Partial<DiagnosticState>) { state = { ...state, ...patch }; if (active) publish(state); }
  const stop = connectInspection((snapshot, execution, next) => {
    if (!next) throw Error('Missing diagnostics');
    const replaced = state.view !== null && state.view.token !== next.token;
    if (replaced) { request?.abort(); request = null; }
    update({ snapshot, execution, view: latestDiagnosticView(state.view, next),
      ...(replaced ? { pending: false, error: null } : {}) });
  }, status => update({ status }), create);
  async function command(extra: DiagnosticCommand): Promise<string | null> {
    const view = state.view;
    if (!active || !view || state.pending || state.status !== 'Live') return null;
    const controller = new AbortController(); request = controller; update({ pending: true, error: null });
    try {
      const response = await send('/api/diagnostics', { method: 'POST', headers: { 'content-type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ ...extra, token: view.token, sourceId: view.sourceId, runId: view.runId,
          sessionId: view.session.sessionId, expectedEpoch: view.session.epoch }) });
      if (!active || state.view?.token !== view.token) return null;
      if (!response.ok) throw Error('Control rejected (' + response.status + ')');
      if (extra.action === 'export') {
        const text = await response.text();
        if (!active || state.view?.token !== view.token) return null;
        const lines = text.trimEnd().split('\n').map(line => JSON.parse(line));
        if (text.length > 4194304 || lines.length > 8 || lines.some(batch => !validateDiagnosticBatch(batch).ok || batch.runId !== view.runId)) throw Error('Invalid export');
        return text;
      }
      const next = readDiagnosticView(await response.json(), state.snapshot!);
      if (active && state.view?.token === view.token) update({ view: latestDiagnosticView(state.view, next) });
    } catch { if (active && state.view?.token === view.token) update({ error: 'Control unavailable. The host may have rejected stale or expired permission.' }); }
    finally { if (request === controller) { request = null; update({ pending: false }); } }
    return null;
  }
  return { command, dispose() { if (!active) return; active = false; stop(); request?.abort(); request = null; } };
}
export type DiagnosticControls = ReturnType<typeof connectDiagnosticControls>;
