import 'server-only';
import { performance } from 'node:perf_hooks';
import { createInspectionScope, startNetwork, packet, exportDiagnostics, FlowError } from 'event-driven-design';
import { accountGraph } from './account-graph.ts';
import { pokemonGraph } from './pokemon-graph.ts';
import type { DiagnosticView, DiagnosticAction, NodeCapture } from './diagnostic-model.ts';

/** One controlled demo owns its runtime, capture permission and prospective test loads. */
export function createDiagnosticDemo(example: 'account' | 'pokemon', token: string) {
  const graph = example === 'pokemon' ? pokemonGraph() : accountGraph();
  const sourceId = example === 'pokemon' ? 'pokemon-flow' : 'account-flow';
  const run = startNetwork(graph.compiled, { timeoutMs: 60000, diagnostics: { limit: 256 }, trace: {},
    capturePolicy: { allowedNodes: graph.spec.nodes.map(node => node.id), denyInputs: [], denyOutputs: [], maxPayloadBytes: 1024, maxSessionMs: 60000 } });
  const session = run.openDiagnosticsSession({ rules: [], expiresInMs: 60000 });
  const scope = createInspectionScope(), remove = scope.addGraph(sourceId, { spec: graph.spec, catalog: graph.catalog, run });
  const listeners = new Set<() => void>();
  let active = true, busy = false, submitted = 0, completed = 0, batch = 0, pending = false;
  function changed() {
    if (!active || pending) return;
    pending = true; queueMicrotask(() => {
      pending = false;
      if (!active) return;
      for (const listener of [...listeners]) {
        if (!listeners.has(listener)) continue;
        try { listener(); } catch { listeners.delete(listener); }
      }
    });
  }
  const stop = run.onDiagnostics(changed), stopTrace = run.onTrace(changed);
  void run.done.then(() => { busy = false; changed(); });
  const outputName = example === 'pokemon' ? 'cards' : 'summary', inputName = example === 'pokemon' ? 'pokemon' : 'accountId';
  const draining = (async () => {
    for await (const value of run.outputs[outputName]!) { void value; completed++; if (completed === submitted) busy = false; changed(); }
  })().catch(() => {});
  function view(): DiagnosticView {
    const state = session.snapshot();
    return { version: 1, token, sourceId, runId: run.runId, records: run.diagnostics(), busy, submitted, completed,
      session: { sessionId: state.sessionId, epoch: state.epoch, status: state.status,
        remainingMs: state.status === 'active' ? Math.max(0, Math.ceil(state.expiresAtMs - performance.now())) : 0,
        effectiveRules: state.effectiveRules.map(({ nodeId, inputs, outputs }) => ({ nodeId, inputs, outputs })) } };
  }
  function command(request: DiagnosticAction): DiagnosticView | string {
    const state = session.snapshot();
    if (!active || request.token !== token || request.sourceId !== sourceId || request.runId !== run.runId || request.sessionId !== state.sessionId) throw new FlowError('FORBIDDEN');
    if (request.expectedEpoch !== state.epoch) throw new FlowError('CAPTURE_CONFLICT');
    if (request.action === 'export') return exportDiagnostics(run.diagnostics(), { includeCaptures: request.includeCaptures! });
    if (state.status !== 'active') throw new FlowError('SESSION_CLOSED');
    if (request.action === 'capture') {
      const rule: NodeCapture = { nodeId: request.nodeId!, inputs: request.inputs!, outputs: request.outputs! };
      session.update({ expectedEpoch: state.epoch, rules: [...state.rules.filter(item => item.nodeId !== rule.nodeId), rule] });
    } else {
      if (busy) throw new FlowError('BUSY');
      if (batch >= 10) throw new FlowError('LOAD_LIMIT');
      busy = true; submitted += 3; const id = ++batch;
      const values = example === 'pokemon' ? ['pikachu', 'bulbasaur', 'charmander'] : ['acct-101', 'acct-202', 'acct-303'];
      void (async () => { for (const value of values) await run.send(inputName, packet(value, { jobId: `demo-${id}-${value}`, key: value })); })().catch(() => run.cancel());
    }
    changed(); return view();
  }
  return { snapshot: scope.snapshot, trace: run.trace, diagnostics: view, command,
    subscribe(listener: () => void) {
      if (typeof listener !== 'function') throw new TypeError('Diagnostic observer must be a function');
      if (listeners.size >= 64) throw new RangeError('Diagnostic observer limit reached');
      listeners.add(listener); return () => { listeners.delete(listener); };
    },
    advance() { changed(); return true; },
    dispose() { if (!active) return; active = false; listeners.clear(); stop(); stopTrace(); session.dispose(); remove(); run.cancel(); void draining; }
  };
}
