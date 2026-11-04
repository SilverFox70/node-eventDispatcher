import type { Packet, PacketMetadata } from '../../packet.js';
import { readRecord, readArray } from '../../packet/data.js';
import { FlowError } from '../../errors.js';
import { packetMetadata } from './records.js';
export type TaskOptions = Readonly<{ inputs: readonly Packet[] }>;
/** Weak object identity proves actual delivery to this node/run without retaining packet history. */
export function createProvenance() {
  const delivered = new WeakSet<Packet>();
  return {
    delivered(packet: Packet): void { delivered.add(packet); },
    inputs(options: unknown): readonly PacketMetadata[] {
      if (options === undefined) return Object.freeze([]);
      const fields = readRecord(options, 'INVALID_ARGUMENT');
      if (Object.keys(fields).length !== 1 || !Object.hasOwn(fields, 'inputs')) throw new FlowError('INVALID_ARGUMENT');
      const inputs = readArray(fields.inputs, 'INVALID_ARGUMENT', 256);
      if (inputs.length === 0) throw new FlowError('INVALID_ARGUMENT');
      const seen = new Set<unknown>();
      let jobId: string | undefined;
      return Object.freeze(inputs.map(value => {
        if (!delivered.has(value as Packet) || seen.has(value)) throw new FlowError('INVALID_ARGUMENT');
        const packet = value as Packet;
        if (jobId !== undefined && packet.jobId !== jobId) throw new FlowError('INVALID_ARGUMENT');
        seen.add(packet); jobId = packet.jobId;
        return packetMetadata(packet);
      }));
    },
  };
}
