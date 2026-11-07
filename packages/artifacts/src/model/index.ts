import { assertGraphShape, canonicalJson, readTaskPolicy, validateRegressionFixture } from 'event-driven-design/model';
import type { GraphSpec, RegressionFixture } from 'event-driven-design/model';
import { componentIdentity, fields, invalid, maxArtifactBytes, name } from './fields.js';
import { checkLayout } from './layout.js';
import type { GraphLayout } from './layout.js';
import { checkRegistry } from './registry.js';
import type { RegistryLock } from './registry.js';

export type { GraphLayout, RegistryLock, RegressionFixture };
export type GraphDocument = Readonly<{
  format: 'nodeflow.document'; version: 1; workspaceId: string; documentId: string; draftRevision: number;
  graph: GraphSpec; layout: GraphLayout; registryLock: RegistryLock;
}>;

function snapshot(value: unknown): unknown {
  try { return JSON.parse(canonicalJson(value, maxArtifactBytes)); }
  catch (error) {
    if (error instanceof Error && error.message === 'JSON_LIMIT') throw Error('ARTIFACT_LIMIT');
    return invalid();
  }
}

/** Read a detached document without compiling its draft wiring or resolving module bindings. */
export function parseGraphDocument(value: unknown): GraphDocument {
  const row = fields(snapshot(value), ['format', 'version', 'workspaceId', 'documentId', 'draftRevision', 'graph', 'layout', 'registryLock']);
  if (row.format !== 'nodeflow.document' || row.version !== 1 || !name(row.workspaceId) || !name(row.documentId) ||
    typeof row.draftRevision !== 'number' || !Number.isSafeInteger(row.draftRevision) || row.draftRevision < 0) invalid();
  const graph = row.graph;
  try { assertGraphShape(graph); } catch { return invalid(); }
  const { nodes, edges, inputs, outputs } = graph;
  if (nodes.length > 1000 || edges.length + Object.keys(inputs).length + Object.keys(outputs).length > 4096) {
    throw Error('ARTIFACT_LIMIT');
  }
  const ids = new Set<string>();
  const components = new Set<string>();
  for (const node of nodes) {
    if (!name(node.id) || !componentIdentity(node.component) || ids.has(node.id)) invalid();
    const policy = {
      ...(Object.hasOwn(node, 'taskTimeoutMs') ? { taskTimeoutMs: node.taskTimeoutMs } : {}),
      ...(Object.hasOwn(node, 'retry') ? { retry: node.retry } : {}),
    };
    try { readTaskPolicy(policy); } catch { return invalid(); }
    ids.add(node.id);
    components.add(node.component);
  }
  if ([...Object.keys(inputs), ...Object.keys(outputs)].some(port => !name(port))) invalid();
  for (const edge of edges) {
    if (edge.capacity !== undefined && (!Number.isInteger(edge.capacity) || edge.capacity < 1 || edge.capacity > 256)) invalid();
  }
  for (const endpoint of [...Object.values(inputs), ...Object.values(outputs), ...edges.flatMap(edge => [edge.from, edge.to])]) {
    if (!ids.has(endpoint.node) || !name(endpoint.port)) invalid();
  }
  checkLayout(row.layout, ids);
  checkRegistry(row.registryLock, components);
  return row as GraphDocument;
}

/** Check an admitted document against the registry lock independently supplied by its host. */
export function assertRegistryLockMatches(document: GraphDocument, trustedLock: RegistryLock): void {
  if (canonicalJson(document.registryLock, maxArtifactBytes) !== canonicalJson(trustedLock, maxArtifactBytes)) {
    throw Error('REGISTRY_LOCK_MISMATCH');
  }
}

export function parseArtifactFixture(value: unknown): RegressionFixture {
  const copy = snapshot(value);
  if (!validateRegressionFixture(copy).ok) throw Error('INVALID_FIXTURE');
  return copy as RegressionFixture;
}

export function fingerprintPreimages(value: unknown) {
  const { graph, layout, registryLock } = parseGraphDocument(value);
  return {
    semantic: canonicalJson({ format: 'nodeflow.semantic', version: 1, graph, registryLock }),
    layout: canonicalJson({ format: 'nodeflow.layout', version: 1, layout }),
  };
}
