import type { PacketMetadata } from '../../packet.js';
import { assertJsonMetadata, metadataRecord, metadataArray } from '../contracts.js';
import type { ValidationResult } from '../contracts.js';
import { ensure, keys, uuid, integer, time, name, checkInputs } from './packet.js';
export const decisionOutcomes = ['keep', 'drop', 'route', 'wait', 'business-result'] as const;
export type DecisionOutcome = typeof decisionOutcomes[number];
export type DecisionDeclaration = Readonly<{ code: string; ruleVersion: string; outcomes: readonly DecisionOutcome[]; facts: readonly string[] }>;
export type DecisionFact = Readonly<{ name: string; sourcePacketId?: string; fieldPath?: string }>;
export type DecisionRequest = Readonly<{ code: string; ruleVersion: string; outcome: DecisionOutcome; facts: readonly DecisionFact[] }>;
type Correlation = Readonly<{ version: 1; runId: string; sequence: number; timeMs: number; nodeId: string;
  operationId: string; attemptId: string; attempt: number; inputs: readonly PacketMetadata[] }>;
export type DecisionRecord = Correlation & (Readonly<{ format: 'nodeflow.decision' }> & DecisionRequest |
  Readonly<{ format: 'nodeflow.filter'; outcome: 'keep' | 'drop' }>);
export type DecisionSnapshot = Readonly<{ format: 'nodeflow.decisions'; version: 1; runId: string; total: number;
  dropped: number; rejected: number; events: readonly DecisionRecord[] }>;
export type DecisionCatalog = Readonly<{ format: 'nodeflow.decision-catalog'; version: 1;
  components: readonly Readonly<{ component: string; decisions: readonly DecisionDeclaration[] }>[] }>;
export const decisionIdentifier = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/.test(value);
export function checkDeclarations(value: unknown): void {
  const declarations = metadataArray(value); ensure(declarations.length <= 32);
  const seen = new Set<string>();
  for (const item of declarations) {
    const declaration = metadataRecord(item); keys(declaration, ['code', 'ruleVersion', 'outcomes', 'facts']);
    ensure(decisionIdentifier(declaration.code) && decisionIdentifier(declaration.ruleVersion));
    const identity = JSON.stringify([declaration.code, declaration.ruleVersion]); ensure(!seen.has(identity)); seen.add(identity);
    const outcomes = metadataArray(declaration.outcomes), facts = metadataArray(declaration.facts);
    ensure(outcomes.length > 0 && outcomes.length <= 5 && new Set(outcomes).size === outcomes.length && outcomes.every(outcome => decisionOutcomes.includes(outcome as DecisionOutcome)));
    ensure(facts.length <= 16 && new Set(facts).size === facts.length && facts.every(decisionIdentifier));
  }
}
export function checkDecisionRequest(value: unknown): void {
  const fields = metadataRecord(value); keys(fields, ['code', 'ruleVersion', 'outcome', 'facts']);
  ensure(decisionIdentifier(fields.code) && decisionIdentifier(fields.ruleVersion) && decisionOutcomes.includes(fields.outcome as DecisionOutcome));
  const facts = metadataArray(fields.facts); ensure(facts.length <= 16); const names = new Set<string>();
  for (const item of facts) {
    const fact = metadataRecord(item); keys(fact, ['name'], ['sourcePacketId', 'fieldPath']);
    ensure(decisionIdentifier(fact.name) && !names.has(fact.name as string)); names.add(fact.name as string);
    if (Object.hasOwn(fact, 'sourcePacketId')) ensure(uuid(fact.sourcePacketId));
    if (Object.hasOwn(fact, 'fieldPath')) ensure(Object.hasOwn(fact, 'sourcePacketId') && typeof fact.fieldPath === 'string' &&
      fact.fieldPath.length <= 256 && /^(?:\/(?:[^~/]|~[01])*)*$/.test(fact.fieldPath));
  }
}
export function validateDecisionCatalog(value: unknown): ValidationResult {
  try {
    assertJsonMetadata(value); const fields = metadataRecord(value); keys(fields, ['format', 'version', 'components']);
    ensure(fields.format === 'nodeflow.decision-catalog' && fields.version === 1);
    const components = metadataArray(fields.components); ensure(components.length <= 1024); const seen = new Set<string>();
    for (const item of components) {
      const row = metadataRecord(item); keys(row, ['component', 'decisions']);
      ensure(typeof row.component === 'string'); const at = row.component.lastIndexOf('@');
      ensure(name(row.component.slice(0, at)) && /^[1-9][0-9]*$/.test(row.component.slice(at + 1)) && Number.isSafeInteger(Number(row.component.slice(at + 1))) && !seen.has(row.component));
      seen.add(row.component); checkDeclarations(row.decisions);
    }
    return { ok: true };
  } catch { return { ok: false, issues: [{ code: 'INVALID_DECISION_CATALOG', path: '$' }] }; }
}
export function validateDecisions(value: unknown): ValidationResult {
  try {
    assertJsonMetadata(value); const fields = metadataRecord(value); keys(fields, ['format', 'version', 'runId', 'total', 'dropped', 'rejected', 'events']);
    ensure(fields.format === 'nodeflow.decisions' && fields.version === 1 && uuid(fields.runId) && integer(fields.total) && integer(fields.dropped) && integer(fields.rejected));
    const events = metadataArray(fields.events); ensure(events.length <= 1024 && fields.total === (fields.dropped as number) + events.length);
    let previous = 0;
    for (const [index, item] of events.entries()) {
      const row = metadataRecord(item), base = ['format', 'version', 'runId', 'sequence', 'timeMs', 'nodeId', 'operationId', 'attemptId', 'attempt', 'inputs', 'outcome'];
      const reported = row.format === 'nodeflow.decision';
      ensure(reported || row.format === 'nodeflow.filter'); keys(row, reported ? [...base, 'code', 'ruleVersion', 'facts'] : base);
      ensure(row.version === 1 && row.runId === fields.runId && row.sequence === (fields.dropped as number) + index + 1 && time(row.timeMs) && (row.timeMs as number) >= previous &&
        name(row.nodeId) && uuid(row.operationId) && uuid(row.attemptId) && integer(row.attempt) && (row.attempt as number) >= 1);
      checkInputs(row.inputs);
      if (reported) {
        checkDecisionRequest({ code: row.code, ruleVersion: row.ruleVersion, outcome: row.outcome, facts: row.facts });
        const ids = metadataArray(row.inputs).map(input => metadataRecord(input).packetId);
        ensure(metadataArray(row.facts).every(fact => !Object.hasOwn(metadataRecord(fact), 'sourcePacketId') || ids.includes(metadataRecord(fact).sourcePacketId)));
      } else ensure(row.outcome === 'keep' || row.outcome === 'drop');
      previous = row.timeMs as number;
    }
    return { ok: true };
  } catch { return { ok: false, issues: [{ code: 'INVALID_DECISION', path: '$' }] }; }
}
