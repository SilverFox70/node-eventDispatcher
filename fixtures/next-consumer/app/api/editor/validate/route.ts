import { compileGraph } from 'event-driven-design';
import { editorRegistry } from '../../../../lib/editor-catalog.ts';
import { readBoundedJson } from '../../../../lib/read-json.ts';

const reserved = new Set(['serviceBindings', 'credentials']);
function containsHostBinding(value: unknown): boolean {
  return value !== null && typeof value === 'object' &&
    Object.entries(value).some(([key, child]) => reserved.has(key) || containsHostBinding(child));
}

export async function POST(request: Request) {
  try {
    const body = await readBoundedJson(request, 256 * 1024);
    if (!body || typeof body !== 'object' || Object.keys(body).length !== 2 || !('graph' in body) ||
      !('revision' in body) || typeof body.revision !== 'number' || !Number.isSafeInteger(body.revision) || body.revision < 0) {
      return Response.json({ code: 'INVALID_ARGUMENT' }, { status: 400 });
    }
    const { graph, revision } = body;
    if (graph && typeof graph === 'object' && 'nodes' in graph && Array.isArray(graph.nodes)) {
      const issues = graph.nodes.flatMap((node, index) =>
        containsHostBinding(node?.config) ? [{ code: 'HOST_BINDING_FORBIDDEN', path: `$.nodes[${index}].config` }] : []);
      if (issues.length) return Response.json({ revision, issues });
    }
    const result = compileGraph(graph, editorRegistry, { configurationFields: true });
    return Response.json({ revision, issues: result.ok ? [] : result.issues });
  } catch {
    return Response.json({ code: 'INVALID_ARGUMENT' }, { status: 400 });
  }
}
