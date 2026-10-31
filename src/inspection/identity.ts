import type { Json } from '../packet.js';

/** Exact data identity ignores object-key insertion order, preserving arrays and all metadata fields. */
export function dataIdentity(value: Json): string {
  function ordered(item: Json): Json {
    if (Array.isArray(item)) return item.map(ordered);
    if (item === null || typeof item !== 'object') return item;
    return Object.fromEntries(Object.keys(item).sort().map(key => [key, ordered(item[key]!)]));
  }
  return JSON.stringify(ordered(value));
}
