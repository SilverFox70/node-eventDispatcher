import { validateGraph } from 'event-driven-design/model';
import type { Catalog, Endpoint, GraphSpecV2 } from 'event-driven-design/model';
import type { EditorIssue, Wire } from './types.js';

export const sameEndpoint = (left: Endpoint, right: Endpoint) => left.node === right.node && left.port === right.port;
export const wireId = (wire: Wire) => JSON.stringify([wire.from.node, wire.from.port, wire.to.node, wire.to.port]);
export const validName = (name: string) => name.length > 0 && name.length <= 128;

export function draftIssues(graph: GraphSpecV2, catalog: Catalog): readonly EditorIssue[] {
  const result = validateGraph(graph, catalog);
  return result.ok ? [] : result.issues;
}

/** Incomplete and stale nodes can stay on a draft while individual valid edits proceed. */
export function topologyIssue(graph: GraphSpecV2, catalog: Catalog): EditorIssue | undefined {
  return draftIssues(graph, catalog).find(issue =>
    !['PORT_CARDINALITY', 'CONFIG_INVALID', 'UNKNOWN_COMPONENT'].includes(issue.code));
}

export function portUsed(graph: GraphSpecV2, side: 'inputs' | 'outputs', endpoint: Endpoint): boolean {
  return Object.values(graph[side]).some(port => sameEndpoint(port, endpoint)) ||
    graph.edges.some(wire => sameEndpoint(side === 'inputs' ? wire.to : wire.from, endpoint));
}
