import { contract, map } from 'event-driven-design';
import { z } from 'zod';
import { durableWait, prepareDurableProfile } from '../../dist/index.js';

export function waitOptions(signalName = 'approved', downstream = true) {
  const input = contract('review-input@1', z.number());
  const output = contract('review-result@1', z.strictObject({ approved: z.boolean() }));
  const registry = { 'durable-wait@1': durableWait(input, output, signalName) };
  const graph = { version: 1, nodes: [{ id: 'review', component: 'durable-wait@1' }], edges: [],
    inputs: { request: { node: 'review', port: 'in' } }, outputs: { result: { node: 'review', port: 'out' } } };
  if (downstream) {
    registry['map@1'] = map(output, output, value => value);
    graph.nodes.push({ id: 'result', component: 'map@1' });
    graph.edges.push({ from: graph.outputs.result, to: { node: 'result', port: 'in' }, capacity: 1 });
    graph.outputs.result = { node: 'result', port: 'out' };
  }
  const bindings = Object.keys(registry).map(component => ({
    component, implementationDigest: 'a'.repeat(64), contractsDigest: 'b'.repeat(64),
  }));
  const adapters = bindings.map(({ component, implementationDigest }) => ({
    component, implementationDigest, adapterVersion: 1, replayPolicy: 'pure',
    ...(component === 'durable-wait@1' && { operator: 'wait' }),
  }));
  return { graph, registry, adapters, identity: { bindings, runtimeVersion: 'test@1', policyVersion: 'test@1',
    serviceProfileDigest: 'c'.repeat(64) } };
}

export const waitProfile = () => prepareDurableProfile(waitOptions());
