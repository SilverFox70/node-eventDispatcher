import type { DiagnosticRecord } from '../index.js';
import type { DecisionRecord } from '../decisions.js';
import type { CausalEvidence } from './evidence.js';
import { validateCausalEvidence } from './evidence.js';
import { isTransfer, traceLineage } from './lineage.js';
import type { LineageGap, PacketLink, Transfer } from './lineage.js';
import { metadataRecord } from '../../contracts.js';
import { ensure, keys, uuid } from '../packet.js';

export type CausalSubject = Readonly<{ kind: 'input' | 'output'; packetId: string; jobId: string }>;
export type CausalGap = LineageGap | 'evicted' | 'disconnect' | 'capture-off' | 'oversize' |
  'reason-undeclared' | 'identity-unverified' | 'missing-attempt-endpoint' | 'disposition-unknown';
export type ExplanationNode = Readonly<{ stream: 'diagnostic'; record: DiagnosticRecord } |
  { stream: 'decision'; record: DecisionRecord }>;
export type Explanation = Readonly<{
  version: 1; runId: string; subject: CausalSubject;
  coverage: 'complete-for-recorded-scope' | 'partial' | 'unavailable';
  nodes: readonly ExplanationNode[]; links: readonly PacketLink[]; gaps: readonly CausalGap[];
}>;
export type ExplainResult = Readonly<{ ok: true; explanation: Explanation } |
  { ok: false; issue: 'INVALID_QUERY' | 'INVALID_EVIDENCE' | 'WRONG_RUN' | 'UNKNOWN_SUBJECT' }>;

type Query = Readonly<{ runId: string; subject: CausalSubject; maxRecords: number }>;
function readQuery(value: unknown): Query {
  const fields = metadataRecord(value);
  keys(fields, ['runId', 'subject', 'maxRecords']);
  const subject = metadataRecord(fields.subject);
  keys(subject, ['kind', 'packetId', 'jobId']);
  const limit = fields.maxRecords as number;
  ensure(uuid(fields.runId) && uuid(subject.packetId) && typeof subject.jobId === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(subject.jobId) && (subject.kind === 'input' || subject.kind === 'output') &&
    Number.isInteger(limit) && limit >= 1 && limit <= 1024);
  return { runId: fields.runId as string, subject: subject as CausalSubject, maxRecords: limit };
}

const operationKey = (row: { nodeId: string; operationId: string }) => row.nodeId + ':' + row.operationId;
const attemptKey = (row: { nodeId: string; operationId: string; attemptId: string; attempt: number }) =>
  operationKey(row) + ':' + row.attemptId + ':' + row.attempt;

/** The caller supplies only the selected run's retained evidence and its public output transfers. */
export function explainCausal(evidence: CausalEvidence, query: Query, outputs: readonly number[], connected = true): ExplainResult {
  let request: Query;
  try { request = readQuery(query); } catch { return { ok: false, issue: 'INVALID_QUERY' }; }
  if (!validateCausalEvidence(evidence).ok) return { ok: false, issue: 'INVALID_EVIDENCE' };
  if (request.runId !== evidence.runId) return { ok: false, issue: 'WRONG_RUN' };
  const { subject, maxRecords } = request;
  const transfers = evidence.diagnostics.events.filter(isTransfer);
  const outputSequences = new Set(outputs);
  const isOutput = (record: Transfer) => record.kind === 'sent' && outputSequences.has(record.sequence);
  const selected = transfers.find(row => row.packet.packetId === subject.packetId && row.packet.jobId === subject.jobId &&
    (subject.kind === 'input' ? row.kind === 'input-admitted' : isOutput(row)));
  if (!selected) return { ok: false, issue: 'UNKNOWN_SUBJECT' };
  const { ids, descendants, links, gaps: lineageGaps } = traceLineage(evidence, selected, subject.kind === 'input', maxRecords);
  const gaps = new Set<CausalGap>(lineageGaps);
  const operations = new Set<string>();
  const bound = (row: { inputs: readonly { packetId: string; jobId: string }[] }) =>
    row.inputs.some(input => ids.has(input.packetId) && input.jobId === subject.jobId);
  const decisions = evidence.decisions.events.filter(bound);
  for (const row of [...evidence.diagnostics.events, ...decisions]) {
    if ('inputs' in row && bound(row)) operations.add(operationKey(row));
  }
  const diagnostics = evidence.diagnostics.events.filter(row =>
    ('packet' in row && ids.has(row.packet.packetId) && row.packet.jobId === subject.jobId) ||
    ('operationId' in row && operations.has(operationKey(row))) || row.kind === 'run-terminal');
  const nodes: ExplanationNode[] = [
    ...diagnostics.map(record => ({ stream: 'diagnostic' as const, record })),
    ...decisions.map(record => ({ stream: 'decision' as const, record })),
  ];
  nodes.sort((left, right) => left.record.timeMs - right.record.timeMs);
  if (nodes.length > maxRecords) gaps.add('limit');
  const retained = nodes.slice(0, maxRecords);
  if (!retained.some(node => node.record === selected)) {
    retained[maxRecords - 1] = { stream: 'diagnostic', record: selected };
  }
  const shownDiagnostics = retained.flatMap(node => node.stream === 'diagnostic' ? [node.record] : []);
  const shownDecisions = retained.flatMap(node => node.stream === 'decision' ? [node.record] : []);
  const shownTransfers = shownDiagnostics.filter(isTransfer);
  if (!connected) gaps.add('disconnect');
  if (evidence.diagnostics.dropped || evidence.decisions.dropped) gaps.add('evicted');
  const starts = new Set(shownDiagnostics.flatMap(row => row.kind === 'attempt-started' ? [attemptKey(row)] : []));
  const finishes = new Set(shownDiagnostics.flatMap(row => row.kind === 'attempt-finished' ? [attemptKey(row)] : []));
  if ([...starts].some(key => !finishes.has(key)) || [...finishes].some(key => !starts.has(key)) ||
    shownDecisions.some(row => !starts.has(attemptKey(row)) || !finishes.has(attemptKey(row)))) gaps.add('missing-attempt-endpoint');
  const drops = shownDecisions.filter(row => row.format === 'nodeflow.filter' && row.outcome === 'drop' &&
    row.inputs.some(packet => descendants.has(packet.packetId)));
  if (drops.some(drop => !shownDecisions.some(row => row.format === 'nodeflow.decision' &&
    row.outcome === 'drop' && attemptKey(row) === attemptKey(drop)))) gaps.add('reason-undeclared');
  if (subject.kind === 'input' && !drops.length && !shownTransfers.some(row => isOutput(row) && descendants.has(row.packet.packetId))) gaps.add('disposition-unknown');
  const coverage = gaps.size ? 'partial' : 'complete-for-recorded-scope';
  if (shownTransfers.some(row => !row.capture)) gaps.add('capture-off');
  if (shownTransfers.some(row => row.capture?.state === 'truncated')) gaps.add('oversize');
  if (evidence.identity.status === 'unverified') gaps.add('identity-unverified');
  return { ok: true, explanation: { version: 1, runId: evidence.runId, subject, coverage, nodes: retained, links, gaps: [...gaps] } };
}
