import { FlowError } from '../errors.js';
import { readArray, readRecord } from './data.js';

export const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const jobPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function validUuid(value: unknown): value is string {
  return typeof value === 'string' && uuidV4.test(value);
}
export function validJob(value: unknown): value is string {
  return typeof value === 'string' && jobPattern.test(value);
}
export function validKey(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && [...value].length <= 128;
}

export function readOptions(value: unknown, root: boolean): { jobId?: string; key?: string } {
  const options = readRecord(value, 'INVALID_ARGUMENT');
  if (Object.keys(options).some(key => key !== 'key' && (!root || key !== 'jobId'))) {
    throw new FlowError('INVALID_ARGUMENT', 'Unknown packet option');
  }
  const result: { jobId?: string; key?: string } = {};
  if (Object.hasOwn(options, 'jobId')) {
    if (!validJob(options.jobId)) throw new FlowError('INVALID_ARGUMENT', 'Invalid jobId');
    result.jobId = options.jobId;
  }
  if (Object.hasOwn(options, 'key')) {
    if (!validKey(options.key)) throw new FlowError('INVALID_ARGUMENT', 'Invalid key');
    result.key = options.key;
  }
  return result;
}

export function readParentIds(value: unknown, packetId: string): readonly string[] {
  const ids = readArray(value, 'INVALID_PACKET', 256);
  const result: string[] = [];
  for (const id of ids) {
    if (!validUuid(id) || id === packetId || result.includes(id)) {
      throw new FlowError('INVALID_PACKET', 'Invalid parent identity');
    }
    result.push(id);
  }
  return Object.freeze(result);
}
