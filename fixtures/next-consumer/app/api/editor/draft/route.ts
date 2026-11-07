import type { DraftContent } from 'event-driven-design-artifacts/sqlite';
import { assertGraphShape } from 'event-driven-design/model';
import { hostBindingIssues } from '../../../../lib/editor-host-bindings.ts';
import type { GraphSpecV2 } from 'event-driven-design/model';
import { isLocalDraftHost, saveEditorDraft } from '../../../../lib/editor-drafts.ts';
import { readBoundedJson } from '../../../../lib/read-json.ts';

const fail = (code: string, status: number) => Response.json({ code }, { status });

export async function PUT(request: Request) {
  try {
    const host = request.headers.get('host');
    if (!isLocalDraftHost(host) ||
        request.headers.get('origin') !== `http://${host}`) return fail('DRAFT_FORBIDDEN', 403);
    const value = await readBoundedJson(request, 10 * 1024 * 1024);
    if (!value || typeof value !== 'object' || Object.keys(value).length !== 3 ||
        !('expectedRevision' in value) || !('graph' in value) || !('layout' in value)) return fail('INVALID_DRAFT', 400);
    const { expectedRevision, graph, layout } = value;
    if ((expectedRevision !== null && (typeof expectedRevision !== 'number' ||
        !Number.isSafeInteger(expectedRevision) || expectedRevision < 0)) ||
        !graph || typeof graph !== 'object' || !('version' in graph) || graph.version !== 2 ||
        !('nodes' in graph) || !Array.isArray(graph.nodes)) return fail('INVALID_DRAFT', 400);
    assertGraphShape(graph);
    if (hostBindingIssues(graph).length) return fail('INVALID_DRAFT', 400);
    const result = await saveEditorDraft(expectedRevision, graph as GraphSpecV2, layout as DraftContent['layout']);
    if (result.ok) return Response.json({ revision: result.draft.document.draftRevision });
    return Response.json(result, { status: result.code === 'DRAFT_NOT_FOUND' ? 404 : 409 });
  } catch (error) {
    if (error instanceof Error && /^(INVALID_|ARTIFACT_LIMIT)/.test(error.message)) return fail('INVALID_DRAFT', 400);
    return fail('DRAFT_STORE_ERROR', 503);
  }
}
