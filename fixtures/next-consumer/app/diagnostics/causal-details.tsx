'use client';
import { useMemo, useState } from 'react';
import { explainCausal } from 'event-driven-design/model';
import type { CausalEvidence, CausalGap, CausalSubject, DiagnosticRecord, GraphSpec } from 'event-driven-design/model';
import type { DiagnosticView } from '../../lib/diagnostic-model';

const gapText: Record<CausalGap, string> = {
  'missing-parent': 'A parent packet is unavailable.',
  'missing-admission': 'The original admission is unavailable.',
  'cycle': 'The retained parent links contain a cycle.',
  'conflicting-packet': 'Retained records disagree about a packet.',
  'limit': 'The explanation reached its record limit.',
  'evicted': 'Older evidence was evicted.',
  'disconnect': 'The connection was interrupted. This is the last retained view.',
  'capture-off': 'Some payloads were not captured.',
  'oversize': 'Some captured payloads were truncated.',
  'reason-undeclared': 'A filter dropped an input without a retained reason.',
  'identity-unverified': 'The host did not provide a verified build identity.',
  'missing-attempt-endpoint': 'An attempt start or finish is unavailable.',
  'disposition-unknown': 'No output or filter drop was retained for this input.',
};

function DiagnosticRow({ record }: { record: DiagnosticRecord }) {
  if ('packet' in record) return <>
    {record.kind} · {record.nodeId}.{record.port} · packet {record.packet.packetId}
    {record.capture?.state === 'captured' && <details><summary>Captured payload</summary><pre>{JSON.stringify(record.capture.value, null, 2)}</pre></details>}
    {record.capture?.state === 'truncated' && <details><summary>Truncated payload preview</summary><pre>{record.capture.preview}</pre></details>}
  </>;
  if ('durationMs' in record) return <>{record.nodeId} · {record.kind} · {record.outcome} · {record.durationMs.toFixed(1)} ms
    {'attempt' in record && <> · attempt {record.attempt}</>}{'code' in record && <> · {record.code}</>}</>;
  if ('inputs' in record) return <>{record.nodeId} · {record.kind} · bound input {record.inputs.map(packet => packet.packetId).join(', ')}</>;
  if (record.kind === 'run-terminal') return <>Run {record.status}</>;
  return null;
}

export default function CausalDetails({ view, spec, live }: { view: DiagnosticView; spec: GraphSpec; live: boolean }) {
  const [selection, setSelection] = useState('');
  const candidates = useMemo(() => {
    const endpoints = Object.values(spec.outputs);
    const outputs = view.records.events.flatMap(row => row.kind === 'sent' &&
      endpoints.some(endpoint => endpoint.node === row.nodeId && endpoint.port === row.port) ? [row.sequence] : []);
    const observedOutputs = new Set(outputs);
    const subjects = view.records.events.flatMap<CausalSubject>(row => {
      if (row.kind === 'input-admitted') return [{ kind: 'input' as const, packetId: row.packet.packetId, jobId: row.packet.jobId }];
      if (row.kind !== 'sent' || !observedOutputs.has(row.sequence)) return [];
      return [{ kind: 'output' as const, packetId: row.packet.packetId, jobId: row.packet.jobId }];
    });
    return { outputs, subjects };
  }, [view.records, spec]);
  const subject = candidates.subjects.find(row => row.kind + ':' + row.packetId === selection);
  const result = useMemo(() => {
    if (!subject) return null;
    const evidence: CausalEvidence = { format: 'nodeflow.evidence', version: 1, runId: view.runId,
      diagnostics: view.records, decisions: view.decisions, identity: { status: 'unverified' } };
    return explainCausal(evidence, { runId: view.runId, subject, maxRecords: 256 }, candidates.outputs, live);
  }, [view.runId, view.records, view.decisions, subject, candidates.outputs, live]);
  const explanation = result?.ok ? result.explanation : undefined;
  return <section aria-label="Causal explanation">
    <h2>Explain a packet</h2>
    <label>Input or output<select value={subject ? selection : ''} onChange={event => setSelection(event.target.value)}>
      <option value="">Select an admitted input or output</option>
      {candidates.subjects.map(row => {
        const id = row.kind + ':' + row.packetId;
        return <option key={id} value={id}>{row.kind === 'input' ? 'Input' : 'Output'} · {row.jobId} · {row.packetId.slice(0, 8)}</option>;
      })}
    </select></label>
    {selection && !subject && <p>The selected packet is no longer retained.</p>}
    {result && !result.ok && <p>Explanation unavailable · {result.issue}</p>}
    {explanation && <>
      <p>Evidence: {explanation.coverage === 'partial' ? 'Partial' : 'Complete for recorded scope'}</p>
      {explanation.gaps.length > 0 && <ul aria-label="Evidence gaps">{explanation.gaps.map(gap => <li key={gap}>{gapText[gap]}</li>)}</ul>}
      {explanation.links.length > 0 && <details open><summary>Packet parent links</summary>
        <ul>{explanation.links.map(link => <li key={link.parent + ':' + link.child}>{link.parent} → {link.child}</li>)}</ul>
      </details>}
      <ol aria-label="Retained observations">{explanation.nodes.map(({ stream, record }) => <li key={stream + ':' + record.sequence}>
        {stream === 'diagnostic' ? <DiagnosticRow record={record as DiagnosticRecord} /> :
          'format' in record && (record.format === 'nodeflow.filter'
            ? <>{record.nodeId} · Filter observed {record.outcome} · attempt {record.attempt}</>
            : <>{record.nodeId} · Node reported {record.outcome} · {record.code} · rule {record.ruleVersion} · attempt {record.attempt}</>)}
        {' '}<small>{stream} #{record.sequence}</small>
      </li>)}</ol>
    </>}
  </section>;
}
