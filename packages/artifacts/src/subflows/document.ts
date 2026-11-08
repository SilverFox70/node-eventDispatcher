import { assertGraphShape, canonicalJson } from 'event-driven-design/model';
import { fields, list, maxArtifactBytes, name, record } from '../model/fields.js';
import type { Registry } from 'event-driven-design';
import type { GraphSpec, PortDescriptor } from 'event-driven-design/model';
import type { Json } from 'event-driven-design';
import type { RegistryLock } from '../model/index.js';

export const maxNodes = 1000;

type PortBinding = Readonly<{ port: string; contract: PortDescriptor }>;

export type SubflowReference = Readonly<{
  instanceId: string;
  revisionId: string;
  bindings: Readonly<{
    inputs: Readonly<Record<string, PortBinding>>;
    outputs: Readonly<Record<string, PortBinding>>;
    configuration?: Readonly<Record<string, Json>>;
  }>;
}>;

/** Graph endpoints can name either a local executable node or a subflow instance. */
export type SubflowDocument = Readonly<{ graph: GraphSpec; subflows: readonly SubflowReference[] }>;
export type SubflowSource = Readonly<{ bundle: string | Uint8Array; composition?: SubflowDocument }>;
export type SubflowTrust = Readonly<{
  registry: Registry;
  registryLock: RegistryLock;
  resolve: (revisionId: string) => SubflowSource | undefined;
}>;
export type SubflowOrigin = Readonly<{
  physicalNodeId: string;
  parentInstancePath: readonly string[];
  sourceRevisionId: string;
  sourceNodeId: string;
}>;

export function snapshotDocument(input: SubflowDocument): SubflowDocument {
  const row = fields(JSON.parse(canonicalJson(input, maxArtifactBytes)), ['graph', 'subflows']);
  assertGraphShape(row.graph);
  for (const candidate of list(row.subflows, maxNodes)) {
    const ref = fields(candidate, ['instanceId', 'revisionId', 'bindings']);
    if (!name(ref.instanceId) || !name(ref.revisionId)) throw Error('INVALID_SUBFLOW_REFERENCE');
    const bindings = fields(ref.bindings, ['inputs', 'outputs'], ['configuration']);
    for (const side of ['inputs', 'outputs']) {
      for (const binding of Object.values(record(bindings[side]))) fields(binding, ['port', 'contract']);
    }
    if (Object.hasOwn(bindings, 'configuration')) record(bindings.configuration);
  }
  return row as SubflowDocument;
}
