import { metadataRecord, metadataArray } from '../contracts.js';
export function ensure(value: unknown): asserts value { if (!value) throw Error('Invalid diagnostic'); }
export const name = (value: unknown) => typeof value === 'string' && value.length > 0 && value.length <= 128;
export const uuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
export const integer = (value: unknown) => Number.isSafeInteger(value) && (value as number) >= 0;
export const time = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
export function keys(value: Record<string, unknown>, required: string[], optional: string[] = []): void {
  ensure(required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => required.includes(key) || optional.includes(key)));
}
/** Validate passive packet identity only; browser metadata cannot admit payloads to a runtime. */
export function checkPacket(value: unknown): void {
  const fields = metadataRecord(value);
  keys(fields, ['version', 'packetId', 'jobId', 'parentPacketIds'], ['key']);
  ensure(fields.version === 1 && uuid(fields.packetId) && typeof fields.jobId === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(fields.jobId));
  if (Object.hasOwn(fields, 'key')) ensure(typeof fields.key === 'string' && [...fields.key].length > 0 && [...fields.key].length <= 128);
  const parents = metadataArray(fields.parentPacketIds);
  ensure(parents.length <= 256 && new Set(parents).size === parents.length &&
    parents.every(id => uuid(id) && id !== fields.packetId));
}
export function checkInputs(value: unknown): void {
  const inputs = metadataArray(value); ensure(inputs.length <= 256); inputs.forEach(checkPacket);
  const records = inputs.map(metadataRecord);
  ensure(new Set(records.map(record => record.packetId)).size === records.length &&
    records.every(record => record.jobId === records[0]!.jobId));
}
