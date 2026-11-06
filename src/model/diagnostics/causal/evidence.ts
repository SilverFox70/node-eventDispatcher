import { assertJsonMetadata, metadataRecord } from '../../contracts.js';
import type { ValidationResult } from '../../contracts.js';
import { validateDiagnostics } from '../index.js';
import type { DiagnosticSnapshot } from '../index.js';
import { validateDecisions } from '../decisions.js';
import type { DecisionSnapshot } from '../decisions.js';
import { ensure, keys, uuid } from '../packet.js';

export type ExecutionIdentity = Readonly<{ status: 'unverified' } | { status: 'verified'; digest: string }>;
export type CausalEvidence = Readonly<{
  format: 'nodeflow.evidence'; version: 1; runId: string;
  diagnostics: DiagnosticSnapshot; decisions: DecisionSnapshot; identity: ExecutionIdentity;
}>;
export const digestPattern = /^[0-9a-f]{64}$/;

export function validateCausalEvidence(value: unknown): ValidationResult {
  try {
    assertJsonMetadata(value);
    const fields = metadataRecord(value);
    keys(fields, ['format', 'version', 'runId', 'diagnostics', 'decisions', 'identity']);
    ensure(fields.format === 'nodeflow.evidence' && fields.version === 1 && uuid(fields.runId));
    ensure(validateDiagnostics(fields.diagnostics).ok && validateDecisions(fields.decisions).ok);
    const diagnostics = fields.diagnostics as DiagnosticSnapshot, decisions = fields.decisions as DecisionSnapshot;
    ensure(diagnostics.runId === fields.runId && decisions.runId === fields.runId);
    ensure(diagnostics.events.length + decisions.events.length <= 1024);
    const identity = metadataRecord(fields.identity);
    if (identity.status === 'unverified') keys(identity, ['status']);
    else {
      keys(identity, ['status', 'digest']);
      ensure(identity.status === 'verified' && typeof identity.digest === 'string' && digestPattern.test(identity.digest));
    }
    const serialized = JSON.stringify(value);
    ensure(serialized.length <= 10485760 && new TextEncoder().encode(serialized).length <= 10485760);
    return { ok: true };
  } catch {
    return { ok: false, issues: [{ code: 'INVALID_CAUSAL_EVIDENCE', path: '$' }] };
  }
}
