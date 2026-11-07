export const maxArtifactBytes = 10 * 1024 * 1024;
export const invalid = (): never => { throw Error('INVALID_ARTIFACT'); };

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}

export function fields(value: unknown, required: readonly string[], optional: readonly string[] = []) {
  const row = record(value);
  if (required.some(key => !Object.hasOwn(row, key)) ||
      Object.keys(row).some(key => !required.includes(key) && !optional.includes(key))) invalid();
  return row;
}

export const name = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 128;
export const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export const digest = (value: unknown): boolean => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

export function list(value: unknown, limit: number): unknown[] {
  if (!Array.isArray(value) || value.length > limit) return invalid();
  return value;
}

export function componentIdentity(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const separator = value.lastIndexOf('@');
  const version = value.slice(separator + 1);
  return separator > 0 && separator <= 128 && /^[1-9][0-9]{0,15}$/.test(version) && Number.isSafeInteger(Number(version));
}

export function increasing(previous: string, current: string): string {
  if (current <= previous) return invalid();
  return current;
}
