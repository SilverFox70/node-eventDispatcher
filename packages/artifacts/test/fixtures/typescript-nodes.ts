import { broadcast, contract, defineConfiguredComponent, derivePacket, joinByKey, map } from 'event-driven-design';
import { z } from 'zod';

const text = contract('export-text@1', z.string());
export const split = broadcast(text, ['left', 'right']);
export const left = defineConfiguredComponent({
  id: 'left', version: 1, title: 'Left branch', description: '',
  in: { in: text }, out: { out: text },
  configuration: contract('export-config@1', z.strictObject({ suffix: z.string(), extras: z.array(z.string()) })),
  create: ({ suffix, extras }) => async context => {
    for await (const input of context.inputs.in) {
      await Promise.resolve();
      await context.send('out', derivePacket(input.value + suffix + extras.join(''), [input]));
    }
  },
});
export const right = map(text, text, async value => value.toUpperCase());
export const join = joinByKey({ left: text, right: text }, { outputId: 'export-join@1', maxKeys: 8 });
