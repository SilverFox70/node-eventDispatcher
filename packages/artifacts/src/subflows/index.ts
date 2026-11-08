import { compileGraph, describeRegistry } from 'event-driven-design';
import { canonicalJson } from 'event-driven-design/model';
import { inspectGraphBundle } from '../bundle/index.js';
import { maxArtifactBytes } from '../model/fields.js';
import { expand } from './expand.js';
import { snapshotDocument } from './document.js';
import type { ExpansionContext } from './expand.js';
import type { SubflowDocument, SubflowTrust } from './document.js';

export type { SubflowDocument, SubflowOrigin, SubflowReference, SubflowSource, SubflowTrust } from './document.js';

const canonical = (value: unknown) => canonicalJson(value, maxArtifactBytes);

/** Resolve trusted immutable revisions before using the ordinary graph compiler. */
export function compileSubflowGraph(document: SubflowDocument, trust: SubflowTrust) {
  const input = snapshotDocument(document);
  const registry = Object.freeze({ ...trust.registry });
  const catalog = new Map(describeRegistry(registry).components.map(component =>
    [component.id + '@' + component.version, component]));
  const lock = new Map(trust.registryLock.bindings.map(binding => [binding.component, canonical(binding)]));
  const policy = trust.registryLock.policyVersion;
  const representations = canonical(trust.registryLock.representations);
  let remainingSourceBytes = maxArtifactBytes;
  const chargeSource = (value: string | Uint8Array) => {
    remainingSourceBytes -= typeof value === 'string' ? Buffer.byteLength(value) : value.byteLength;
    if (remainingSourceBytes < 0) throw Error('SUBFLOW_LIMIT');
  };
  const sources = new Map<string, ReturnType<ExpansionContext['resolve']>>();
  const resolve: ExpansionContext['resolve'] = revisionId => {
    const cached = sources.get(revisionId);
    if (cached) return cached;
    const source = trust.resolve(revisionId);
    if (!source) throw Error('SUBFLOW_REVISION_NOT_FOUND');
    const bundle = source.bundle;
    chargeSource(bundle);
    const { revision } = inspectGraphBundle(bundle);
    if (revision.revisionId !== revisionId) throw Error('SUBFLOW_REVISION_MISMATCH');
    if (revision.graph.nodes.length === 0) throw Error('SUBFLOW_EMPTY_REVISION');
    if (revision.registryLock.policyVersion !== policy ||
        canonical(revision.registryLock.representations) !== representations ||
        revision.registryLock.bindings.some(binding => lock.get(binding.component) !== canonical(binding))) {
      throw Error('SUBFLOW_BINDING_MISMATCH');
    }
    const captured = { graph: revision.graph, composition: source.composition && snapshotDocument(source.composition) };
    if (captured.composition) chargeSource(canonical(captured.composition));
    sources.set(revisionId, captured);
    return captured;
  };
  const { spec, origins } = expand(input, { catalog, resolve, active: new Set(), visits: 0 });
  if (spec.nodes.some(node => !lock.has(node.component))) throw Error('SUBFLOW_BINDING_MISMATCH');
  canonical(spec);
  return {
    spec,
    origins: Object.freeze(origins.map(origin => Object.freeze({
      ...origin, parentInstancePath: Object.freeze(origin.parentInstancePath),
    }))),
    compiled: compileGraph(spec, registry),
  };
}
