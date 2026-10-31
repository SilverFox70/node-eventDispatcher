import type { InspectionSnapshot } from './inspection.js';
import { inspectionVersion } from './inspection.js';
import { metadataRecord, snapshotJsonMetadata } from './contracts.js';
import { validateGraph } from './graph.js';
import { captureTopology } from './inspection/topology.js';
import { FlowError } from '../errors.js';
import { label } from './mermaid/labels.js';
import { writer } from './mermaid/writer.js';
import { graphDiagram } from './mermaid/graph.js';
import { dispatcherDiagram } from './mermaid/dispatcher.js';

/** Browser-safe topology export, ignoring run metrics; structured inspection remains authoritative. */
export function toMermaid(snapshot: InspectionSnapshot): string {
  try {
    const value = snapshotJsonMetadata(snapshot) as unknown as InspectionSnapshot;
    const root = metadataRecord(value);
    if (root.version !== inspectionVersion || !Array.isArray(root.sources) || Object.keys(root).some(key => !['version', 'sources'].includes(key))) throw new FlowError('INVALID_ARGUMENT');
    const lines = ['flowchart LR']; const ids = new Set<string>();
    value.sources.forEach((source, index) => {
      const fields = metadataRecord(source);
      if (typeof source.id !== 'string' || !source.id.length || source.id.length > 128 || ids.has(source.id)) throw new FlowError('INVALID_ARGUMENT');
      ids.add(source.id);
      const prefix = `s${index}`, diagram = writer(lines, prefix);
      lines.push(`  subgraph ${prefix}["${label(source.id)}"]`);
      if (source.kind === 'graph') {
        if (Object.keys(fields).some(key => !['id', 'kind', 'spec', 'catalog', 'run'].includes(key)) || !validateGraph(source.spec, source.catalog).ok) throw new FlowError('INVALID_ARGUMENT');
        graphDiagram(source, diagram);
      } else if (source.kind === 'dispatcher') {
        if (Object.keys(fields).some(key => !['id', 'kind', 'topology'].includes(key))) throw new FlowError('INVALID_ARGUMENT');
        dispatcherDiagram(captureTopology(source.topology), diagram);
      } else throw new FlowError('INVALID_ARGUMENT');
      lines.push('  end');
    });
    return lines.join('\n');
  } catch { throw new FlowError('INVALID_ARGUMENT'); }
}
