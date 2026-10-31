import { defineComponent } from '../component.js';
import type { Contract } from '../contracts.js';
import type { FunctionContext } from '../function.js';
import type { Json } from '../packet.js';
import { FlowError } from '../errors.js';

/** True forwards the original envelope; false intentionally consumes it. */
export function filter<T extends Json>(input: Contract<T>, predicate: (value: Readonly<NoInfer<T>>, context: FunctionContext) => boolean | Promise<boolean>) {
  if (typeof predicate !== 'function') throw new FlowError('INVALID_ARGUMENT');
  return defineComponent({
    id: 'filter', version: 1, title: 'Filter', description: 'Serial predicate routing', in: { in: input }, out: { out: input },
    create: () => async ctx => {
      for await (const packet of ctx.inputs.in) {
        const { value, ...metadata } = packet;
        const keep = await ctx.task(attempt => predicate(value, Object.freeze({ ...attempt, packet: Object.freeze(metadata) })));
        if (typeof keep !== 'boolean') throw new FlowError('OUTPUT_CONTRACT');
        if (keep) await ctx.send('out', packet);
      }
    }
  });
}
