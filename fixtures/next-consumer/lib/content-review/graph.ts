import assert from 'node:assert/strict';
import { broadcast, compileGraph, createGraph, joinByKey, defineFunction } from 'event-driven-design';
import { activeProduct, content, media, rules } from './nodes.ts';
import type { MediaService } from './nodes.ts';
import { product, findings, report } from './product.ts';

export function reviewGraph(service: MediaService) {
  const split = broadcast(product, ['product', 'content', 'media', 'rules']);
  const collate = joinByKey({ product, content: findings, media: findings, rules: findings }, { outputId: 'review-joined@1', maxKeys: 8 });
  const summarize = defineFunction({ id: 'review-summary', version: 1, title: 'Build preview or report', description: 'Show actionable findings.',
    input: collate.out.out, output: report, handler: value => {
      const findings = [...value.content, ...value.media, ...value.rules];
      return { findings, preview: findings.length ? null : { title: value.product.title, description: value.product.description } };
    } });
  const graph = createGraph(), mediaCheck = media(service);
  const gate = graph.add('eligibility', activeProduct), fork = graph.add('fork', split);
  const text = graph.add('content', content), image = graph.add('media', mediaCheck, { taskTimeoutMs: 900,
    retry: { maxRetries: 1, delayMs: 0, idempotent: true, codes: ['MEDIA_TEMPORARY'] } });
  const policy = graph.add('rules', rules), join = graph.add('collate', collate), output = graph.add('report', summarize);
  graph.exposeInput('product', gate, 'in');
  graph.connect(gate, 'out', fork, 'in');
  graph.connect(fork, 'product', join, 'product');
  graph.connect(fork, 'content', text, 'in');
  graph.connect(fork, 'media', image, 'in');
  graph.connect(fork, 'rules', policy, 'in');
  graph.connect(text, 'out', join, 'content');
  graph.connect(image, 'out', join, 'media');
  graph.connect(policy, 'out', join, 'rules');
  graph.connect(join, 'out', output, 'in');
  graph.exposeOutput('review', output, 'out');
  const spec = graph.toSpec();
  const registry = Object.fromEntries([activeProduct, split, content, mediaCheck, rules, collate, summarize].map(node => [node.id + '@1', node]));
  const result = compileGraph(spec, registry);
  assert(result.ok, 'The fixed content review graph must compile');
  return { spec, compiled: result.graph, summary: summarize };
}
