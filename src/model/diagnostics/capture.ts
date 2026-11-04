import { metadataRecord } from '../contracts.js';
import { ensure, keys, uuid, integer } from './packet.js';

/** Payload capture is a strict optional transfer extension, never arbitrary object serialization. */
export function checkCapture(event: Record<string, unknown>): void {
  const present = ['capture', 'captureSessionId', 'captureEpoch'].map(key => Object.hasOwn(event, key));
  if (!present.some(Boolean)) return;
  ensure(present.every(Boolean) && uuid(event.captureSessionId) && integer(event.captureEpoch) && (event.captureEpoch as number) >= 1);
  const capture = metadataRecord(event.capture);
  ensure(integer(capture.bytes) && (capture.bytes as number) >= 1 && (capture.bytes as number) <= 1048576);
  const encoder = new TextEncoder();
  if (capture.state === 'captured') {
    keys(capture, ['state', 'value', 'bytes']);
    const bytes = encoder.encode(JSON.stringify(capture.value)).length;
    ensure(bytes === capture.bytes && bytes <= 2048);
  } else {
    keys(capture, ['state', 'preview', 'bytes']);
    ensure(capture.state === 'truncated' && typeof capture.preview === 'string');
    const bytes = encoder.encode(capture.preview).length;
    ensure(bytes <= 2048 && bytes < (capture.bytes as number));
  }
}
