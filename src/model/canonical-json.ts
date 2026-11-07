import { metadataArray, metadataRecord } from './contracts.js';

/** Strict canonical JSON with lexical object keys and an optional UTF-8 byte budget. */
export function canonicalJson(value: unknown, maxBytes = Infinity): string {
  const chunks: string[] = [];
  const active = new Set<object>();
  const encoder = new TextEncoder();
  let remaining = maxBytes;

  function append(token: string) {
    if (maxBytes !== Infinity) {
      remaining -= encoder.encode(token).length;
      if (remaining < 0) throw Error('JSON_LIMIT');
    }
    chunks.push(token);
  }

  function stringToken(text: string) {
    if (text.length > remaining) throw Error('JSON_LIMIT');
    append(JSON.stringify(text));
  }

  function walk(item: unknown) {
    if (typeof item === 'string') return stringToken(item);
    if (item === null || typeof item === 'boolean' || (typeof item === 'number' && Number.isFinite(item))) {
      return append(JSON.stringify(item));
    }
    if (typeof item !== 'object' || active.has(item) || active.size > 256) throw Error('INVALID_JSON');
    active.add(item);
    if (Array.isArray(item)) {
      if (item.length > remaining) throw Error('JSON_LIMIT');
      append('[');
      metadataArray(item).forEach((child, index) => {
        if (index) append(',');
        walk(child);
      });
      append(']');
    } else {
      const fields = metadataRecord(item);
      append('{');
      Object.keys(fields).sort().forEach((key, index) => {
        if (index) append(',');
        stringToken(key);
        append(':');
        walk(fields[key]);
      });
      append('}');
    }
    active.delete(item);
  }
  walk(value);
  return chunks.join('');
}
