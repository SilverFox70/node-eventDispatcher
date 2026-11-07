import { compileGraph } from 'event-driven-design';
import type { Registry } from 'event-driven-design';
import { fingerprintGraphDocument } from '../fingerprint.js';
import { assertRegistryLockMatches, parseGraphDocument } from '../model/index.js';
import type { RegistryLock } from '../model/index.js';
import type { LockedRevision } from './profile.js';

/** Check content and the host's exact lock before resolving executable bindings. */
export function compileLockedRevision(revision: LockedRevision, trustedLock: RegistryLock, resolve: () => Registry) {
  const document = parseGraphDocument({
    format: 'nodeflow.document', version: 1, workspaceId: 'locked', documentId: revision.documentId, draftRevision: 0,
    graph: revision.graph, registryLock: revision.registryLock, layout: { positions: {}, groups: {} },
  });
  const { semanticHash } = fingerprintGraphDocument(document);
  if (revision.format !== 'nodeflow.revision' || revision.version !== 1 ||
    revision.semanticHash !== semanticHash || revision.testReceipt.semanticHash !== semanticHash ||
    revision.testReceipt.outcome !== 'passed' || revision.testReceipt.policyVersion !== document.registryLock.policyVersion) throw Error('LOCKED_CONTENT_MISMATCH');
  assertRegistryLockMatches(document, trustedLock);
  return compileGraph(document.graph, resolve());
}
