import { createHash } from 'node:crypto';
import { admitPacket, FlowError } from 'event-driven-design';
import type { Packet } from 'event-driven-design';
import { canonicalJson } from 'event-driven-design/model';
import { readDurableProfilePin } from '../model/index.js';
import type { DurableProfilePin } from '../model/index.js';

export type Submission = Readonly<{
  jobId: string;
  revisionId: string;
  profilePin: DurableProfilePin;
  inputs: Readonly<Record<string, readonly Packet[]>>;
}>;

export type StagedRun = Readonly<{ runId: string; created: boolean }>;

const limit = 10 * 1024 * 1024;
export const validIdentifier = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);

export function prepareSubmission(value: Submission) {
  try {
    const row = JSON.parse(canonicalJson(value, limit)) as Submission;
    const { jobId, revisionId, inputs } = row;
    if (Object.keys(row).length !== 4 || !validIdentifier(jobId) || !validIdentifier(revisionId) ||
        !inputs || typeof inputs !== 'object' || Array.isArray(inputs)) throw Error();
    const pin = readDurableProfilePin(row.profilePin);
    const ports = Object.entries(inputs);
    if (ports.length > 4096) throw Error();
    const seen = new Set<string>();
    for (const [port, packets] of ports) {
      if (port.length === 0 || port.length > 128 || !Array.isArray(packets)) throw Error();
      for (const candidate of packets) {
        const packet = admitPacket(candidate);
        if (packet.jobId !== jobId || seen.has(packet.packetId) || seen.size >= 4096) throw Error();
        seen.add(packet.packetId);
      }
    }
    const inputJson = canonicalJson(inputs, limit);
    const fingerprint = createHash('sha256').update(canonicalJson({
      format: 'nodeflow.submission', version: 1, revisionId, profilePin: pin, inputs,
    })).digest('hex');
    return { jobId, revisionId, pin, inputJson, fingerprint };
  } catch {
    throw new FlowError('INVALID_SUBMISSION');
  }
}
