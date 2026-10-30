import { isProxy } from 'node:util/types';
import { FlowError } from '../errors.js';

/** Inspect descriptors rather than executing user getters or serialization hooks. */
export function readRecord(value: unknown, code: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || isProxy(value) || Array.isArray(value)) {
    throw new FlowError(code, 'Expected a plain data object');
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new FlowError(code, 'Expected a plain data object');
  }
  const entries: [string, unknown][] = [];
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (typeof key !== 'string' || !('value' in descriptor)) {
      throw new FlowError(code, 'Symbols and accessors are unsupported');
    }
    entries.push([key, descriptor.value]);
  }
  return Object.fromEntries(entries);
}

export function readArray(value: unknown, code: string, maxLength = 1048576): unknown[] {
  if (isProxy(value) || !Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) throw new FlowError(code, 'Expected an array');
  if (value.length > maxLength || Reflect.ownKeys(value).length !== value.length + 1) {
    throw new FlowError(code, 'Expected a bounded dense array without extra properties');
  }
  const entries: unknown[] = [];
  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !('value' in descriptor)) {
      throw new FlowError(code, 'Sparse arrays and accessors are unsupported');
    }
    entries.push(descriptor.value);
  }
  return entries;
}
