'use client';
import { useEffect, useRef, useState } from 'react';
import { inspectionDiagram } from '../../lib/inspection-diagram';
import { connectDiagnosticControls } from '../../lib/diagnostic-connection';
import type { DiagnosticControls, DiagnosticState } from '../../lib/diagnostic-connection';
import { downloadDiagnostics } from '../../lib/diagnostic-download';
import DiagramView from '../inspector/diagram';
import CausalDetails from './causal-details';
import NodeDetails from '../inspector/node-details';

export default function DiagnosticInspector() {
  const [example, setExample] = useState('account'), [restart, setRestart] = useState(0);
  const [state, setState] = useState<DiagnosticState | null>(null), [selected, setSelected] = useState<string | null>(null);
  const [includeCaptures, setIncludeCaptures] = useState(false);
  const controls = useRef<DiagnosticControls | null>(null);
  useEffect(() => {
    setState(null); setSelected(null); setIncludeCaptures(false);
    const connection = connectDiagnosticControls(setState, () => new EventSource('/api/diagnostics?example=' + example));
    controls.current = connection;
    return () => { connection.dispose(); controls.current = null; };
  }, [example, restart]);
  const view = state?.view, source = state?.snapshot?.sources.find(source => source.id === view?.sourceId);
  const diagram = source ? inspectionDiagram(source) : null, detail = diagram?.vertices.find(vertex => vertex.id === selected);
  return <section className="inspector">
    <p role="status">Connection: {state?.status ?? 'Connecting'}</p>
    <p>Capture starts off. Select a node, enable its input/output capture, then send a test load. Capture changes never restart this run.</p>
    <label>Diagnostic example<select value={example} onChange={event => setExample(event.target.value)}>
      <option value="account">Local sample accounts</option><option value="pokemon">Pokémon HTTP branches</option><option value="causal">Eligibility and parallel results</option>
    </select></label>
    {example === 'pokemon' && <p>Each explicit load makes up to six public GETs using the existing cache. No automatic retries.</p>}
    <div className="execution-controls">
      <button type="button" disabled={!view || state.pending || state.status !== 'Live' || view.busy || view.session.status !== 'active'} onClick={() => { void controls.current!.command({ action: 'load' }); }}>Send three test jobs</button>
      <button type="button" onClick={() => setRestart(value => value + 1)}>Start a new run</button>
      <label className="payload-choice"><input type="checkbox" checked={includeCaptures} onChange={event => setIncludeCaptures(event.target.checked)} />Include retained captures in download</label>
      <button type="button" disabled={!view || state.pending || state.status !== 'Live'} onClick={() => { void downloadDiagnostics(controls.current!, includeCaptures); }}>Download diagnostic JSONL</button>
    </div>
    {state?.error && <p role="alert">{state.error}</p>}
    {view && <><p>{example === 'causal' ? 'Outputs' : 'Test jobs'}: {view.completed}/{view.submitted} · {view.busy ? 'Working' : 'Ready'} · Session {view.session.status}</p>
      <small data-testid="diagnostic-run">Source {view.sourceId} · Run {view.runId}</small>
      <p>Retained records: {view.records.events.length} · Evicted: {view.records.dropped}</p></>}
    {diagram && <DiagramView diagram={diagram} trace={state!.execution} selected={selected} select={setSelected} />}
    {view && source?.kind === 'graph' && <CausalDetails key={view.runId} view={view} spec={source.spec} live={state!.status === 'Live'} />}
    {detail?.nodeId && view && controls.current && <NodeDetails vertex={detail} trace={state!.execution} allowPayloads={false}
      close={() => setSelected(null)} diagnostic={{ view, controls: controls.current, pending: state!.pending || state!.status !== 'Live' }} />}
  </section>;
}
