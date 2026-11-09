import { defineComponent, defineConfiguredComponent } from './component.js';
import type { Component, ConfiguredComponent, ProcessContext, RegistryComponent } from './component.js';
import type { Contract } from './contracts.js';
import type { Json, PacketMetadata } from './packet.js';
import { derivePacket } from './packet.js';
import type { TaskContext } from './runtime/tasks.js';
import { validateProcessOutput } from './runtime/context-validation.js';
import { FlowError } from './errors.js';
import { readRecord } from './packet/data.js';
import type { DecisionDeclaration } from './model/diagnostics/decisions.js';

export type FunctionContext = TaskContext & Readonly<{ packet: PacketMetadata }>;
type FunctionHandler<I extends Json, O extends Json> =
  (value: Readonly<NoInfer<I>>, context: FunctionContext) => NoInfer<O> | Promise<NoInfer<O>>;
type Input<I extends Json> = { in: Contract<I> };
type Output<O extends Json> = { out: Contract<O> };

export type FunctionSpec<I extends Json, O extends Json> = Readonly<{
  id: string; version: number; title: string; description: string;
  input: Contract<I>; output: Contract<O>; decisions?: readonly DecisionDeclaration[];
  handler: FunctionHandler<I, O>;
}>;
export type ConfiguredFunctionSpec<C extends Json, I extends Json, O extends Json> =
  Omit<FunctionSpec<I, O>, 'handler'> & Readonly<{
    configuration: Contract<C>;
    handler: (value: Readonly<NoInfer<I>>, configuration: Readonly<NoInfer<C>>,
      context: FunctionContext) => NoInfer<O> | Promise<NoInfer<O>>;
  }>;

const boundedFunctions = new WeakSet<RegistryComponent>();
const fields = ['id', 'version', 'title', 'description', 'input', 'output', 'handler', 'decisions'];

function checkSpec(spec: unknown, allowed: readonly string[]) {
  const record = readRecord(spec, 'INVALID_ARGUMENT');
  if (Object.keys(record).some(key => !allowed.includes(key)) ||
      typeof record.handler !== 'function') throw new FlowError('INVALID_ARGUMENT');
  return record;
}

function processFor<I extends Json, O extends Json>(handler: FunctionHandler<I, O>) {
  return async (ctx: ProcessContext<Input<I>, Output<O>>) => {
    for await (const packet of ctx.inputs.in) {
      const { value: inputValue, ...fields } = packet;
      const metadata = Object.freeze(fields);
      const value = await ctx.task(attempt => handler(inputValue, Object.freeze({ ...attempt, packet: metadata })), { inputs: [packet] });
      validateProcessOutput(ctx, 'out', value);
      await ctx.send('out', derivePacket(value, [packet]));
    }
  };
}

/** One handler operation per packet; the runtime owns deadlines, attempts and cancellation. */
export function defineFunction<I extends Json, O extends Json>(spec: FunctionSpec<I, O>): Component<Input<I>, Output<O>> {
  const record = checkSpec(spec, fields);
  const { id, version, title, description, input, output, handler } = spec;
  const component = defineComponent({
    id, version, title, description, ...(Object.hasOwn(record, 'decisions') ? { decisions: spec.decisions! } : {}),
    in: { in: input }, out: { out: output }, create: () => processFor<I, O>(handler),
  });
  boundedFunctions.add(component);
  return component;
}

/** The graph compiler validates configuration before a configured function can process packets. */
export function defineConfiguredFunction<C extends Json, I extends Json, O extends Json>(
  spec: ConfiguredFunctionSpec<C, I, O>,
): ConfiguredComponent<C, Input<I>, Output<O>> {
  const record = checkSpec(spec, [...fields, 'configuration']);
  const { id, version, title, description, configuration, input, output, handler } = spec;
  const component = defineConfiguredComponent({
    id, version, title, description, configuration,
    ...(Object.hasOwn(record, 'decisions') ? { decisions: spec.decisions! } : {}),
    in: { in: input }, out: { out: output },
    create: config => processFor<I, O>((value, context) => handler(value, config, context)),
  });
  boundedFunctions.add(component);
  return component;
}

/** Only the component returned by a bounded function constructor carries this identity. */
export function isBoundedFunction(component: RegistryComponent): boolean {
  return boundedFunctions.has(component);
}
