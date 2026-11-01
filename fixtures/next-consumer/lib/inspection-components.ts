import 'server-only';
import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import { contract, defineComponent, derivePacket } from 'event-driven-design';

const accountId = contract('account-id@1', z.enum(['acct-101', 'acct-202', 'acct-303']));
const samples = {
  'acct-101': { id: 'acct-101', name: 'Sample acct-101', status: 'active' as const },
  'acct-202': { id: 'acct-202', name: 'Sample acct-202', status: 'active' as const },
  'acct-303': { id: 'acct-303', name: 'Sample acct-303', status: 'active' as const }
};
const account = contract('sample-account@1', z.strictObject({ id: z.string(), name: z.string(), status: z.literal('active') }));
const summary = contract('account-summary@1', z.strictObject({ accountId: z.string(), display: z.string() }));

export const loadAccount = defineComponent({
  id: 'load-account', version: 1, title: 'Load account', description: 'Look up a sample account by its ID.',
  in: { accountId }, out: { account },
  create: () => async context => {
    for await (const incoming of context.inputs.accountId) {
      const found = await context.task(async ({ signal }) => {
        await delay(450, undefined, { signal });
        return samples[incoming.value];
      });
      await context.send('account', derivePacket(found, [incoming]));
    }
  }
});
export const buildSummary = defineComponent({
  id: 'account-summary', version: 1, title: 'Build summary', description: 'Format the account for display.',
  in: { account }, out: { summary },
  create: () => async context => {
    for await (const incoming of context.inputs.account) {
      const formatted = await context.task(async ({ signal }) => {
        await delay(250, undefined, { signal });
        return { accountId: incoming.value.id, display: incoming.value.name + ' · ' + incoming.value.status };
      });
      await context.send('summary', derivePacket(formatted, [incoming]));
    }
  }
});
