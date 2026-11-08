import { createHash } from 'node:crypto';
import { canonicalJson } from 'event-driven-design/model';
import type { ComponentDescriptorV2, Endpoint, GraphSpec, GraphSpecV2 } from 'event-driven-design/model';
import { maxArtifactBytes, name } from '../model/fields.js';
import { bindPorts } from './ports.js';
import { maxNodes } from './document.js';
import type { SubflowDocument, SubflowOrigin, SubflowReference } from './document.js';

const prefix = 'subflow:';
const maxChannels = 4096;
const maxDepth = 16;
type Side = 'inputs' | 'outputs';

export type Expansion = { spec: GraphSpec; origins: SubflowOrigin[] };
export type ExpansionContext = {
  catalog: ReadonlyMap<string, ComponentDescriptorV2>;
  resolve: (revisionId: string) => { graph: GraphSpec; composition?: SubflowDocument };
  active: Set<string>;
  visits: number;
};

function resolveChild(ref: SubflowReference, context: ExpansionContext, depth: number): Expansion {
  const { revisionId } = ref;
  if (context.active.has(revisionId)) throw Error('SUBFLOW_RECURSION');
  if (depth > maxDepth || ++context.visits > maxNodes) throw Error('SUBFLOW_LIMIT');
  const { graph, composition } = context.resolve(revisionId);
  if (!composition) {
    if (graph.nodes.some(node => node.id.startsWith(prefix))) throw Error('SUBFLOW_PROVENANCE_MISMATCH');
    return { spec: graph, origins: [] };
  }
  context.active.add(revisionId);
  const expanded = expand(composition, context, depth);
  context.active.delete(revisionId);
  if (canonicalJson(expanded.spec, maxArtifactBytes) !== canonicalJson(graph, maxArtifactBytes)) {
    throw Error('SUBFLOW_PROVENANCE_MISMATCH');
  }
  return expanded;
}

function mount(ref: SubflowReference, child: Expansion, context: ExpansionContext) {
  const ids = new Map<string, string>();
  const origins: SubflowOrigin[] = [];
  const priorOrigins = new Map(child.origins.map(origin => [origin.physicalNodeId, origin]));
  const configuration = ref.bindings.configuration ?? {};
  const remaining = new Set(Object.keys(configuration));
  const nodes: GraphSpecV2['nodes'] = child.spec.nodes.map(node => {
    const physicalNodeId = prefix + createHash('sha256')
      .update(JSON.stringify([ref.instanceId, ref.revisionId, node.id])).digest('hex');
    ids.set(node.id, physicalNodeId);
    const prior = priorOrigins.get(node.id);
    origins.push({
      physicalNodeId,
      parentInstancePath: [ref.instanceId, ...(prior?.parentInstancePath ?? [])],
      sourceRevisionId: prior?.sourceRevisionId ?? ref.revisionId,
      sourceNodeId: prior?.sourceNodeId ?? node.id,
    });
    const configured = remaining.delete(node.id);
    if (configured && !context.catalog.get(node.component)?.configuration) throw Error('SUBFLOW_CONFIGURATION_MISMATCH');
    return { ...node, id: physicalNodeId, ...(configured ? { config: configuration[node.id]! } : {}) };
  });
  if (remaining.size) throw Error('SUBFLOW_CONFIGURATION_MISMATCH');
  const map = (endpoint: Endpoint) => ({ node: ids.get(endpoint.node)!, port: endpoint.port });
  return {
    nodes, origins,
    edges: child.spec.edges.map(edge => ({ ...edge, from: map(edge.from), to: map(edge.to) })),
    inputs: bindPorts('inputs', child.spec, ref.bindings, context.catalog, ids),
    outputs: bindPorts('outputs', child.spec, ref.bindings, context.catalog, ids),
  };
}

export function expand(document: SubflowDocument, context: ExpansionContext, depth = 0): Expansion {
  const { graph, subflows } = document;
  const ids = new Set<string>();
  const claim = (id: string) => {
    if (!name(id) || id.startsWith(prefix) || ids.has(id)) throw Error('SUBFLOW_ID_CONFLICT');
    ids.add(id);
  };
  for (const node of graph.nodes) claim(node.id);
  for (const ref of subflows) claim(ref.instanceId);

  const nodes: GraphSpecV2['nodes'][number][] = [...graph.nodes];
  const edges: GraphSpec['edges'][number][] = [];
  const origins: SubflowOrigin[] = [];
  const instances = new Map<string, ReturnType<typeof mount>>();
  const channels = graph.edges.length + Object.keys(graph.inputs).length + Object.keys(graph.outputs).length;
  const checkSize = () => {
    if (nodes.length > maxNodes || edges.length + channels > maxChannels) throw Error('SUBFLOW_LIMIT');
  };
  checkSize();
  for (const ref of subflows) {
    const mounted = mount(ref, resolveChild(ref, context, depth + 1), context);
    nodes.push(...mounted.nodes);
    edges.push(...mounted.edges);
    checkSize();
    origins.push(...mounted.origins);
    instances.set(ref.instanceId, mounted);
  }
  const endpoint = (target: Endpoint, side: Side) => {
    const instance = instances.get(target.node);
    if (!instance) {
      if (!ids.has(target.node)) throw Error('SUBFLOW_PORT_MISMATCH');
      return target;
    }
    const resolved = instance[side].get(target.port);
    if (!resolved) throw Error('SUBFLOW_PORT_MISMATCH');
    return resolved;
  };
  const exposures = (side: Side) => Object.fromEntries(Object.entries(graph[side])
    .map(([port, target]) => [port, endpoint(target, side)]));
  for (const edge of graph.edges) edges.push({ ...edge, from: endpoint(edge.from, 'outputs'), to: endpoint(edge.to, 'inputs') });
  const version = graph.version === 2 || nodes.some(node => Object.hasOwn(node, 'config')) ? 2 : 1;
  return { spec: { version, nodes, edges, inputs: exposures('inputs'), outputs: exposures('outputs') }, origins };
}
