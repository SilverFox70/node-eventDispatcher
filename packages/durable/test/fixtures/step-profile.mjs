import { contract, defineFunction } from 'event-driven-design';
import { prepareDurableProfile } from '../../dist/index.js';
import { z } from 'zod';

export function stepProfile() {
  const numeric = contract('step-number@1', z.number());
  const component = defineFunction({
    id: 'increase', version: 1, title: 'Increase', description: '', input: numeric, output: numeric,
    handler: value => value + 1,
  });
  const implementationDigest = 'a'.repeat(64);
  return prepareDurableProfile({
    graph: {
      version: 1, nodes: [{ id: 'A', component: 'increase@1' }, { id: 'B', component: 'increase@1' }],
      edges: [{ from: { node: 'A', port: 'out' }, to: { node: 'B', port: 'in' } }],
      inputs: { request: { node: 'A', port: 'in' } }, outputs: { result: { node: 'B', port: 'out' } },
    },
    registry: { 'increase@1': component },
    identity: {
      bindings: [{ component: 'increase@1', implementationDigest, contractsDigest: 'b'.repeat(64) }],
      runtimeVersion: 'fixture@1', policyVersion: 'test@1', serviceProfileDigest: 'c'.repeat(64),
    },
    adapters: [{ component: 'increase@1', implementationDigest, adapterVersion: 1, replayPolicy: 'pure' }],
  });
}
