import type { Json } from '../packet.js';

export type ContractBase = Readonly<{ id: string; representationId: string; schema: Json }>;
export type PortDescriptor = Readonly<{ contractId: string; representationId: string; schema: Json }>;
export type ValidationResult = { ok: true } | { ok: false; issues: readonly { code: string; path: string }[] };

/** Sort JSON data without mistaking property names for schema annotations. */
function sorted(value: Json): Json {
  if (Array.isArray(value)) return value.map(sorted);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key]!)]));
}

export function canonicalSchema(schema: Json): string {
  function normalize(value: Json): Json {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return value;
    const output: Record<string, Json> = {};
    for (const [key, item] of Object.entries(value)) {
      if (['description', 'examples', 'example', 'title'].includes(key)) continue;
      let normalized = item;
      if (key === 'properties' && item !== null && typeof item === 'object' && !Array.isArray(item)) {
        normalized = Object.fromEntries(Object.entries(item).map(([name, child]) => [name, normalize(child)]));
      } else if (['items', 'additionalProperties'].includes(key)) normalized = normalize(item);
      else if (['anyOf', 'oneOf', 'allOf'].includes(key) && Array.isArray(item)) normalized = item.map(normalize);
      Object.defineProperty(output, key, { value: normalized, enumerable: true });
    }
    return output;
  }
  return JSON.stringify(sorted(normalize(schema)));
}

/** Conservative identity compatibility, never a general schema subtyping test. */
export function contractsCompatible(source: PortDescriptor, destination: PortDescriptor): boolean {
  return source.representationId === 'json@1' && destination.representationId === 'json@1' &&
    (destination.contractId === 'json@1' || (source.contractId === destination.contractId &&
      canonicalSchema(source.schema) === canonicalSchema(destination.schema)));
}

import { FlowError } from '../errors.js';

/** Descriptor readers reject accessors; they do not evaluate schema payloads. */
export function metadataRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value) ||
    ![null, Object.prototype].includes(Object.getPrototypeOf(value))) throw new FlowError('INVALID_CATALOG');
  const entries: [string, unknown][] = [];
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (typeof key !== 'string' || !('value' in descriptor)) throw new FlowError('INVALID_CATALOG');
    entries.push([key, descriptor.value]);
  }
  return Object.fromEntries(entries);
}
export function metadataArray(value: unknown): unknown[] {
  if (!Array.isArray(value) || Reflect.ownKeys(value).length !== value.length + 1) throw new FlowError('INVALID_CATALOG');
  return Array.from({ length: value.length }, (_, index) => {
    const entry = Object.getOwnPropertyDescriptor(value, String(index));
    if (!entry || !('value' in entry)) throw new FlowError('INVALID_CATALOG');
    return entry.value;
  });
}
export function assertJsonMetadata(value: unknown, ancestors = new Set<object>()): asserts value is Json {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object' || ancestors.has(value) || ancestors.size > 256) throw new FlowError('INVALID_CATALOG');
  ancestors.add(value);
  const values = Array.isArray(value) ? metadataArray(value) : Object.values(metadataRecord(value));
  for (const child of values) assertJsonMetadata(child, ancestors);
  ancestors.delete(value);
}

function primitiveLiteral(value: unknown): boolean {
  return value === null || typeof value === 'string' || typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value));
}

export function assertDescriptorSchema(value: unknown, allowAny = false): asserts value is Json {
  assertJsonMetadata(value);
  function walk(input: unknown, allowEmpty = allowAny): void {
    const fields = metadataRecord(input);
    if (Object.keys(fields).length === 0) { if (!allowEmpty) throw new FlowError('INVALID_CATALOG'); return; }
    for (const [key, item] of Object.entries(fields)) {
      if (key === '$schema') { if (item !== 'https://json-schema.org/draft/2020-12/schema') throw new FlowError('INVALID_CATALOG'); }
      else if (['description', 'title', 'format', 'pattern'].includes(key)) {
        if (typeof item !== 'string' || (key === 'format' && !['uuid', 'date-time'].includes(item))) throw new FlowError('INVALID_CATALOG');
      } else if (key === 'type') {
        const types = Array.isArray(item) ? metadataArray(item) : [item];
        if (types.length === 0 || types.some(type => !['string', 'number', 'integer', 'boolean', 'null', 'object', 'array'].includes(String(type)))) throw new FlowError('INVALID_CATALOG');
      } else if (['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf'].includes(key)) {
        if (typeof item !== 'number' || !Number.isFinite(item) || (key === 'multipleOf' && item <= 0)) throw new FlowError('INVALID_CATALOG');
      } else if (['minLength', 'maxLength', 'minItems', 'maxItems'].includes(key)) {
        if (!Number.isSafeInteger(item) || (item as number) < 0) throw new FlowError('INVALID_CATALOG');
      } else if (key === 'properties') {
        for (const child of Object.values(metadataRecord(item))) walk(child, true);
      } else if (key === 'items') walk(item);
      else if (key === 'additionalProperties') { if (item !== false) throw new FlowError('INVALID_CATALOG'); }
      else if (['anyOf', 'oneOf', 'allOf'].includes(key)) {
        const children = metadataArray(item);
        if (children.length === 0) throw new FlowError('INVALID_CATALOG');
        children.forEach(child => walk(child));
      } else if (key === 'required') {
        if (metadataArray(item).some(name => typeof name !== 'string')) throw new FlowError('INVALID_CATALOG');
      } else if (key === 'enum') {
        const values = metadataArray(item);
        if (values.length === 0 || !values.every(primitiveLiteral)) throw new FlowError('INVALID_CATALOG');
      } else if (key === 'const') {
        if (!primitiveLiteral(item)) throw new FlowError('INVALID_CATALOG');
      } else if (key !== 'const' && key !== 'examples' && key !== 'example') throw new FlowError('INVALID_CATALOG');
    }
    if (fields.type === 'object' && fields.additionalProperties !== false) throw new FlowError('INVALID_CATALOG');
  }
  walk(value);
}

/** Metadata has its own depth budget; packet payload byte/depth limits do not apply here. */
export function snapshotJsonMetadata(value: unknown): Json {
  assertJsonMetadata(value);
  function copy(item: Json): Json {
    if (item === null || typeof item !== 'object') return item;
    const snapshot: Json = Array.isArray(item)
      ? metadataArray(item).map(child => copy(child as Json))
      : Object.fromEntries(Object.entries(metadataRecord(item)).map(([key, child]) => [key, copy(child as Json)]));
    Object.freeze(snapshot);
    return snapshot;
  }
  return copy(value);
}

export type ContractIssue = Readonly<{ code: string; path: readonly (string | number)[] }>;
