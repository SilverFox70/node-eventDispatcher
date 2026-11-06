import type { Json, PacketMetadata } from '../../packet.js';
import type { DiagnosticRecord } from '../../model/diagnostics/index.js';
import type { TestResult } from '../run-graph.js';
import type { ComparisonKind } from './compare.js';
import { FlowError } from '../../errors.js';

export type Series = { kind: ComparisonKind; origin: readonly string[]; values: Json[] };
type Transfer = Extract<DiagnosticRecord, { packet: PacketMetadata }>;

function transferOrigin(row: Transfer, node: string): string[] {
  if (row.kind === 'input-admitted') return ['input', row.inputName];
  return [row.kind, node, row.port];
}

export function observeComparison(result: TestResult, origins: ReadonlyMap<string, string>): ReadonlyMap<string, Series> {
  const diagnostics = result.diagnostics!, decisions = result.decisions!;
  if (diagnostics.dropped || decisions.dropped || decisions.rejected) throw new FlowError('INCOMPLETE_EVIDENCE');
  const series = new Map<string, Series>(), packets = new Map<string, Json>();
  function logical(node: string): string {
    const origin = origins.get(node);
    if (origin === undefined) throw new FlowError('INCOMPLETE_EVIDENCE');
    return origin;
  }
  function add(kind: ComparisonKind, origin: readonly string[], value: Json): void {
    const key = JSON.stringify([kind, origin]);
    if (!series.has(key)) series.set(key, { kind, origin, values: [] });
    const values = series.get(key)!.values;
    values.push(value);
  }
  function packetOrigin(id: string): Json {
    const origin = packets.get(id);
    if (!origin) throw new FlowError('INCOMPLETE_EVIDENCE');
    return origin;
  }
  for (const row of diagnostics.events) {
    if ('packet' in row) {
      const origin = transferOrigin(row, logical(row.nodeId));
      if (!packets.has(row.packet.packetId)) {
        const occurrence = series.get(JSON.stringify(['path', origin]))?.values.length ?? 0;
        packets.set(row.packet.packetId, [origin, occurrence]);
      }
      add('path', origin, { packet: packetOrigin(row.packet.packetId),
        parents: row.packet.parentPacketIds.map(packetOrigin), key: row.packet.key ?? null });
    } else if (row.kind === 'attempt-finished' && row.outcome !== 'succeeded') {
      add('failure', [logical(row.nodeId), 'attempt'], { outcome: row.outcome, code: row.code, attempt: row.attempt });
    } else if (row.kind === 'run-terminal' && row.status !== 'completed') {
      add('failure', ['run'], { status: row.status, code: row.code, node: row.nodeId ? logical(row.nodeId) : null });
    }
  }
  for (const row of decisions.events) {
    const inputs = row.inputs.map(packet => packetOrigin(packet.packetId));
    const detail = row.format === 'nodeflow.decision' ? {
      code: row.code, ruleVersion: row.ruleVersion,
      facts: row.facts.map(fact => ({ name: fact.name, path: fact.fieldPath ?? null,
        source: fact.sourcePacketId ? packetOrigin(fact.sourcePacketId) : null })),
    } : {};
    add('decision', [logical(row.nodeId)], { ...detail, format: row.format, outcome: row.outcome, attempt: row.attempt, inputs } as Json);
  }
  for (const [port, outputs] of Object.entries(result.outputs)) {
    for (const packet of outputs) add('output', [port], { value: packet.value, key: packet.key ?? null, origin: packetOrigin(packet.packetId) });
  }
  return series;
}
