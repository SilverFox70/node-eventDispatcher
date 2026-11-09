import { ok as assert } from 'node:assert/strict';
import { admitPacket, FlowError } from 'event-driven-design';
import type { Packet } from 'event-driven-design';
import { contractAt, serialize } from '../steps/model.js';
import type { ClaimIdentity, checkPin } from '../steps/model.js';

export type RoutingCommand = Readonly<ClaimIdentity & { outputs: Readonly<Record<string, readonly Packet[]>> }>;
export type RoutingStatus = 'pending' | 'committed';
export type Definition = ReturnType<typeof checkPin>;

export function validateOutputs(definition: Definition, nodeId: string, input: Packet, outputs: RoutingCommand['outputs']) {
  const node = definition.spec.nodes.find(node => node.id === nodeId)!;
  const component = definition.registry[node.component]!;
  const kind = definition.operators.get(node.component);
  const forward = kind === 'filter' || kind === 'merge';
  if (!outputs || Object.keys(outputs).length !== Object.keys(component.out).length) throw new FlowError('INVALID_DELIVERY');
  const packets: { port: string; packet: Packet }[] = [];
  const seen = new Set<string>();
  for (const port of Object.keys(component.out)) {
    const values = outputs[port];
    if (!Array.isArray(values) || values.length > 1 || (kind !== 'filter' && values.length !== 1)) {
      throw new FlowError('INVALID_DELIVERY');
    }
    for (const raw of values) {
      const packet = admitPacket(raw);
      if (seen.has(packet.packetId) || (forward ? serialize(packet) !== serialize(input) :
        packet.jobId !== input.jobId || packet.key !== input.key ||
        packet.parentPacketIds.length !== 1 || packet.parentPacketIds[0] !== input.packetId)) {
        throw new FlowError('INVALID_DELIVERY');
      }
      if (!contractAt(definition, nodeId, 'out', port).validate(packet.value)) throw new FlowError('OUTPUT_CONTRACT');
      const edge = definition.spec.edges.find(edge => edge.from.node === nodeId && edge.from.port === port);
      if (edge) assert(contractAt(definition, edge.to.node, 'in', edge.to.port).validate(packet.value),
        'Compiled edge must accept the validated source payload');
      seen.add(packet.packetId);
      packets.push({ port, packet });
    }
  }
  return packets;
}
