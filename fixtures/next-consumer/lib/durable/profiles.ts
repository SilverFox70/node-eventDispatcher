import { contract, map } from 'event-driven-design';
import { durableWait, prepareDurableProfile } from 'event-driven-design-durable';
import type { DurableProfileOptions } from 'event-driven-design-durable';
import { z } from 'zod';

const number = contract('durable-demo-number@1', z.number());
export const signal = contract('durable-demo-signal@1', z.strictObject({ approved: z.boolean() }));

export function demoDurableProfile(kind: 'wait' | 'provider') {
  const registry = kind === 'wait' ? {
    'durable-wait@1': durableWait(number, signal, 'approved'),
    'map@1': map(signal, signal, value => value),
  } : { 'map@1': map(number, number, value => value + 1) };
  const first = kind === 'wait' ? 'durable-wait@1' : 'map@1';
  const bindings = [...new Set([first, 'map@1'])].map(component => ({
    component, implementationDigest: 'a'.repeat(64), contractsDigest: 'b'.repeat(64),
  }));
  const options: DurableProfileOptions = {
    registry: Object.fromEntries(Object.entries(registry)),
    graph: { version: 1, nodes: [{ id: 'first', component: first }, { id: 'result', component: 'map@1' }],
      inputs: { request: { node: 'first', port: 'in' } }, outputs: { result: { node: 'result', port: 'out' } },
      edges: [{ from: { node: 'first', port: 'out' }, to: { node: 'result', port: 'in' } }] },
    adapters: bindings.map(({ component, implementationDigest }) => ({
      component, implementationDigest, adapterVersion: 1, replayPolicy: 'pure',
      ...(component === 'durable-wait@1' && { operator: 'wait' }),
    })),
    identity: { bindings, runtimeVersion: 'demo@1', policyVersion: 'demo@1', serviceProfileDigest: 'c'.repeat(64) },
  };
  return prepareDurableProfile(options);
}
