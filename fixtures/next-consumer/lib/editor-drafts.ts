import 'server-only';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { openDraftRepository } from 'event-driven-design-artifacts/sqlite';
import type { DraftContent } from 'event-driven-design-artifacts/sqlite';
import { canonicalJson } from 'event-driven-design/model';
import type { GraphSpecV2 } from 'event-driven-design/model';
import { catalog } from './editor-catalog.ts';

const scope = { workspaceId: 'local-demo', documentId: 'editor' };
let repository: ReturnType<typeof openDraftRepository> | undefined;

export function isLocalDraftHost(host: string | null): host is string {
  return host !== null && /^(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(host);
}

function store() {
  return repository ??= openDraftRepository(process.env.FBP_DRAFT_DATABASE ?? join(process.cwd(), '.nodeflow-drafts.sqlite'));
}

function lockFor(graph: GraphSpecV2): DraftContent['registryLock'] {
  const identities = [...new Set(graph.nodes.map(node => node.component))].sort();
  const hash = (value: string) => createHash('sha256').update(value).digest('hex');
  return {
    version: 1, policyVersion: 'local-draft@1', representations: [{ id: 'json', version: 1 }],
    bindings: identities.map(component => {
      const descriptor = catalog.components.find(item => `${item.id}@${item.version}` === component);
      if (!descriptor) throw Error('INVALID_DRAFT_COMPONENT');
      // Local draft binding. Release-grade build provenance belongs to the locking host.
      return { component, moduleBindingId: component, contractsDigest: hash(canonicalJson(descriptor)),
        implementationDigest: hash(canonicalJson({ component, source: process.env.FBP_DRAFT_SOURCE_DIGEST! })) };
    }),
  };
}

export async function loadEditorDraft() {
  const result = await store().loadDraft(scope);
  return result.ok ? result.draft.document : undefined;
}

export function saveEditorDraft(expected: number | null, graph: GraphSpecV2, layout: DraftContent['layout']) {
  const content = { graph, layout, registryLock: lockFor(graph) };
  if (expected === null) return store().createDraft(scope, content);
  return store().saveDraft(scope, expected, content);
}
