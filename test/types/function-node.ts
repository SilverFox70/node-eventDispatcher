import { defineFunction, contract, type FunctionContext } from 'event-driven-design';
import { z } from 'zod';
const numeric = contract('numeric@1', z.number());
const legal = defineFunction({ id: 'double', version: 1, title: 'Double', description: '', input: numeric, output: numeric,
  handler(value, context: FunctionContext) {
    const id: string = context.attemptId; const attempt: number = context.attempt; void [id, attempt];
    // @ts-expect-error Identity is under ctx.packet, not a key alias.
    void context.key;
    // @ts-expect-error Function metadata excludes the payload.
    void context.packet.value;
    // @ts-expect-error Input metadata is immutable.
    context.packet.jobId = 'changed';
    return value * 2;
  } });
void legal.in.in; void legal.out.out;
// @ts-expect-error Literal ports remain exact.
void legal.out.missing;
defineFunction({ id: 'bad', version: 1, title: 'Bad', description: '', input: numeric, output: numeric,
  // @ts-expect-error Handler output cannot widen a numeric contract.
  handler: () => 'wrong' });
defineFunction({ id: 'async-bad', version: 1, title: 'Bad', description: '', input: numeric, output: numeric,
  // @ts-expect-error Async output is subject to the same numeric contract.
  handler: async () => 'wrong' });
const broad = contract('broad@1', z.union([z.number(), z.string()]));
defineFunction({ id: 'narrow-handler', version: 1, title: 'Narrow', description: '', input: broad, output: numeric,
  // @ts-expect-error A handler must accept every value allowed by its input contract.
  handler: (value: number) => value * 2 });
defineFunction({ id: 'broad-handler', version: 1, title: 'Broad', description: '', input: numeric, output: numeric,
  handler: (value: number | string) => typeof value === 'number' ? value * 2 : 0 });
