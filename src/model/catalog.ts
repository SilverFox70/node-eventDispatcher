import type { Json } from '../packet.js';
import type { PortDescriptor } from './contracts.js';
export type ComponentDescriptor = Readonly<{
  id: string; version: number; title: string; description: string;
  in: Readonly<Record<string, PortDescriptor>>; out: Readonly<Record<string, PortDescriptor>>;
  examples?: readonly { in?: Readonly<Record<string, Json>>; out?: Readonly<Record<string, Json>> }[];
  effects?: readonly string[]; requiredDependencies?: readonly string[];
}>;
export type Catalog = Readonly<{ version: 1; components: readonly ComponentDescriptor[] }>;

import { FlowError } from '../errors.js';
import { assertDescriptorSchema, assertJsonMetadata, canonicalSchema, metadataArray, metadataRecord } from './contracts.js';
import type { ValidationResult } from './contracts.js';

function identifier(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 128) throw new FlowError('INVALID_CATALOG');
}
function keys(fields: Record<string, unknown>, allowed: string[]): void {
  if (Object.keys(fields).some(key => !allowed.includes(key))) throw new FlowError('INVALID_CATALOG');
}
/** Validate metadata and identity consistency, not arbitrary browser payload schemas. */
export function validateCatalog(value: unknown): ValidationResult {
  let path = '$';
  try {
    assertJsonMetadata(value);
    const catalog = metadataRecord(value);
    keys(catalog, ['version', 'components']);
    if (catalog.version !== 1) throw new FlowError('INVALID_CATALOG');
    const identities = new Set<string>();
    const meanings = new Map<string, string>();
    for (const [index, item] of metadataArray(catalog.components).entries()) {
      path = `$.components[${index}]`;
      const component = metadataRecord(item);
      keys(component, ['id', 'version', 'title', 'description', 'in', 'out', 'examples', 'effects', 'requiredDependencies']);
      identifier(component.id);
      if (!Number.isSafeInteger(component.version) || (component.version as number) < 1 ||
        typeof component.title !== 'string' || component.title.length === 0 || typeof component.description !== 'string') throw new FlowError('INVALID_CATALOG');
      const identity = `${component.id}@${component.version}`;
      if (identities.has(identity)) throw new FlowError('INVALID_CATALOG');
      identities.add(identity);
      for (const side of ['in', 'out']) {
        for (const [name, raw] of Object.entries(metadataRecord(component[side]))) {
          path = `$.components[${index}].${side}.${name}`;
          identifier(name);
          const port = metadataRecord(raw);
          keys(port, ['contractId', 'representationId', 'schema']);
          identifier(port.contractId);
          if (port.contractId.lastIndexOf('@') < 1 || port.contractId.endsWith('@')) throw new FlowError('INVALID_CATALOG');
          if (port.representationId !== 'json@1') throw new FlowError('UNSUPPORTED_REPRESENTATION');
          assertDescriptorSchema(port.schema, port.contractId === 'json@1');
          if (port.contractId === 'json@1' && canonicalSchema(port.schema) !== '{}') throw new FlowError('INVALID_CATALOG');
          const meaning = canonicalSchema(port.schema);
          if (meanings.has(port.contractId) && meanings.get(port.contractId) !== meaning) throw new FlowError('CONTRACT_ID_CONFLICT');
          meanings.set(port.contractId, meaning);
        }
      }
      for (const field of ['effects', 'requiredDependencies']) {
        if (component[field] !== undefined) metadataArray(component[field]).forEach(identifier);
      }
      if (component.examples !== undefined) {
        for (const raw of metadataArray(component.examples)) {
          const example = metadataRecord(raw);
          keys(example, ['in', 'out']);
          for (const [side, values] of Object.entries(example)) {
            const ports = metadataRecord(component[side]);
            if (Object.keys(metadataRecord(values)).some(name => !Object.hasOwn(ports, name))) throw new FlowError('INVALID_CATALOG');
          }
        }
      }
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, issues: [{ code: error instanceof FlowError ? error.code : 'INVALID_CATALOG', path }] };
  }
}
