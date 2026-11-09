import { broadcast, contract, filter, map, merge } from 'event-driven-design';
import { prepareDurableProfile } from '../../dist/index.js';
import { z } from 'zod';

export function routingProfile() {
  const number = contract('route-number@1', z.number());
  const names = ['left', 'right'];
  const registry = {
    'broadcast@1': broadcast(number, names),
    'map@1': map(number, number, value => { if (value < 0) throw Error('bad branch'); return value + 10; }),
    'filter@1': filter(number, value => value !== 0),
    'merge@1': merge(number, names),
  };
  const nodes = ['fork', 'left', 'right', 'merge'].map((id, index) => ({ id, component: Object.keys(registry)[index] }));
  const endpoint = (node, port) => ({ node, port });
  const edge = (from, out, to, input) => ({ from: endpoint(from, out), to: endpoint(to, input), capacity: 1 });
  const graph = { version: 1, nodes, edges: [
    edge('fork', 'left', 'left', 'in'), edge('fork', 'right', 'right', 'in'),
    edge('left', 'out', 'merge', 'left'), { from: endpoint('right', 'out'), to: endpoint('merge', 'right') },
  ], inputs: { request: endpoint('fork', 'in') }, outputs: { result: endpoint('merge', 'out') } };
  const bindings = Object.keys(registry).map(component => ({
    component, implementationDigest: 'a'.repeat(64), contractsDigest: 'b'.repeat(64),
  }));
  const adapters = bindings.map(({ component, implementationDigest }) => ({
    component, implementationDigest, adapterVersion: 1, replayPolicy: 'pure',
    ...(component !== 'map@1' && { operator: component.split('@')[0] }),
  }));
  return prepareDurableProfile({
    graph, registry, adapters, identity: { bindings, runtimeVersion: 'test@1', policyVersion: 'test@1',
      serviceProfileDigest: 'c'.repeat(64) },
  });
}
