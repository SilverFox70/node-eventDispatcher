import 'server-only';
import { FlowError } from 'event-driven-design';
import type { DiagnosticAction } from './diagnostic-model.ts';

/** Bound bytes before parsing; same-origin capability requests cannot carry arbitrary graph/function data. */
export async function readDiagnosticCommand(request: Request): Promise<DiagnosticAction> {
  const origin = request.headers.get('origin');
  const address = origin ? new URL(origin) : null;
  if (!address || address.origin !== origin || address.host !== request.headers.get('host') ||
    address.protocol !== new URL(request.url).protocol || !['127.0.0.1', 'localhost'].includes(address.hostname)) throw new FlowError('FORBIDDEN');
  if (request.headers.get('content-type') !== 'application/json' || !request.body) throw new FlowError('INVALID_ARGUMENT');
  const reader = request.body.getReader(), chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) {
      const item = await reader.read(); if (item.done) break;
      bytes += item.value.byteLength;
      if (bytes > 4096) { await reader.cancel(); throw new FlowError('INVALID_ARGUMENT'); }
      chunks.push(item.value);
    }
  } finally { reader.releaseLock(); }
  const buffer = new Uint8Array(bytes); let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
  const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new FlowError('INVALID_ARGUMENT');
  const fields = value as Record<string, unknown>;
  const base = ['action', 'token', 'sourceId', 'runId', 'sessionId', 'expectedEpoch'];
  const extra = fields.action === 'capture' ? ['nodeId', 'inputs', 'outputs'] : fields.action === 'export' ? ['includeCaptures'] : [];
  if (!['capture', 'load', 'export'].includes(fields.action as string) || Object.keys(fields).length !== base.length + extra.length ||
    ![...base, ...extra].every(key => Object.hasOwn(fields, key)) ||
    !['token', 'sourceId', 'runId', 'sessionId'].every(key => typeof fields[key] === 'string' && (fields[key] as string).length <= 128) ||
    !Number.isSafeInteger(fields.expectedEpoch) || (fields.expectedEpoch as number) < 1 ||
    (fields.action === 'capture' && (typeof fields.nodeId !== 'string' || typeof fields.inputs !== 'boolean' || typeof fields.outputs !== 'boolean')) ||
    (fields.action === 'export' && typeof fields.includeCaptures !== 'boolean')) throw new FlowError('INVALID_ARGUMENT');
  return fields as DiagnosticAction;
}
