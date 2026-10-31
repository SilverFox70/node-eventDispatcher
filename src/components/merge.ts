import type { Component } from '../component.js';
import { defineComponent } from '../component.js';
import type { Contract } from '../contracts.js';
import type { Json } from '../packet.js';
import { namedPorts } from './shared/named-ports.js';

import { readyInputs } from './shared/ready-inputs.js';

/** One outstanding read per input; ready ties use declaration order, with no global FIFO. */
export function merge<T extends Json, const N extends readonly string[]>(input: Contract<T>, names: N) {
  const captured = namedPorts(input, names);
  const inputs: Readonly<Record<string, Contract<T>>> = captured.ports;
  const order = captured.order;
  return defineComponent({
    id: 'merge', version: 1, title: 'Merge', description: 'Bounded readiness-ordered fan-in', in: inputs, out: { out: input },
    create: () => async ctx => {
      for await (const { value } of readyInputs(ctx.inputs, order)) await ctx.send('out', value);
    }
  }) as unknown as Component<{ readonly [K in N[number]]: Contract<T> }, { out: Contract<T> }>;
}
