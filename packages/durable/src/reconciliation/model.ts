import { FlowError } from 'event-driven-design';
import type { Json } from 'event-driven-design';
import { validIdentifier } from '../submission/input.js';
import { serialize } from '../steps/model.js';
import type { CommittedStep, StepScope } from '../steps/model.js';

export type ReconciliationBinding = Readonly<{
  operationId: string; provider: string; businessKey: string; resourceKey: string;
  resourceRevision: number; fingerprint: string; policyVersion: string;
}>;
export type ReconciliationCommand = Readonly<{
  operationId: string; stepId: string; actorId: string; commandKey: string;
  mode: 'lookup' | 'manual'; expectedRevision: number;
}>;
export type ReconciliationAdapter = Readonly<{
  provider: string;
  policyVersion: string;
  authorize(scope: StepScope, command: ReconciliationCommand): boolean;
  readEvidence(binding: ReconciliationBinding, command: ReconciliationCommand): Promise<unknown>;
}>;
export type ReconciliationEvidence = Readonly<{
  binding: ReconciliationBinding; evidenceRef: string;
} & ({ kind: 'succeeded'; value: Json } |
  { kind: 'inconclusive'; reason: 'ABSENT' | 'UNAVAILABLE' | 'PENDING'; reviewAfterMs: number })>;
export type ReconciliationResult = Readonly<
  { status: 'succeeded'; revision: number; receipt: CommittedStep } |
  { status: 'inconclusive'; revision: number; reason: string; nextReviewAt: string }>;

export function readCommand(input: ReconciliationCommand): ReconciliationCommand {
  const command = JSON.parse(serialize(input)) as ReconciliationCommand;
  if (!command || Object.keys(command).length !== 6 ||
      !validIdentifier(command.actorId) || !validIdentifier(command.commandKey) ||
      !['lookup', 'manual'].includes(command.mode) || !Number.isInteger(command.expectedRevision) ||
      command.expectedRevision < 0 || command.expectedRevision > 2147483647) {
    throw new FlowError('INVALID_RECONCILIATION_COMMAND');
  }
  return Object.freeze(command);
}

export function readEvidence(input: unknown, binding: ReconciliationBinding): ReconciliationEvidence {
  const value = JSON.parse(serialize(input)) as ReconciliationEvidence;
  if (!value || !Object.hasOwn(value, 'binding') || serialize(value.binding) !== serialize(binding) ||
      !validIdentifier(value.evidenceRef)) throw new FlowError('INVALID_PROVIDER_EVIDENCE');
  if (value.kind === 'succeeded' && Object.keys(value).length === 4 && Object.hasOwn(value, 'value')) return value;
  if (value.kind === 'inconclusive' && Object.keys(value).length === 5 &&
      ['ABSENT', 'UNAVAILABLE', 'PENDING'].includes(value.reason) && Number.isInteger(value.reviewAfterMs) &&
      value.reviewAfterMs >= 1 && value.reviewAfterMs <= 86400000) return value;
  throw new FlowError('INVALID_PROVIDER_EVIDENCE');
}
