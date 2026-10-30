import * as z from 'zod';
import type * as core from 'zod/v4/core';
import { FlowError } from '../errors.js';

/** Match native format options/patterns so custom patterns cannot weaken the descriptor. */
export function assertStringFormat(detail: core.$ZodCheckStringFormatDef): void {
  let expected: RegExp | undefined;
  if (detail.format === 'uuid') {
    const { version } = detail as core.$ZodUUIDDef;
    if (version !== undefined && !['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'].includes(version)) {
      throw new FlowError('UNSUPPORTED_SCHEMA');
    }
    expected = z.uuid(version === undefined ? {} : { version })._zod.def.pattern;
  } else if (detail.format === 'datetime') {
    const { offset, local, precision } = detail as core.$ZodISODateTimeDef;
    if (local || (precision !== null && (!Number.isSafeInteger(precision) || precision < 0))) {
      throw new FlowError('UNSUPPORTED_SCHEMA', 'Only RFC3339-compatible datetime options are supported');
    }
    expected = z.iso.datetime({ offset, local: false, precision })._zod.def.pattern;
  } else throw new FlowError('UNSUPPORTED_SCHEMA');
  if (!(detail.pattern instanceof RegExp) || detail.pattern.source !== expected?.source || detail.pattern.flags !== expected.flags) {
    throw new FlowError('UNSUPPORTED_SCHEMA');
  }
}
