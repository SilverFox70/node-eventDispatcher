import * as core from 'zod/v4/core';
import { assertStringFormat } from './formats.js';
import { FlowError } from '../errors.js';

const nativeLengthWhen = new core.$ZodCheckMinLength({ check: 'min_length', minimum: 0 })._zod.def.when;

function unsupported(): never { throw new FlowError('UNSUPPORTED_SCHEMA'); }

/** Only documented Zod core definitions/checks are inspected; unknown kinds refuse. */
export function assertSupported(schema: core.$ZodType): void {
  const ancestors = new Set<core.$ZodType>();
  function checks(node: core.$ZodType, kind: string): void {
    const def = node._zod.def;
    const list = (def.checks ?? []).map(check => check._zod.def);
    if ('check' in def && typeof def.check === 'string') list.push({ ...def, check: def.check });
    for (const detail of list) {
      if (detail.when !== undefined && detail.when !== nativeLengthWhen) unsupported();
      const name = detail.check;
      if ((kind === 'string' || kind === 'array') && ['min_length', 'max_length', 'length_equals'].includes(name)) {
        const bound = 'minimum' in detail ? detail.minimum : 'maximum' in detail ? detail.maximum : 'length' in detail ? detail.length : undefined;
        if (!Number.isSafeInteger(bound) || (bound as number) < 0) unsupported();
        continue;
      }
      if (kind === 'number' && ['less_than', 'greater_than', 'multiple_of'].includes(name)) {
        if (!('value' in detail) || typeof detail.value !== 'number' || !Number.isFinite(detail.value) ||
          (name === 'multiple_of' && detail.value <= 0)) unsupported();
        continue;
      }
      if (kind === 'number' && name === 'number_format' && 'format' in detail &&
        typeof detail.format === 'string' && ['safeint', 'int32', 'float64'].includes(detail.format)) continue;
      if (kind === 'string' && name === 'string_format') {
        assertStringFormat(detail as core.$ZodCheckStringFormatDef);
        continue;
      }
      unsupported();
    }
  }
  function walk(input: core.$ZodType, optional = false): void {
    if (!(input instanceof core.$ZodType) || ancestors.has(input) || ancestors.size > 64) unsupported();
    ancestors.add(input);
    const node = input as core.$ZodTypes;
    const def = node._zod.def;
    if ('coerce' in def && def.coerce) unsupported();
    checks(node, def.type);
    switch (def.type) {
      case 'string': case 'number': case 'boolean': case 'null': break;
      case 'literal':
        if (def.values.some(value => value !== null && typeof value !== 'string' && typeof value !== 'boolean' &&
          !(typeof value === 'number' && Number.isFinite(value)))) unsupported();
        break;
      case 'enum':
        if (Object.values(def.entries).some(value => typeof value !== 'string' && !(typeof value === 'number' && Number.isFinite(value)))) unsupported();
        break;
      case 'array': walk(def.element); break;
      case 'object': {
        if (def.catchall?._zod.def.type !== 'never') unsupported();
        if (Reflect.ownKeys(def.shape).some(key => typeof key !== 'string')) unsupported();
        for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(def.shape))) {
          if (!('value' in descriptor)) unsupported();
          walk(descriptor.value, true);
        }
        break;
      }
      case 'optional': if (!optional) unsupported(); walk(def.innerType); break;
      case 'nullable': walk(def.innerType); break;
      case 'union': for (const child of def.options) walk(child); break;
      default: unsupported();
    }
    ancestors.delete(input);
  }
  walk(schema);
}
