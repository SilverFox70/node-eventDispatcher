import 'server-only';
import { contract, defineComponent, defineConfiguredComponent, derivePacket, describeRegistry, jsonContract } from 'event-driven-design';
import { z } from 'zod';

const stock = contract('inventory-stock@1', z.strictObject({ quantity: z.number(), low: z.boolean() }));
const threshold = contract('inventory-threshold@1', z.strictObject({ threshold: z.number() }));
export const inventory = defineConfiguredComponent({
  id: 'inventory-alert', version: 1, title: 'Inventory Alert',
  description: 'Flag stock below a per-location threshold.',
  configuration: threshold, in: { stock }, out: { alert: stock },
  create: ({ threshold }) => {
    console.log('FBP_EDITOR_FACTORY_CALLED');
    return async context => {
      for await (const update of context.inputs.stock) {
        await context.send('alert', derivePacket({ quantity: update.value.quantity, low: update.value.quantity < threshold }, [update]));
      }
    };
  },
});
const escaped = defineComponent({
  id: 'escaped', version: 1, title: '<script>alert(1)</script>',
  description: 'A metadata escaping example.',
  in: {}, out: { raw: jsonContract, sample: contract('editor-sample@1', z.number().nullable()) },
  create: () => async () => {},
});
const registry = { 'inventory-alert@1': inventory };
export const catalog = describeRegistry(registry);
export const specimenCatalog = describeRegistry({ ...registry, 'escaped@1': escaped });
