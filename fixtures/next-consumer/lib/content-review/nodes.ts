import { defineComponent, defineFunction, filter } from 'event-driven-design';
import { findings, product } from './product.ts';
import type { Product } from './product.ts';

export type MediaService = (product: Product, signal: AbortSignal, attempt: number) => Promise<{ field: string; message: string }[]>;
const eligibility = filter(product, (value, context) => {
  if (!value.archived) return true;
  context.recordDecision({ code: 'ARCHIVED', ruleVersion: 'v1', outcome: 'drop',
    facts: [{ name: 'archived', sourcePacketId: context.packet.packetId, fieldPath: '/archived' }] });
  return false;
});
export const activeProduct = defineComponent({ ...eligibility, title: 'Check eligibility',
  decisions: [{ code: 'ARCHIVED', ruleVersion: 'v1', outcomes: ['drop'], facts: ['archived'] }] });

export const content = defineFunction({ id: 'review-content', version: 1, title: 'Check content', description: 'Check required listing text.',
  input: product, output: findings, handler: value => [
    ...(!value.title.trim() ? [{ field: 'title', message: 'Add a product title.' }] : []),
    ...(!value.description.trim() ? [{ field: 'description', message: 'Add a product description.' }] : []),
  ] });
export const rules = defineFunction({ id: 'review-rules', version: 1, title: 'Check publication rules', description: 'Check the public slug.',
  input: product, output: findings, handler: value => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)
    ? [] : [{ field: 'slug', message: 'Use lowercase words separated by hyphens.' }] });
export function media(service: MediaService) {
  return defineFunction({ id: 'review-media', version: 1, title: 'Check media', description: 'Check image accessibility.',
    input: product, output: findings, handler: (value, context) => service(value, context.signal, context.attempt) });
}
