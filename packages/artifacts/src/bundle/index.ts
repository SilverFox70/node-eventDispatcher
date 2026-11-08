import { createHash } from 'node:crypto';
import { canonicalJson } from 'event-driven-design/model';
import { digest, fields, maxArtifactBytes } from '../model/fields.js';
import type { RegistryLock } from '../model/index.js';
import type { LockedRevision } from '../revisions/profile.js';
import type { GraphLayout } from '../model/index.js';
import type { DraftScope, openDraftRepository } from '../store/index.js';
import { inspectUnsigned } from './model.js';
import type { BindingManifest, GraphBundle } from './model.js';

export type { BindingManifest, GraphBundle };
export type BundleTrust = Readonly<{ registryLock: RegistryLock; bindingManifest: BindingManifest }>;

const hash = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
const bounded = (text: string | Uint8Array) => {
  if ((typeof text === 'string' ? Buffer.byteLength(text, 'utf8') : text.byteLength) > maxArtifactBytes) throw Error('BUNDLE_LIMIT');
};

function validate<T>(operation: () => T): T {
  try { return operation(); }
  catch (error) {
    if (error instanceof Error && /^(?:INVALID_BUNDLE|BUNDLE_[A-Z_]+)$/.test(error.message)) throw error;
    if (error instanceof Error && ['JSON_LIMIT', 'ARTIFACT_LIMIT'].includes(error.message)) throw Error('BUNDLE_LIMIT');
    throw Error('INVALID_BUNDLE');
  }
}

/** Serialize canonical v1 JSON. The source receipt travels as provenance. */
export function writeGraphBundle(revision: LockedRevision, bindingManifest: BindingManifest, layout?: GraphLayout): string {
  return validate(() => {
    const unsigned = canonicalJson({
      format: 'nodeflow.bundle', version: 1, revision, bindingManifest, ...(layout === undefined ? {} : { layout }),
    }, maxArtifactBytes);
    const inspected = inspectUnsigned(JSON.parse(unsigned));
    return canonicalJson({ ...inspected, integrity: hash(unsigned) }, maxArtifactBytes);
  });
}

/** Inspect the detached bundle as data, without resolving any dependency or opening storage. */
export function inspectGraphBundle(input: string | Uint8Array): GraphBundle {
  return validate(() => {
    bounded(input);
    const text = typeof input === 'string' ? input : new TextDecoder('utf-8', { fatal: true }).decode(input);
    const row = fields(JSON.parse(text), ['format', 'version', 'revision', 'bindingManifest', 'integrity'], ['layout']);
    const { integrity, ...unsigned } = row;
    if (!digest(integrity) || integrity !== hash(canonicalJson(unsigned, maxArtifactBytes))) throw Error('BUNDLE_INTEGRITY_MISMATCH');
    return { ...inspectUnsigned(unsigned), integrity: integrity as string };
  });
}

export function assertTrustedBundle(source: GraphBundle, trust: BundleTrust): void {
  const { registryLock } = source.revision;
  if (canonicalJson(registryLock, maxArtifactBytes) !== canonicalJson(trust.registryLock, maxArtifactBytes) ||
    canonicalJson(source.bindingManifest, maxArtifactBytes) !== canonicalJson(trust.bindingManifest, maxArtifactBytes)) {
    throw Error('BUNDLE_BINDING_MISMATCH');
  }
}

/** Use a host-authorized destination. One atomic create refuses existing draft IDs. */
export async function importGraphBundle(input: string | Uint8Array, destination: DraftScope, trust: BundleTrust,
  repository: Pick<ReturnType<typeof openDraftRepository>, 'createDraft'>) {
  const source = inspectGraphBundle(input);
  const { graph, registryLock } = source.revision;
  assertTrustedBundle(source, trust);
  const result = await repository.createDraft(destination, {
    graph, registryLock, layout: source.layout ?? { positions: {}, groups: {} },
  });
  return result.ok ? { ...result, source } : result;
}
