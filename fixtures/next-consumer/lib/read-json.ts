import 'server-only';
import { FlowError } from 'event-driven-design';

export async function readBoundedJson(request: Request, limit: number): Promise<unknown> {
  if (request.headers.get('content-type') !== 'application/json' || !request.body) throw new FlowError('INVALID_ARGUMENT');
  const reader = request.body.getReader(), chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) {
      const item = await reader.read(); if (item.done) break;
      bytes += item.value.byteLength;
      if (bytes > limit) { await reader.cancel(); throw new FlowError('INVALID_ARGUMENT'); }
      chunks.push(item.value);
    }
  } finally { reader.releaseLock(); }
  const buffer = new Uint8Array(bytes); let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer)) as unknown;
}
