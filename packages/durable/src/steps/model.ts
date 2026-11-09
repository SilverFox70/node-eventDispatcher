import { createHash } from 'node:crypto';
import { admitPacket, FlowError } from 'event-driven-design';
import type { Contract, Json, Packet } from 'event-driven-design';
import { canonicalJson } from 'event-driven-design/model';
import { profileDefinition } from '../profile/definition.js';
import type { prepareDurableProfile } from '../profile/index.js';
import { joinRefusals } from '../operators/join/refusals.js';
import { validIdentifier } from '../submission/input.js';

export type StepScope = Readonly<{ workspaceId: string; runId: string }>;
export type DurableProfile = ReturnType<typeof prepareDurableProfile>;
export type ReadyStep = Readonly<{ stepId: string; nodeId: string; epoch: number; input: Packet }>;
export type StepClaim = Readonly<ReadyStep & { workerId: string; leaseExpiresAt: string; remainingMs: number | null; inputPort: string }>;
export type ClaimOptions = Readonly<{ workerId: string; leaseMs: number; limit: number; external?: true }>;
export type ClaimIdentity = Pick<StepClaim, 'stepId' | 'workerId' | 'epoch'>;

export type StepResult = Readonly<{ kind: 'computed'; packet: Packet } |
  { kind: 'failed'; code: 'OUTPUT_CONTRACT' | 'COMPONENT_FAILED' | 'NODE_TIMEOUT' | 'TIMEOUT' | 'CANCELLED' | typeof joinRefusals[number] }>;
export type StepCommit = Readonly<{ stepId: string; epoch: number; workerId: string; commitKey: string; result: StepResult }>;
export type CommittedStep = Readonly<{
  outcomeId: string; outputPacketId: string | null; failureCode: string | null; successorId: string | null;
}>;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const failureCodes = new Set(['OUTPUT_CONTRACT', 'COMPONENT_FAILED', 'NODE_TIMEOUT', 'TIMEOUT', 'CANCELLED', ...joinRefusals]);
const limit = 10 * 1024 * 1024;
export const serialize = (value: unknown) => canonicalJson(value, limit);

export function checkScope(scope: StepScope, id = scope.runId): StepScope {
  const { workspaceId, runId } = scope;
  if (!validIdentifier(workspaceId) || !uuid.test(runId) || !uuid.test(id)) throw new FlowError('INVALID_STEP_SCOPE');
  return { workspaceId, runId };
}

export function readCommit(command: StepCommit): StepCommit {
  const value = JSON.parse(serialize(command)) as StepCommit;
  if (!value || Object.keys(value).length !== 5 || !uuid.test(value.stepId) || !validIdentifier(value.workerId) || !validIdentifier(value.commitKey) || !Number.isInteger(value.epoch) ||
      value.epoch < 1 || value.epoch > 2147483647) throw new FlowError('INVALID_STEP_COMMIT');
  if (!value.result || Object.keys(value.result).length !== 2) throw new FlowError('INVALID_STEP_COMMIT');
  if (value.result.kind === 'computed') admitPacket(value.result.packet);
  else if (value.result.kind !== 'failed' || !failureCodes.has(value.result.code)) throw new FlowError('INVALID_STEP_COMMIT');
  return value;
}

export function checkPin(profile: DurableProfile, execution: string, adapter: string) {
  const definition = profileDefinition(profile);
  if (profile.pin.executionDigest !== execution || profile.pin.adapterDigest !== adapter) throw new FlowError('VERSION_UNAVAILABLE');
  return definition;
}

export function contractAt(definition: ReturnType<typeof profileDefinition>, nodeId: string, side: 'in' | 'out', port: string = side) {
  const node = definition.spec.nodes.find(node => node.id === nodeId);
  return definition.registry[node!.component]![side][port] as Contract<Json>;
}

export function interpretResult(definition: ReturnType<typeof profileDefinition>, nodeId: string, input: Packet, result: StepResult) {
  const fingerprint = createHash('sha256').update(serialize(result)).digest('hex');
  if (result.kind === 'failed') return { fingerprint, packet: null, failureCode: result.code };
  const output = admitPacket(result.packet);
  if (output.jobId !== input.jobId || output.key !== input.key || output.parentPacketIds.length !== 1 ||
      output.parentPacketIds[0] !== input.packetId) throw new FlowError('STEP_LINEAGE_MISMATCH');
  if (!contractAt(definition, nodeId, 'out').validate(output.value)) {
    return { fingerprint, packet: null, failureCode: 'OUTPUT_CONTRACT' };
  }
  return { fingerprint, packet: output, failureCode: null };
}

export function claimBudget(definition: ReturnType<typeof profileDefinition>, nodeId: string): number {
  return 1 + (definition.spec.nodes.find(node => node.id === nodeId)?.retry?.maxRetries ?? 0);
}
