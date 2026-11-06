import { decisionSnapshot, FlowError, packet, startNetwork } from 'event-driven-design';
import type { Packet } from 'event-driven-design';
import { explainCausal } from 'event-driven-design/model';
import type { CausalEvidence, CausalSubject } from 'event-driven-design/model';
import { reviewGraph } from './graph.ts';
import { admitProduct } from './product.ts';
import type { Product } from './product.ts';
import type { MediaService } from './nodes.ts';

const isTerminated = (error: unknown) => error instanceof FlowError && error.code === 'RUN_TERMINATED';

export async function reviewInput(input: unknown, service: MediaService, signal: AbortSignal) {
  const admitted = admitProduct(input);
  if (!admitted.ok) return admitted;
  return { ok: true as const, result: await runReview(admitted.product, service, signal) };
}

export async function runReview(product: Product, service: MediaService, signal: AbortSignal) {
  const graph = reviewGraph(service);
  const input = packet(product, { jobId: 'product-review', key: 'review' });
  const run = startNetwork(graph.compiled, { signal, timeoutMs: 3000, diagnostics: { limit: 128 } });
  let output: Packet | undefined;
  const drain = (async () => { for await (const row of run.outputs.review!) output = row; })();
  const feed = (async () => {
    await run.send('product', input);
    await run.finish();
  })();
  try {
    await Promise.all([feed, drain]);
  } catch (error) {
    if (!isTerminated(error)) throw error;
  } finally {
    run.cancel();
    await Promise.allSettled([feed, drain]);
  }
  const terminal = await run.done;
  const evidence: CausalEvidence = { format: 'nodeflow.evidence', version: 1, runId: run.runId, diagnostics: run.diagnostics(),
    decisions: decisionSnapshot(run), identity: { status: 'unverified' } };
  const outputs = evidence.diagnostics.events.flatMap(row => row.kind === 'sent' && row.nodeId === 'report' ? [row.sequence] : []);
  const subject: CausalSubject = { kind: output ? 'output' : 'input', packetId: (output ?? input).packetId, jobId: input.jobId };
  const explanation = explainCausal(evidence, { runId: run.runId, subject, maxRecords: 128 }, outputs);
  return { terminal, review: output?.value ?? null, explanation };
}
