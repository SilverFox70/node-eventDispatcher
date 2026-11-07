import { fingerprintGraphDocument } from '../fingerprint.js';
import { digest, fields, list, name } from '../model/fields.js';
import type { GraphLayout } from '../model/index.js';
import type { LockedRevision } from '../revisions/profile.js';

export type BindingManifest = Readonly<{ version: 1; bindings: readonly Readonly<{
  moduleBindingId: string; specifier: string; exportName: string;
}>[] }>;
export type GraphBundle = Readonly<{
  format: 'nodeflow.bundle'; version: 1; revision: LockedRevision; layout?: GraphLayout;
  bindingManifest: BindingManifest; integrity: string;
}>;

const validSpecifier = (value: unknown): boolean =>
  typeof value === 'string' && value.length <= 256 &&
  /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+(?:\/[a-z0-9._-]+)*$/.test(value) &&
  !value.split('/').some(part => part === '.' || part === '..');

export function inspectUnsigned(value: unknown): Omit<GraphBundle, 'integrity'> {
  const row = fields(value, ['format', 'version', 'revision', 'bindingManifest'], ['layout']);
  if (row.format !== 'nodeflow.bundle' || row.version !== 1) throw Error('INVALID_BUNDLE');
  const revision = fields(row.revision, ['format', 'version', 'revisionId', 'documentId', 'semanticHash', 'graph',
    'registryLock', 'testReceipt', 'createdAt', 'actorId']);
  const receipt = fields(revision.testReceipt, ['version', 'receiptId', 'semanticHash', 'policyVersion', 'outcome',
    'fixtureHash', 'assertionSetHash', 'serviceProfileHash', 'runtimeVersion']);
  if (revision.format !== 'nodeflow.revision' || revision.version !== 1 ||
    ![revision.revisionId, revision.documentId, revision.actorId, receipt.receiptId, receipt.runtimeVersion,
      receipt.policyVersion].every(name) ||
    typeof revision.createdAt !== 'string' || new Date(revision.createdAt).toISOString() !== revision.createdAt ||
    receipt.version !== 1 || receipt.outcome !== 'passed' ||
    ![revision.semanticHash, receipt.fixtureHash, receipt.assertionSetHash, receipt.serviceProfileHash].every(digest)) {
    throw Error('INVALID_BUNDLE');
  }
  const { semanticHash } = fingerprintGraphDocument({
    format: 'nodeflow.document', version: 1, workspaceId: 'bundle', documentId: revision.documentId,
    draftRevision: 0, graph: revision.graph, registryLock: revision.registryLock,
    layout: Object.hasOwn(row, 'layout') ? row.layout : { positions: {}, groups: {} },
  });
  const lock = (revision as LockedRevision).registryLock;
  if (revision.semanticHash !== semanticHash || receipt.semanticHash !== semanticHash ||
    receipt.policyVersion !== lock.policyVersion) throw Error('BUNDLE_CONTENT_MISMATCH');

  const manifest = fields(row.bindingManifest, ['version', 'bindings']);
  const bindings = list(manifest.bindings, 1000);
  const expected = new Set(lock.bindings.map(binding => binding.moduleBindingId));
  if (manifest.version !== 1 || bindings.length !== expected.size) throw Error('INVALID_BUNDLE');
  let previous = '';
  for (const binding of bindings) {
    const { moduleBindingId, specifier, exportName } = fields(binding, ['moduleBindingId', 'specifier', 'exportName']);
    if (!name(moduleBindingId) || moduleBindingId <= previous || !expected.delete(moduleBindingId) ||
      !validSpecifier(specifier) || !name(exportName) || !/^[A-Za-z_$][\w$]*$/.test(exportName)) throw Error('INVALID_BUNDLE');
    previous = moduleBindingId;
  }
  return row as Omit<GraphBundle, 'integrity'>;
}
