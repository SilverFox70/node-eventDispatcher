import 'server-only';
import { createHash } from 'node:crypto';
import { compileGraph, packet } from 'event-driven-design';
import type { CompiledGraph, Contract, GraphSpecV2, Json, Packet, Registry } from 'event-driven-design';
import { hostBindingIssues } from './editor-host-bindings.ts';
import { editorRegistry } from './editor-catalog.ts';

type Refusal = { code: string; status: number };
type Admission = { id: string; capture: boolean; revision: number; graphHash: string; graph: CompiledGraph; inputs: Record<string, Packet[]> };
export const runKey = (value: unknown): value is string => typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function prepareInputs(raw: unknown, graph: GraphSpecV2): Record<string, Packet[]> | undefined {
  const supplied = record(raw);
  if (!supplied || Object.keys(supplied).length !== Object.keys(graph.inputs).length) return;
  const definitions = new Map(graph.nodes.map(node => [node.id, node.component]));
  const inputs = new Map<string, Packet[]>();
  let count = 0;
  for (const [name, endpoint] of Object.entries(graph.inputs)) {
    if (!Object.hasOwn(supplied, name)) return;
    const values = supplied[name];
    if (!Array.isArray(values) || count + values.length > 100) return;
    const registry: Registry = editorRegistry;
    const contract = registry[definitions.get(endpoint.node)!]!.in[endpoint.port]! as Contract<Json>;
    const packets: Packet[] = [];
    for (const value of values) {
      if (!contract.validate(value)) return;
      packets.push(packet(value, { key: `fixture-${++count}` }));
    }
    inputs.set(name, packets);
  }
  return Object.fromEntries(inputs);
}

/** Resolve capabilities, snapshot identity and all ingress data before the runtime starts. */
export function admitRun(raw: unknown): Admission | Refusal {
  const body = record(raw);
  if (!body || Object.keys(body).length !== (Object.hasOwn(body, 'capture') ? 7 : 6) ||
    (Object.hasOwn(body, 'capture') && typeof body.capture !== 'boolean') || !runKey(body.id) ||
    typeof body.revision !== 'number' || !Number.isSafeInteger(body.revision) || body.revision < 0 ||
    typeof body.graphHash !== 'string' || !('graph' in body) || !('inputs' in body)) {
    return { code: 'INVALID_ARGUMENT', status: 400 };
  }
  if (body.profile !== 'fixtures@1') return { code: 'PROFILE_FORBIDDEN', status: 403 };
  const graphHash = createHash('sha256').update(JSON.stringify(body.graph)).digest('hex');
  if (graphHash !== body.graphHash) return { code: 'STALE_GRAPH', status: 409 };
  if (hostBindingIssues(body.graph).length) return { code: 'HOST_BINDING_FORBIDDEN', status: 403 };
  const compiled = compileGraph(body.graph, editorRegistry);
  if (!compiled.ok) return { code: 'INVALID_GRAPH', status: 422 };
  const inputs = prepareInputs(body.inputs, body.graph as GraphSpecV2);
  if (!inputs) return { code: 'INVALID_INPUT', status: 422 };
  return { id: body.id, capture: body.capture === true, revision: body.revision, graphHash, graph: compiled.graph, inputs };
}
