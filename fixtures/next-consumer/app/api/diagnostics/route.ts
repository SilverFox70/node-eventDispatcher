import { randomUUID } from 'node:crypto';
import { FlowError } from 'event-driven-design';
import { createDiagnosticDemo } from '../../../lib/diagnostic-demo.ts';
import { readDiagnosticCommand } from '../../../lib/diagnostic-command.ts';
import { openInspectionStream } from '../../../lib/inspection-stream.ts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const demos = new Map<string, ReturnType<typeof createDiagnosticDemo>>();

export function GET(request: Request) {
  const example = new URL(request.url).searchParams.get('example');
  if (!['account', 'pokemon'].includes(example!)) return Response.json({ code: 'INVALID_ARGUMENT' }, { status: 400 });
  if (demos.size >= 16) return Response.json({ code: 'CONNECTION_LIMIT' }, { status: 409 });
  const token = randomUUID(), demo = createDiagnosticDemo(example as 'account' | 'pokemon', token);
  demos.set(token, demo);
  const stream = openInspectionStream({ ...demo, dispose() { demos.delete(token); demo.dispose(); } }, request.signal, token);
  return new Response(stream, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-store', 'x-accel-buffering': 'no' } });
}
export async function POST(request: Request) {
  try {
    const command = await readDiagnosticCommand(request), demo = demos.get(command.token);
    if (!demo) throw new FlowError('FORBIDDEN');
    const result = demo.command(command);
    if (typeof result === 'string') return new Response(result, { headers: { 'content-type': 'application/x-ndjson',
      'content-disposition': 'attachment; filename="nodeflow-diagnostics.jsonl"', 'cache-control': 'no-store' } });
    return Response.json(result, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const code = error instanceof FlowError ? error.code : error instanceof SyntaxError || error instanceof TypeError ? 'INVALID_ARGUMENT' : 'UNAVAILABLE';
    const status = code === 'FORBIDDEN' ? 403 : code === 'INVALID_ARGUMENT' ? 400 : code === 'UNAVAILABLE' ? 500 : 409;
    return Response.json({ code }, { status });
  }
}
