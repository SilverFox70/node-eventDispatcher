import { readRecord } from '../packet/data.js';
import { FlowError } from '../errors.js';
import { captureOption } from './export.js';
export type DiagnosticSinkOptions = Readonly<{ recordLimit?: number; byteLimit?: number; batchSize?: number; includeCaptures?: boolean }>;
export function positive(value: unknown, maximum: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > maximum) throw new FlowError('INVALID_ARGUMENT');
  return value as number;
}
export function sinkOptions(value: unknown) {
  const fields = readRecord(value, 'INVALID_ARGUMENT');
  if (Object.keys(fields).some(key => !['recordLimit', 'byteLimit', 'batchSize', 'includeCaptures'].includes(key))) throw new FlowError('INVALID_ARGUMENT');
  return { includeCaptures: captureOption(fields),
    recordLimit: positive(Object.hasOwn(fields, 'recordLimit') ? fields.recordLimit : 128, 1024),
    byteLimit: positive(Object.hasOwn(fields, 'byteLimit') ? fields.byteLimit : 262144, 1048576),
    batchSize: positive(Object.hasOwn(fields, 'batchSize') ? fields.batchSize : 32, 32) };
}
