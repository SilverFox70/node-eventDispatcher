import { z } from 'zod';
import { contract, jsonContract, defineComponent, packet } from 'event-driven-design';
import type { Contract, ProcessContext } from 'event-driven-design';
const number = contract('number@1', z.number());
const string = contract('string@1', z.string());
const optional = contract('object@1', z.strictObject({ x: z.string().optional() }));
void optional;
// @ts-expect-error Contracts are invariant, not writable unions.
const widened: Contract<number | string> = number;
void widened;
// @ts-expect-error Unsupported non-JSON output types cannot be authored.
contract('date@1', z.date());
const component = defineComponent({ id: 'double', version: 1, title: 'Double', description: '',
  in: { input: number }, out: { total: number, label: string, raw: jsonContract },
  create: () => async ctx => {
    for await (const input of ctx.inputs.input) {
      await ctx.send('total', packet(input.value * 2));
      await ctx.send('label', packet('ok'));
      // @ts-expect-error Unknown output ports are rejected.
      await ctx.send('missing', packet(2));
      // @ts-expect-error Payload cannot widen the inferred port to a union.
      await ctx.send('total', packet('wrong'));
      // @ts-expect-error Input values have the schema's numeric type.
      input.value.toUpperCase();
      // @ts-expect-error Input port names are exact.
      void ctx.inputs.missing;
    }
  }
});

declare const ctx: ProcessContext<typeof component.in, typeof component.out>;
void component.create()(ctx);
// @ts-expect-error Component port names remain literal after definition.
void component.in.missing;
// @ts-expect-error Output maps cannot widen to arbitrary string keys.
void component.out.missing;
