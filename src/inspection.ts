import type { GraphSpec } from './model/graph.js';
import { validateGraph } from './model/graph.js';
import type { Catalog } from './model/catalog.js';
import type { NetworkRun } from './runtime.js';
import { getRunDefinition } from './runtime.js';
import type { Dispatcher } from './dispatcher.js';
import type { InspectionSnapshot, InspectionSource } from './model/inspection.js';
import { inspectionVersion } from './model/inspection.js';
import { snapshotJsonMetadata } from './model/contracts.js';
import { captureTopology } from './model/inspection/topology.js';
import { dataIdentity } from './inspection/identity.js';
import { readRecord } from './packet/data.js';
import { FlowError } from './errors.js';
export type InspectionScope = Readonly<{
  addGraph(id: string, source: { spec: GraphSpec; catalog: Catalog; run?: NetworkRun }): () => void;
  addDispatcher(id: string, dispatcher: Dispatcher): () => void;
  snapshot(): InspectionSnapshot;
}>;

/** Explicit live registrations; disposing releases references without changing application execution. */
export function createInspectionScope(): InspectionScope {
  const sources = new Map<string, { token: object; read: () => InspectionSource }>();
  function available(id: string): void {
    if (typeof id !== 'string' || id.length === 0 || id.length > 128) throw new FlowError('INVALID_ARGUMENT');
    if (sources.has(id)) throw new FlowError('DUPLICATE_SOURCE');
  }
  function add(id: string, read: () => InspectionSource): () => void {
    available(id); // A custom dispatcher inspector may reenter registration.
    const token = Object.freeze({});
    sources.set(id, { token, read });
    return () => { if (sources.get(id)?.token === token) sources.delete(id); };
  }
  return Object.freeze({
    addGraph(id, source) {
      available(id);
      let spec: GraphSpec, catalog: Catalog, fields: Record<string, unknown>;
      try {
        fields = readRecord(source, 'INVALID_GRAPH');
        if (Object.keys(fields).some(key => !['spec', 'catalog', 'run'].includes(key))) throw new FlowError('INVALID_GRAPH');
        spec = snapshotJsonMetadata(fields.spec) as unknown as GraphSpec;
        catalog = snapshotJsonMetadata(fields.catalog) as unknown as Catalog;
        if (!validateGraph(spec, catalog).ok) throw new FlowError('INVALID_GRAPH');
      } catch { throw new FlowError('INVALID_GRAPH'); }
      const run = fields.run as NetworkRun | undefined;
      if (run !== undefined) {
        try {
          const definition = getRunDefinition(run);
          if (dataIdentity(snapshotJsonMetadata({ spec, catalog })) !== dataIdentity(snapshotJsonMetadata({ spec: definition.spec, catalog: definition.catalog }))) throw new FlowError('RUN_GRAPH_MISMATCH');
        } catch { throw new FlowError('RUN_GRAPH_MISMATCH'); }
      }
      return add(id, () => ({ id, kind: 'graph', spec, catalog, run: run?.snapshot() ?? null }));
    },
    addDispatcher(id, dispatcher) {
      available(id);
      const fields = readRecord(dispatcher, 'INVALID_ARGUMENT');
      if (typeof fields.inspect !== 'function') throw new FlowError('INVALID_ARGUMENT');
      const inspect = fields.inspect as () => unknown;
      const read = () => {
        try { return captureTopology(inspect.call(dispatcher)); }
        catch { throw new FlowError('INVALID_ARGUMENT'); }
      };
      read();
      return add(id, () => ({ id, kind: 'dispatcher', topology: read() }));
    },
    snapshot() {
      return snapshotJsonMetadata({ version: inspectionVersion, sources: [...sources.values()].map(source => source.read()) }) as unknown as InspectionSnapshot;
    }
  });
}
