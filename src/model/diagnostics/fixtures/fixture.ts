import type { Json } from '../../../packet.js';
import type { DecisionOutcome } from '../decisions.js';
import { decisionIdentifier, decisionOutcomes } from '../decisions.js';
import { digestPattern } from '../causal/evidence.js';
import { assertJsonMetadata, metadataRecord, metadataArray } from '../../contracts.js';
import { ensure, keys, integer, name as isName, uuid } from '../packet.js';
import type { ValidationResult } from '../../contracts.js';

export const fixtureCaseId = /^[a-z0-9][a-z0-9_-]{0,63}$/;
export type FixturePacket = Readonly<{ value: Json; key?: string }>;
export type FixturePorts = Readonly<Record<string, readonly FixturePacket[]>>;
export type FixtureStep = Readonly<{ outcome: 'result'; value: Json } | { outcome: 'error'; code: string }>;
export type FixtureDecision = Readonly<{ nodeId: string; code: string; ruleVersion: string; outcome: DecisionOutcome }>;
export type RegressionFixture = Readonly<{
  format: 'nodeflow.fixture'; version: 1; caseId: string; executionIdentity: string;
  input: FixturePorts;
  dependencyScripts: Readonly<Record<string, readonly FixtureStep[]>>;
  expected: Readonly<{ outputs: FixturePorts; decisions: readonly FixtureDecision[] }>;
  redactionReview: Readonly<{ reviewId: string; substitutions: readonly string[] }>;
  provenance: Readonly<{ runId: string; inputSequences: readonly number[]; outputSequences: readonly number[] }>;
}>;

const fieldName = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const sensitiveName = /^(?:password|passwd|secret|credentials?|authorization|api[-_]?key|access[-_]?token|refresh[-_]?token)$/i;
const sensitiveValue = /-----BEGIN [A-Z ]*PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~+/-]{8,}|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|sk-(?:proj-)?[A-Za-z0-9_-]{20,})/i;
const unresolved = /\{\{[^{}]+\}\}|^\s*(?:\[redacted\]|<redacted>|<replace-me>)\s*$/i;

/** Refuse common credential shapes and placeholders in addition to the host's review. */
function checkReviewedValue(value: unknown): void {
  if (typeof value === 'string') {
    ensure(!sensitiveValue.test(value) && !unresolved.test(value));
  } else if (Array.isArray(value)) {
    value.forEach(checkReviewedValue);
  } else if (value && typeof value === 'object') {
    for (const [name, item] of Object.entries(value)) {
      ensure(!sensitiveName.test(name));
      checkReviewedValue(item);
    }
  }
}

function checkPorts(value: unknown): number {
  const ports = metadataRecord(value);
  let total = 0;
  for (const [name, stream] of Object.entries(ports)) {
    ensure(isName(name));
    const packets = metadataArray(stream);
    total += packets.length;
    ensure(total <= 64);
    for (const item of packets) {
      const packet = metadataRecord(item);
      keys(packet, ['value'], ['key']);
      if (Object.hasOwn(packet, 'key')) ensure(typeof packet.key === 'string' && [...packet.key].length >= 1 && [...packet.key].length <= 128);
    }
  }
  return total;
}

function checkSequences(value: unknown, count: number): void {
  const entries = metadataArray(value);
  ensure(entries.length === count && new Set(entries).size === entries.length && entries.every(item => integer(item) && (item as number) > 0));
}

export function validateRegressionFixture(value: unknown): ValidationResult {
  try {
    assertJsonMetadata(value);
    const fixture = metadataRecord(value);
    keys(fixture, ['format', 'version', 'caseId', 'executionIdentity', 'input', 'dependencyScripts', 'expected', 'redactionReview', 'provenance']);
    ensure(fixture.format === 'nodeflow.fixture' && fixture.version === 1 && typeof fixture.caseId === 'string' && fixtureCaseId.test(fixture.caseId) &&
      typeof fixture.executionIdentity === 'string' && digestPattern.test(fixture.executionIdentity));
    const inputCount = checkPorts(fixture.input);
    ensure(inputCount > 0);
    const scripts = metadataRecord(fixture.dependencyScripts);
    ensure(Object.keys(scripts).length <= 32);
    for (const [role, script] of Object.entries(scripts)) {
      const steps = metadataArray(script);
      ensure(fieldName.test(role) && steps.length <= 64);
      for (const step of steps) {
        const fields = metadataRecord(step);
        if (fields.outcome === 'result') keys(fields, ['outcome', 'value']);
        else {
          keys(fields, ['outcome', 'code']);
          ensure(fields.outcome === 'error' && decisionIdentifier(fields.code));
        }
      }
    }
    const expected = metadataRecord(fixture.expected);
    keys(expected, ['outputs', 'decisions']);
    const outputCount = checkPorts(expected.outputs);
    const decisions = metadataArray(expected.decisions);
    ensure(decisions.length <= 64);
    for (const decision of decisions) {
      const fields = metadataRecord(decision);
      keys(fields, ['nodeId', 'code', 'ruleVersion', 'outcome']);
      ensure(decisionIdentifier(fields.nodeId) && decisionIdentifier(fields.code) &&
        decisionIdentifier(fields.ruleVersion) && decisionOutcomes.includes(fields.outcome as DecisionOutcome));
    }
    const review = metadataRecord(fixture.redactionReview), provenance = metadataRecord(fixture.provenance);
    keys(review, ['reviewId', 'substitutions']); keys(provenance, ['runId', 'inputSequences', 'outputSequences']);
    ensure(decisionIdentifier(review.reviewId) && uuid(provenance.runId));
    const substitutions = metadataArray(review.substitutions);
    ensure(substitutions.length <= 128 && new Set(substitutions).size === substitutions.length);
    for (const path of substitutions) {
      ensure(typeof path === 'string' && path.length <= 256 && /^\/(?:input|expected|dependencyScripts)(?:\/(?:[^~/]|~[01])*)+$/.test(path));
      let current: unknown = fixture;
      for (const segment of path.slice(1).split('/')) {
        const key = segment.replace(/~1/g, '/').replace(/~0/g, '~');
        ensure(current && typeof current === 'object' && Object.hasOwn(current, key));
        current = (current as Record<string, unknown>)[key];
      }
    }
    checkSequences(provenance.inputSequences, inputCount);
    checkSequences(provenance.outputSequences, outputCount);
    checkReviewedValue(value);
    ensure(new TextEncoder().encode(JSON.stringify(value)).length <= 262144);
    return { ok: true };
  } catch { return { ok: false, issues: [{ code: 'INVALID_FIXTURE', path: '$' }] }; }
}
