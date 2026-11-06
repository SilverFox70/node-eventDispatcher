import { runGraph } from 'event-driven-design/testing';
import { admitRun, runKey } from '../../../../lib/editor-run-admission.ts';
import { liveRuns } from '../../../../lib/editor-live-runs.ts';
import { readBoundedJson } from '../../../../lib/read-json.ts';

const active = new Map<string, AbortController>();
const error = (code: string, status: number) => Response.json({ code }, { status });

export async function POST(request: Request) {
  try {
    const admission = admitRun(await readBoundedJson(request, 256 * 1024));
    if ('code' in admission) return error(admission.code, admission.status);
    if (active.size) return error('RUN_QUOTA', 429);
    const controller = new AbortController();
    active.set(admission.id, controller);
    liveRuns.begin(admission.id);
    try {
      const signal = AbortSignal.any([request.signal, controller.signal]);
      const result = await runGraph(admission.graph, { inputs: admission.inputs, signal, timeoutMs: 5000, maxOutputPackets: 300,
        trace: { limit: 128, payloads: admission.capture },
        observe: run => liveRuns.attach(admission.id, admission.revision, admission.graphHash, run),
      });
      return Response.json({
        revision: admission.revision, graphHash: admission.graphHash, runId: result.snapshot.runId,
        terminal: result.terminal, outputs: result.outputs,
      });
    } catch {
      return error('RUN_FAILED', 422);
    } finally {
      active.delete(admission.id);
      liveRuns.finish(admission.id);
    }
  } catch {
    return error('INVALID_ARGUMENT', 400);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await readBoundedJson(request, 1024);
    if (!body || typeof body !== 'object' || Object.keys(body).length !== 1 || !('id' in body) || !runKey(body.id)) {
      return error('INVALID_ARGUMENT', 400);
    }
    const controller = active.get(body.id);
    if (!controller) return error('RUN_NOT_FOUND', 404);
    controller.abort();
    return Response.json({ status: 'cancelling' }, { status: 202 });
  } catch {
    return error('INVALID_ARGUMENT', 400);
  }
}

export function GET(request: Request) {
  const id = request.headers.get('x-flow-run-key');
  if (!runKey(id)) return error('INVALID_ARGUMENT', 400);
  const view = liveRuns.read(id);
  return view ? Response.json(view, { headers: { 'cache-control': 'no-store' } }) : error('RUN_NOT_FOUND', 404);
}
