import { compileGraph } from 'event-driven-design';
import { editorRegistry } from '../../../../lib/editor-catalog.ts';
import { readBoundedJson } from '../../../../lib/read-json.ts';

import { hostBindingIssues } from '../../../../lib/editor-host-bindings.ts';

export async function POST(request: Request) {
  try {
    const body = await readBoundedJson(request, 256 * 1024);
    if (!body || typeof body !== 'object' || Object.keys(body).length !== 2 || !('graph' in body) ||
      !('revision' in body) || typeof body.revision !== 'number' || !Number.isSafeInteger(body.revision) || body.revision < 0) {
      return Response.json({ code: 'INVALID_ARGUMENT' }, { status: 400 });
    }
    const { graph, revision } = body;
    const issues = hostBindingIssues(graph);
    if (issues.length) return Response.json({ revision, issues });
    const result = compileGraph(graph, editorRegistry, { configurationFields: true });
    return Response.json({ revision, issues: result.ok ? [] : result.issues });
  } catch {
    return Response.json({ code: 'INVALID_ARGUMENT' }, { status: 400 });
  }
}
