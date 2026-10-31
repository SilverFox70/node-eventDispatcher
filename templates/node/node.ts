import { defineComponent, defineFunction } from 'event-driven-design';
import type { LookupResult } from './contract.js';
import { request, result } from './contract.js';

export type Lookup = (
  id: string,
  options: Readonly<{ signal: AbortSignal }>,
) => Promise<Readonly<{ label: string }> | null>;
export type LookupDependencies = Readonly<{ lookup: Lookup }>;

/** One read per input by default. Expected absence is data; transport errors propagate. */
export function makeLookupNode({ lookup }: LookupDependencies) {
  const node = defineFunction({
    id: 'lookup-profile', version: 1, title: 'Lookup profile',
    description: 'Read a profile label, preserving absence as a declared result.',
    input: request, output: result,
    handler: async (value, context): Promise<LookupResult> => {
      const profile = await lookup(value.id, { signal: context.signal });
      if (profile === null) return { kind: 'missing', id: value.id };
      return { kind: 'found', id: value.id, label: profile.label };
    },
  });
  return defineComponent({
    ...node,
    effects: ['profile.read'],
    requiredDependencies: ['lookup'],
    examples: [{ in: { in: { id: 'account-123' } }, out: { out: { kind: 'missing', id: 'account-123' } } }],
  });
}
