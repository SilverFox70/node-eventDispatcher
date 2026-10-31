import type { Component } from '../component.js';
import { defineComponent } from '../component.js';
import type { Contract } from '../contracts.js';
import type { Json } from '../packet.js';
import { derivePacket } from '../packet.js';
import { namedPorts } from './shared/named-ports.js';

/** Await each declared branch in order; partial delivery is never rolled back or replayed. */
export function broadcast<T extends Json, const N extends readonly string[]>(input: Contract<T>, names: N) {
  const captured = namedPorts(input, names);
  const outputs: Readonly<Record<string, Contract<T>>> = captured.ports;
  const order = captured.order;
  return defineComponent({
    id: 'broadcast', version: 1, title: 'Broadcast', description: 'Explicit bounded fan-out', in: { in: input }, out: outputs,
    create: () => async ctx => {
      for await (const packet of ctx.inputs.in) {
        for (const name of order) await ctx.send(name, derivePacket(packet.value, [packet]));
      }
    }
  }) as Component<{ in: Contract<T> }, { readonly [K in N[number]]: Contract<T> }>;
}
