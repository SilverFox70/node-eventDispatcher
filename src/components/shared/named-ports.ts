import type { Contract } from '../../contracts.js';
import { assertContract } from '../../contracts.js';
import { FlowError } from '../../errors.js';
import { readArray } from '../../packet/data.js';

/** Capture declaration order and reject ambiguous port lists before process creation. */
export function namedPorts<T, const N extends readonly string[]>(contract: Contract<T>, names: N): { ports: { readonly [K in N[number]]: Contract<T> }; order: readonly N[number][] } {
  assertContract(contract);
  const captured = readArray(names, 'INVALID_ARGUMENT');
  if (captured.length < 2 || captured.some(name => typeof name !== 'string' || name.length === 0 || name.length > 128) ||
    new Set(captured).size !== captured.length) throw new FlowError('INVALID_ARGUMENT');
  const ports = Object.freeze(Object.fromEntries(captured.map(name => [name, contract]))) as { readonly [K in N[number]]: Contract<T> };
  return { ports, order: Object.freeze(captured) as readonly N[number][] };
}
