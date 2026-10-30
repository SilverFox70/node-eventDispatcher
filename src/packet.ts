import { randomUUID } from 'node:crypto';
import { FlowError } from './errors.js';
import { copyJson } from './packet/json.js';
import { readArray, readRecord } from './packet/data.js';
import { readOptions, readParentIds, validJob, validKey, validUuid } from './packet/metadata.js';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type PacketMetadata = Readonly<{
  version: 1;
  packetId: string;
  jobId: string;
  parentPacketIds: readonly string[];
  key?: string;
}>;
export type Packet<T = Json> = Readonly<PacketMetadata & { value: T }>;
export type PacketOptions = Readonly<{ jobId?: string; key?: string }>;
export type DeriveOptions = Readonly<{ key?: string }>;

/** A new JSON root; identities are allocated only after validation succeeds. */
export function packet<T extends Json>(value: T, options: PacketOptions = {}): Packet<T> {
  const checked = readOptions(options, true);
  const copied = copyJson(value) as T;
  return Object.freeze({
    version: 1, packetId: randomUUID(), jobId: checked.jobId ?? randomUUID(),
    parentPacketIds: Object.freeze([]), ...checked, value: copied
  });
}

/** Validate/copy a serialized envelope without rewriting its identity. */
export function admitPacket<T extends Json>(input: Packet<T>): Packet<T>;
export function admitPacket(input: unknown): Packet;
export function admitPacket(input: unknown): Packet {
  const fields = readRecord(input, 'INVALID_PACKET');
  const required = ['version', 'packetId', 'jobId', 'parentPacketIds', 'value'];
  if (required.some(key => !Object.hasOwn(fields, key)) ||
    Object.keys(fields).some(key => !required.includes(key) && key !== 'key')) {
    throw new FlowError('INVALID_PACKET', 'Invalid packet fields');
  }
  if (fields.version !== 1 || !validUuid(fields.packetId) || !validJob(fields.jobId)) {
    throw new FlowError('INVALID_PACKET', 'Invalid packet metadata');
  }
  const parents = readParentIds(fields.parentPacketIds, fields.packetId);
  const key: { key?: string } = {};
  if (Object.hasOwn(fields, 'key')) {
    if (!validKey(fields.key)) throw new FlowError('INVALID_PACKET', 'Invalid packet key');
    key.key = fields.key;
  }
  return Object.freeze({
    version: 1, packetId: fields.packetId, jobId: fields.jobId,
    parentPacketIds: parents, ...key, value: copyJson(fields.value)
  });
}

/** Derive a new immutable result from ordered, same-job immediate parents. */
export function derivePacket<T extends Json>(
  value: T, parents: readonly Packet[], options: DeriveOptions = {}
): Packet<T> {
  const checked = readOptions(options, false);
  const collection = readArray(parents, 'INVALID_LINEAGE', 256);
  if (collection.length === 0) {
    throw new FlowError('INVALID_LINEAGE', 'Expected 1–256 parents');
  }
  const admitted = collection.map(parent => {
    const checkedParent = admitPacket(parent);
    // Keep only validated metadata rather than retaining every cloned parent payload.
    return { packetId: checkedParent.packetId, jobId: checkedParent.jobId, key: checkedParent.key };
  });
  const ids = admitted.map(parent => parent.packetId);
  if (new Set(ids).size !== ids.length) throw new FlowError('INVALID_LINEAGE', 'Duplicate parents');
  // The validated, nonempty collection guarantees a first packet.
  const first = admitted[0]!;
  if (admitted.some(parent => parent.jobId !== first.jobId)) {
    throw new FlowError('JOB_MISMATCH', 'Parents belong to different jobs');
  }
  if (!Object.hasOwn(checked, 'key') && admitted.some(parent => parent.key !== first.key)) {
    throw new FlowError('CORRELATION_MISMATCH', 'Parent keys differ');
  }
  const key = checked.key ?? first.key;
  const copied = copyJson(value) as T;
  const id = randomUUID();
  if (ids.includes(id)) throw new FlowError('INVALID_LINEAGE', 'Generated self-parent identity');
  return Object.freeze({
    version: 1, packetId: id, jobId: first.jobId,
    parentPacketIds: Object.freeze(ids), ...(key === undefined ? {} : { key }), value: copied
  });
}
