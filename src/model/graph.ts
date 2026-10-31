import type { Catalog } from './catalog.js';
import { validateCatalog } from './catalog.js';
import { contractsCompatible, snapshotJsonMetadata } from './contracts.js';
import type { ValidationResult } from './contracts.js';
import { assertGraphShape, isName } from './graph/structure.js';
import { readTaskPolicy } from './graph/task-policy.js';
import type { TaskPolicy } from './graph/task-policy.js';
export type Endpoint = Readonly<{ node: string; port: string }>;
export type GraphSpec = Readonly<{
  version: 1; nodes: readonly (Readonly<{ id: string; component: string }> & TaskPolicy)[];
  edges: readonly Readonly<{ from: Endpoint; to: Endpoint; capacity?: number }>[];
  inputs: Readonly<Record<string, Endpoint>>; outputs: Readonly<Record<string, Endpoint>>;
}>;
/** Validate serializable wiring without invoking application code. */
export function validateGraph(value: unknown, catalog: Catalog): ValidationResult {
  let safeCatalog: Catalog;
  try { safeCatalog = snapshotJsonMetadata(catalog) as unknown as Catalog; }
  catch { return { ok: false, issues: [{ code: 'INVALID_CATALOG', path: '$' }] }; }
  const catalogResult = validateCatalog(safeCatalog);
  if (!catalogResult.ok) return catalogResult;
  const issues: { code: string; path: string }[] = [];
  const issue = (code: string, path: string): void => { issues.push({ code, path }); };
  try {
    const spec = snapshotJsonMetadata(value) as unknown as GraphSpec;
    assertGraphShape(spec);
    const channelCount = spec.edges.length + Object.keys(spec.inputs).length + Object.keys(spec.outputs).length;
    if (spec.nodes.length > 1000 || channelCount > 4096) {
      return { ok: false, issues: [{ code: 'GRAPH_LIMIT', path: '$' }] };
    }
    const components = new Map(safeCatalog.components.map(item => [`${item.id}@${item.version}`, item]));
    const nodes = new Map<string, Catalog['components'][number]>();
    const ids = new Set<string>();
    spec.nodes.forEach((node, index) => {
      const path = `$.nodes[${index}]`;
      if (!isName(node.id) || typeof node.component !== 'string' || node.component.length === 0) {
        issue('INVALID_GRAPH', path);
        return;
      }
      for (const field of ['taskTimeoutMs', 'retry'] as const) {
        if (Object.hasOwn(node, field)) {
          try { readTaskPolicy({ [field]: node[field] }); }
          catch { issue('INVALID_TIMEOUT_POLICY', `${path}.${field}`); }
        }
      }
      if (ids.has(node.id)) issue('DUPLICATE_ID', `${path}.id`);
      ids.add(node.id);
      const component = components.get(node.component);
      if (!component) issue('UNKNOWN_COMPONENT', `${path}.component`);
      else nodes.set(node.id, component);
    });
    const counts = new Map<string, number>();
    const adjacency = new Map<string, string[]>();
    const endpoint = (value: Endpoint, side: 'in' | 'out', path: string) => {
      if (!isName(value.node) || !isName(value.port)) {
        issue('INVALID_GRAPH', path);
        return undefined;
      }
      const node = nodes.get(value.node);
      if (!node || !Object.hasOwn(node[side], value.port)) {
        issue('UNKNOWN_PORT', path);
        return undefined;
      }
      const key = JSON.stringify([value.node, side, value.port]);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return node[side][value.port];
    };
    spec.edges.forEach((edge, index) => {
      const path = `$.edges[${index}]`;
      if (edge.capacity !== undefined &&
        (!Number.isInteger(edge.capacity) || edge.capacity < 1 || edge.capacity > 256)) {
        issue('INVALID_CAPACITY', `${path}.capacity`);
      }
      const from = endpoint(edge.from, 'out', `${path}.from`), to = endpoint(edge.to, 'in', `${path}.to`);
      if (from && to) {
        if (!contractsCompatible(from, to)) issue('CONTRACT_MISMATCH', path);
        const targets = adjacency.get(edge.from.node) ?? [];
        targets.push(edge.to.node); adjacency.set(edge.from.node, targets);
      }
    });
    for (const [side, ports] of [['in', spec.inputs], ['out', spec.outputs]] as const) {
      for (const [port, target] of Object.entries(ports)) {
        const path = `$.${side === 'in' ? 'inputs' : 'outputs'}[${JSON.stringify(port)}]`;
        if (!isName(port)) issue('INVALID_GRAPH', path);
        endpoint(target, side, path);
      }
    }
    for (const [id, node] of nodes) {
      const index = spec.nodes.findIndex(node => node.id === id);
      for (const side of ['in', 'out'] as const) {
        for (const port of Object.keys(node[side])) {
          if (counts.get(JSON.stringify([id, side, port])) !== 1) {
            issue('PORT_CARDINALITY', `$.nodes[${index}].${side}[${JSON.stringify(port)}]`);
          }
        }
      }
    }
    const visited = new Set<string>(), active = new Set<string>();
    const visit = (id: string): boolean => {
      if (active.has(id)) return true;
      if (visited.has(id)) return false;
      visited.add(id); active.add(id);
      for (const next of adjacency.get(id) ?? []) if (visit(next)) return true;
      active.delete(id); return false;
    };
    if ([...nodes.keys()].some(visit)) issue('CYCLE', '$.edges');
  } catch { issue('INVALID_GRAPH', '$'); }
  issues.sort((a, b) => {
    const left = `${a.path}\0${a.code}`, right = `${b.path}\0${b.code}`;
    return Number(left > right) - Number(left < right);
  });
  return issues.length ? { ok: false, issues } : { ok: true };
}
