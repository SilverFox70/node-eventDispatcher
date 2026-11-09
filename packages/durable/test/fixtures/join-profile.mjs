import { contract, joinByKey, map } from 'event-driven-design';
import { z } from 'zod';
import { prepareDurableProfile } from '../../dist/index.js';

export const joinInput = name => name === 'stats' ? 'a-stats' : name;

export function joinProfileOptions(names = ['stats', 'species'], limits = {}, downstream = false) {
  const number = contract('join-number@1', z.number());
  const fields = Object.fromEntries(names.map(name => [name, number]));
  const join = joinByKey(fields, { outputId: 'join-result@1', ...limits });
  const registry = { 'join-by-key@1': join };
  const endpoint = (node, port) => ({ node, port });
  const graph = { version: 1, nodes: [{ id: 'join', component: 'join-by-key@1' }], edges: [],
    inputs: Object.fromEntries(names.map(name => [joinInput(name), endpoint('join', name)])),
    outputs: { result: endpoint('join', 'out') } };
  if (downstream) {
    registry['map@1'] = map(join.out.out, join.out.out, value => value);
    graph.nodes.push({ id: 'sink', component: 'map@1' });
    graph.edges.push({ from: endpoint('join', 'out'), to: endpoint('sink', 'in'), capacity: 1 });
    graph.outputs.result = endpoint('sink', 'out');
  }
  const bindings = Object.keys(registry).map(component => ({
    component, implementationDigest: 'a'.repeat(64), contractsDigest: 'b'.repeat(64),
  }));
  const adapters = bindings.map(({ component, implementationDigest }) => ({
    component, implementationDigest, adapterVersion: 1, replayPolicy: 'pure',
    ...(component === 'join-by-key@1' && { operator: 'join-by-key' }),
  }));
  return { graph, registry, adapters, identity: { bindings, runtimeVersion: 'test@1', policyVersion: 'test@1',
    serviceProfileDigest: 'c'.repeat(64) } };
}

export const joinProfile = () => prepareDurableProfile(joinProfileOptions());
