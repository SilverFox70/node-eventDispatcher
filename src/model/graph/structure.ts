import { metadataRecord } from '../contracts.js';
import type { GraphSpec, Endpoint } from '../graph.js';

export function isName(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128;
}

function fields(value: unknown, required: string[], optional: string[] = []): Record<string, unknown> {
  const record = metadataRecord(value);
  if (required.some(key => !Object.hasOwn(record, key)) ||
    Object.keys(record).some(key => !required.includes(key) && !optional.includes(key))) throw Error('INVALID_GRAPH');
  return record;
}

function endpoint(value: unknown): asserts value is Endpoint {
  fields(value, ['node', 'port']);
}

/** Shape checking precedes endpoint resolution, so malformed graphs have one stable error. */
export function assertGraphShape(value: unknown): asserts value is GraphSpec {
  const graph = fields(value, ['version', 'nodes', 'edges', 'inputs', 'outputs']);
  if (graph.version !== 1 || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) throw Error('INVALID_GRAPH');
  for (const node of graph.nodes) fields(node, ['id', 'component']);
  for (const edge of graph.edges) {
    const record = fields(edge, ['from', 'to'], ['capacity']);
    endpoint(record.from);
    endpoint(record.to);
  }
  for (const side of ['inputs', 'outputs']) {
    for (const target of Object.values(metadataRecord(graph[side]))) endpoint(target);
  }
}
