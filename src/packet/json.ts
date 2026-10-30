import { isProxy } from 'node:util/types';
import type { Json } from '../packet.js';
import { FlowError } from '../errors.js';
import { readArray, readRecord } from './data.js';

const maxBytes = 1048576;

/** Copy/freeze the JSON profile, accounting for serialized value bytes only. */
export function copyJson(value: unknown): Json {
  let bytes = 0;
  const ancestors = new Set<object>();
  function charge(count: number): void {
    bytes += count;
    if (bytes > maxBytes) throw new FlowError('INVALID_PACKET', 'JSON value exceeds 1 MiB');
  }
  function quoted(text: string): number {
    if (text.length > maxBytes) throw new FlowError('INVALID_PACKET', 'JSON string exceeds limit');
    return Buffer.byteLength(JSON.stringify(text), 'utf8');
  }
  function copy(input: unknown, depth: number): Json {
    if (depth >= 64 && input !== null && typeof input === 'object') throw new FlowError('INVALID_PACKET', 'JSON nesting exceeds 64');
    if (input === null) { charge(4); return null; }
    if (typeof input === 'string') { charge(quoted(input)); return input; }
    if (typeof input === 'boolean') { charge(input ? 4 : 5); return input; }
    if (typeof input === 'number' && Number.isFinite(input)) {
      charge(String(input).length);
      return input;
    }
    if (typeof input !== 'object') throw new FlowError('INVALID_PACKET', 'Unsupported JSON value');
    if (isProxy(input)) throw new FlowError('INVALID_PACKET', 'JSON proxies are unsupported');
    if (ancestors.has(input)) throw new FlowError('INVALID_PACKET', 'Cyclic JSON value');
    ancestors.add(input);
    charge(2);
    let output: Json;
    if (Array.isArray(input)) {
      output = readArray(input, 'INVALID_PACKET').map((item, index) => {
        if (index > 0) charge(1);
        return copy(item, depth + 1);
      });
    } else {
      output = Object.fromEntries(Object.entries(readRecord(input, 'INVALID_PACKET')).map(([key, item], index) => {
        charge(quoted(key) + 1 + (index > 0 ? 1 : 0));
        return [key, copy(item, depth + 1)];
      }));
    }
    ancestors.delete(input);
    Object.freeze(output);
    return output;
  }
  return copy(value, 0);
}
