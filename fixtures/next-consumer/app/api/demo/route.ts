import { randomUUID } from 'node:crypto';
import { packet } from 'event-driven-design';
import { runNode } from 'event-driven-design/testing';
import { demo, numeric, graphRevision } from '../../../lib/registry';
import type { DemoReply } from '../../../lib/protocol';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  const requestId = randomUUID();
  const headers = { 'x-flow-request-id': requestId, 'x-graph-revision': graphRevision, 'cache-control': 'no-store' };
  const reply = (body: DemoReply, status: number, runId?: string) => {
    console.log('FBP_DEMO_REPLY', requestId, status);
    return Response.json(body, { status, headers: { ...headers, ...(runId ? { 'x-flow-run-id': runId } : {}) } });
  };
  let input: unknown;
  try { input = await request.json(); } catch { return reply({ code: 'INVALID_INPUT' }, 400); }
  if (typeof input !== 'object' || input === null || Array.isArray(input) || Object.keys(input).length !== 1 ||
    !Object.hasOwn(input, 'value') || !numeric.validate((input as { value: unknown }).value)) {
    return reply({ code: 'INVALID_INPUT' }, 400);
  }
  const value = (input as { value: number }).value;
  try {
    const result = await runNode(demo, { inputs: { in: [packet(value, { jobId: requestId })] }, timeoutMs: 1000, signal: request.signal });
    console.log('FBP_DEMO_TERMINAL', requestId, result.terminal.status);
    const runId = result.snapshot.runId;
    if (result.terminal.status === 'completed') return reply({ status: 'completed', value: result.outputs.out[0]!.value }, 200, runId);
    if (result.terminal.status === 'cancelled') return reply({ code: 'CANCELLED' }, 499, runId);
    if (result.terminal.code === 'TIMEOUT') return reply({ code: 'TIMEOUT' }, 504, runId);
    const validation = result.snapshot.diagnostics.find(item => item.validation)?.validation;
    return reply({ code: 'FLOW_FAILED', ...(validation ? { validation } : {}) }, 500, runId);
  } catch { return reply({ code: 'FLOW_FAILED' }, 500); }
}
