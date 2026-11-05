'use client';
import { downloadDiagnostics } from '../../lib/diagnostic-download';
import { useState } from 'react';
import type { DiagnosticRecord } from 'event-driven-design/model';
import type { DiagnosticView } from '../../lib/diagnostic-model';
import type { DiagnosticControls } from '../../lib/diagnostic-connection';

/** A job filter uses retained explicit task binding; missing binding is never guessed. */
export default function DiagnosticNode({ nodeId, view, controls, pending }: {
  nodeId: string; view: DiagnosticView; controls: DiagnosticControls; pending: boolean;
}) {
  const [job, setJob] = useState('all'), [includeCaptures, setIncludeCaptures] = useState(false);
  const records = view.records.events.filter(record => 'nodeId' in record && record.nodeId === nodeId);
  function jobs(record: DiagnosticRecord): string[] {
    if ('packet' in record) return [record.packet.jobId];
    if ('inputs' in record) return record.inputs.map(input => input.jobId);
    if ('operationId' in record) {
      const start = records.find(item => item.kind === 'operation-started' && item.operationId === record.operationId);
      if (start?.kind === 'operation-started') return start.inputs.map(input => input.jobId);
    }
    return [];
  }
  const available = [...new Set(records.flatMap(jobs))], selected = job === 'all' ? records : records.filter(record => jobs(record).includes(job));
  const rule = view.session.effectiveRules.find(rule => rule.nodeId === nodeId);
  const inputs = rule?.inputs ?? false, outputs = rule?.outputs ?? false;
  const closed = view.session.status !== 'active';
  return <section aria-label="Node diagnostics">
    <h3>Live capture</h3>
    <p>Session: {view.session.status} · {Math.ceil(view.session.remainingMs / 1000)} seconds remaining · Epoch {view.session.epoch}</p>
    {!inputs && !outputs && <p>Capture is off for this node. Only metadata is recorded.</p>}
    <div className="execution-controls">
      <label className="payload-choice"><input type="checkbox" checked={inputs} disabled={pending || closed} onChange={event => {
        void controls.command({ action: 'capture', nodeId, inputs: event.target.checked, outputs });
      }} />Capture input data</label>
      <label className="payload-choice"><input type="checkbox" checked={outputs} disabled={pending || closed} onChange={event => {
        void controls.command({ action: 'capture', nodeId, inputs, outputs: event.target.checked });
      }} />Capture output data</label>
    </div>
    <div className="execution-controls">
      <label className="payload-choice"><input type="checkbox" checked={includeCaptures} onChange={event => setIncludeCaptures(event.target.checked)} />Include retained captures in download</label>
      <button type="button" disabled={pending} onClick={() => { void downloadDiagnostics(controls, includeCaptures); }}>Download run diagnostic JSONL</button>
    </div>
    {pending && <p aria-live="polite">Waiting for the host response.</p>}
    <p>Host policy controls effective capture. Changes apply to future transfers; earlier payloads cannot be recovered.</p>
    <small>Source {view.sourceId} · Run {view.runId} · Session {view.session.sessionId}</small>
    <label>Diagnostic job<select value={job} onChange={event => setJob(event.target.value)}>
      <option value="all">All jobs and node-scoped records</option>{available.map(id => <option key={id} value={id}>{id}</option>)}
    </select></label>
    {view.records.dropped > 0 && <p>{view.records.dropped} older records were evicted. This view is incomplete.</p>}
    <div role="region" className="diagnostic-records" tabIndex={0} aria-label="Retained diagnostic records">
      {selected.length === 0 && <p>No matching diagnostic records are retained yet. Send a test load to observe new work.</p>}
      {selected.map(record => <article className="node-observation" key={record.sequence}>
        <strong>{record.kind} · #{record.sequence}</strong>
        <small>{record.timeMs.toFixed(1)} ms{'port' in record ? ' · Port ' + record.port : ''}</small>
        {'outcome' in record && <p>Outcome: {record.outcome} · Duration {record.durationMs.toFixed(1)} ms</p>}
        {'status' in record && <p>Run status: {record.status}</p>}
        {'inputs' in record && <small>{record.inputs.length ? 'Bound jobs: ' + record.inputs.map(input => input.jobId).join(', ') : 'Node-scoped operation; no packet binding was supplied.'}</small>}
        {'code' in record && <p className="diagnostic-error">Code: {record.code}</p>}
        {'operationId' in record && <small>Operation {record.operationId}</small>}
        {'attemptId' in record && <small>Attempt {record.attempt} · {record.attemptId}</small>}
        {'packet' in record && <><small>Packet {record.packet.packetId} · Job {record.packet.jobId}</small>
          <small>Immediate parents: {record.packet.parentPacketIds.join(', ') || 'Root packet'}</small>
          {record.capture ? <>
            <small>Captured session {record.captureSessionId} · Epoch {record.captureEpoch} · {record.capture.bytes} bytes</small>
            {record.capture.state === 'captured' ? <pre>{JSON.stringify(record.capture.value, null, 2)}</pre>
              : <><p>Payload truncated; preview is not necessarily valid JSON.</p><pre>{record.capture.preview}</pre></>}
          </> : <p>Payload was not captured at this transfer.</p>}</>}
      </article>)}
    </div>
  </section>;
}
