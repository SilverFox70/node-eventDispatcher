import { defineComponent } from './component.js';
import type { Component } from './component.js';
import type { Contract } from './contracts.js';
import type { Json, PacketMetadata } from './packet.js';
import { derivePacket } from './packet.js';
import type { TaskContext } from './runtime/tasks.js';
import { validateProcessOutput } from './runtime/context-validation.js';
import { FlowError } from './errors.js';
import { readRecord } from './packet/data.js';

export type FunctionContext = TaskContext & Readonly<{ packet: PacketMetadata }>;
export type FunctionSpec<I extends Json, O extends Json> = Readonly<{
  id: string; version: number; title: string; description: string;
  input: Contract<I>; output: Contract<O>;
  handler: (value: Readonly<NoInfer<I>>, context: FunctionContext) => NoInfer<O> | Promise<NoInfer<O>>;
}>;

/** One handler operation per packet; the runtime owns deadlines, attempts and cancellation. */
export function defineFunction<I extends Json, O extends Json>(spec: FunctionSpec<I, O>): Component<{ in: Contract<I> }, { out: Contract<O> }> {
  const fields = readRecord(spec, 'INVALID_ARGUMENT');
  if (Object.keys(fields).some(key => !['id', 'version', 'title', 'description', 'input', 'output', 'handler'].includes(key)) ||
    typeof fields.handler !== 'function') throw new FlowError('INVALID_ARGUMENT');
  const { id, version, title, description, input, output, handler } = spec;
  return defineComponent({
    id, version, title, description, in: { in: input }, out: { out: output },
    create: () => async ctx => {
      for await (const packet of ctx.inputs.in) {
        const { value: inputValue, ...fields } = packet;
        const metadata = Object.freeze(fields);
        const value = await ctx.task(attempt => handler(inputValue, Object.freeze({ ...attempt, packet: metadata })));
        validateProcessOutput(ctx, 'out', value);
        await ctx.send('out', derivePacket(value, [packet]));
      }
    },
  });
}
