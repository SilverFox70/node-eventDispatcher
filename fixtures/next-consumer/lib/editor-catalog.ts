import 'server-only';
import { contract, defineComponent, defineConfiguredComponent, derivePacket, describeRegistry, jsonContract } from 'event-driven-design';
import { z } from 'zod';

const stock = contract('inventory-stock@1', z.strictObject({ quantity: z.number(), low: z.boolean() }));
const threshold = contract('inventory-threshold@1', z.strictObject({ threshold: z.number().min(0) }));
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
export const registry = { 'inventory-alert@1': inventory };
export const catalog = describeRegistry(registry);
type ExampleSettings = { mode: 'notify' | 'record'; label: string; enabled: boolean; optional?: { count: number } };
const settings = defineConfiguredComponent({
  id: 'settings-example', version: 1, title: 'Settings example', description: 'Example enum and optional settings.',
  configuration: contract('editor-settings@1', z.strictObject({
    mode: z.enum(['notify', 'record']), label: z.string(), enabled: z.boolean(),
    optional: z.strictObject({ count: z.int() }).optional(),
  }) as unknown as z.ZodType<ExampleSettings, ExampleSettings>),
  in: {}, out: {}, create: () => async () => {},
});
const unsupported = defineConfiguredComponent({
  id: 'list-settings', version: 1, title: 'List settings', description: 'Settings with a list.',
  configuration: contract('editor-list@1', z.array(z.number())), in: {}, out: {}, create: () => async () => {},
});
export const editorRegistry = { ...registry, 'escaped@1': escaped, 'settings-example@1': settings, 'list-settings@1': unsupported };
export const specimenCatalog = describeRegistry(editorRegistry);
