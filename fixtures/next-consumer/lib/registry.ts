import 'server-only';
import { z } from 'zod';
import { contract, defineFunction, defineComponent, describeRegistry, createGraph } from 'event-driven-design';
import { double } from './provider';

export const graphRevision = 'demo@1';
export const numeric = contract('demo-number@1', z.number());
export const demo = defineComponent({
  ...defineFunction({ id: 'double', version: 1, title: 'Double a number', description: 'Fixed local demo',
    input: numeric, output: numeric, handler: double }),
  effects: ['demo.double'], requiredDependencies: ['double'], examples: [{ in: { in: 2 }, out: { out: 4 } }],
});
const builder = createGraph(), node = builder.add('node', demo);
builder.exposeInput('in', node, 'in'); builder.exposeOutput('out', node, 'out');
export const graphSpec = builder.toSpec();
export const catalog = describeRegistry({ 'double@1': demo });
