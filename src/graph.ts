import type { Registry } from './component.js';
import { describeRegistry } from './component.js';
import { validateGraph } from './model/graph.js';
import type { GraphSpec } from './model/graph.js';
import type { Catalog } from './model/catalog.js';
import { snapshotJsonMetadata } from './model/contracts.js';
import type { ValidationResult } from './model/contracts.js';
import { FlowError } from './errors.js';
import { readRecord } from './packet/data.js';

declare const compiled: unique symbol;
export type CompiledGraph = Readonly<{ [compiled]: true }>;
export type CompileResult = { ok: true; graph: CompiledGraph } | Extract<ValidationResult, { ok: false }>;
export type GraphDefinition = Readonly<{ spec: GraphSpec; catalog: Catalog; registry: Registry }>;

const definitions = new WeakMap<CompiledGraph, GraphDefinition>();

/** Capture authoritative definitions without invoking any process factory. */
export function compileGraph(spec: unknown, registry: Registry): CompileResult {
  let catalog: Catalog;
  let capturedRegistry: Registry;
  let snapshot: GraphSpec;
  try {
    capturedRegistry = Object.freeze(readRecord(registry, 'INVALID_ARGUMENT')) as Registry;
    catalog = describeRegistry(capturedRegistry);
  } catch (error) {
    const code = error instanceof FlowError && error.code === 'CONTRACT_ID_CONFLICT'
      ? error.code : 'INVALID_GRAPH';
    return { ok: false, issues: [{ code, path: '$.registry' }] };
  }
  try {
    snapshot = snapshotJsonMetadata(spec) as unknown as GraphSpec;
  } catch {
    return { ok: false, issues: [{ code: 'INVALID_GRAPH', path: '$' }] };
  }
  const result = validateGraph(snapshot, catalog);
  if (!result.ok) return result;
  const graph = Object.freeze({}) as CompiledGraph;
  definitions.set(graph, Object.freeze({
    spec: snapshot,
    catalog,
    registry: capturedRegistry,
  }));
  return { ok: true, graph };
}

/** Internal handle admission shared by later runtime/inspection consumers. */
export function getGraphDefinition(graph: CompiledGraph): GraphDefinition {
  const definition = definitions.get(graph);
  if (!definition) throw new FlowError('INVALID_ARGUMENT');
  return definition;
}
