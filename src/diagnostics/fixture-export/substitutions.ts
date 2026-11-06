import { isDeepStrictEqual } from 'node:util';

export const pointerPart = (value: string) => value.replace(/~/g, '~0').replace(/\//g, '~1');

/** Compare selected captured data to the reviewed values, allowing only named replacement subtrees. */
export function matchesReviewed(before: unknown, after: unknown, path: string, substitutions: ReadonlySet<string>): boolean {
  if (substitutions.has(path) || isDeepStrictEqual(before, after)) return true;
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object' ||
    Array.isArray(before) !== Array.isArray(after)) return false;
  const previous = before as Record<string, unknown>, next = after as Record<string, unknown>;
  const fields = new Set([...Object.keys(previous), ...Object.keys(next)]);
  return [...fields].every(key => {
    const beforeValue = Object.hasOwn(previous, key) ? previous[key] : undefined;
    const afterValue = Object.hasOwn(next, key) ? next[key] : undefined;
    return matchesReviewed(beforeValue, afterValue, path + '/' + pointerPart(key), substitutions);
  });
}
