import { canonicalJson } from 'event-driven-design/model';
import type { ComponentDescriptorV2, Endpoint, GraphSpec } from 'event-driven-design/model';
import { name } from '../model/fields.js';
import type { SubflowReference } from './document.js';

type Side = 'inputs' | 'outputs';

export function bindPorts(side: Side, child: GraphSpec, bindings: SubflowReference['bindings'],
  catalog: ReadonlyMap<string, ComponentDescriptorV2>, physicalIds: ReadonlyMap<string, string>) {
  const components = new Map(child.nodes.map(node => [node.id, node.component]));
  const exposures = child[side];
  const mapped = new Set<string>();
  const entries: [string, Endpoint][] = [];
  for (const [alias, binding] of Object.entries(bindings[side])) {
    if (!name(alias) || !name(binding.port) || mapped.has(binding.port) || !Object.hasOwn(exposures, binding.port)) {
      throw Error('SUBFLOW_PORT_MISMATCH');
    }
    const target = exposures[binding.port]!;
    const descriptor = catalog.get(components.get(target.node)!)?.[side === 'inputs' ? 'in' : 'out'];
    if (!descriptor || !Object.hasOwn(descriptor, target.port) ||
        canonicalJson(descriptor[target.port]) !== canonicalJson(binding.contract)) throw Error('SUBFLOW_PORT_MISMATCH');
    mapped.add(binding.port);
    entries.push([alias, { node: physicalIds.get(target.node)!, port: target.port }]);
  }
  if (mapped.size !== Object.keys(exposures).length) throw Error('SUBFLOW_PORT_MISMATCH');
  return new Map(entries);
}
