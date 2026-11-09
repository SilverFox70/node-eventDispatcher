import type { Packet } from '../../packet.js';

export function joinValue(names: readonly string[], parents: readonly Packet[]) {
  return Object.fromEntries(names.map((port, index) => [port, parents[index]!.value]));
}
