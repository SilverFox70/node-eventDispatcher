import { contract, defineFunction, packet } from 'event-driven-design';
import { runNode } from 'event-driven-design/testing';
import type { GraphSpec } from 'event-driven-design/model';
import { z } from 'zod';
const numeric = contract('consumer-number@1', z.number());
const node = defineFunction({ id: 'double', version: 1, title: 'Double', description: '', input: numeric, output: numeric, handler: n => n * 2 });
async function check() {
const result = await runNode(node, { inputs: { in: [packet(2)] } });
const value: number = result.outputs.out[0].value; void value;
// @ts-expect-error Wrong payload cannot widen the declared input contract.
void runNode(node, { inputs: { in: [packet('wrong')] } });
// @ts-expect-error Exact output ports survive packaging.
void result.outputs.missing;
}
void check;
const spec: GraphSpec = { version: 1, nodes: [], edges: [], inputs: {}, outputs: {} }; void spec;

import { startNetwork, type CompiledGraph, type CapturePolicy, type DiagnosticsSession } from 'event-driven-design';
declare const compiled: CompiledGraph;
const capturePolicy: CapturePolicy = { allowedNodes: [], denyInputs: [], denyOutputs: [], maxPayloadBytes: 2048, maxSessionMs: 1000 };
const run = startNetwork(compiled, { capturePolicy });
const session: DiagnosticsSession = run.openDiagnosticsSession({ rules: [], expiresInMs: 1000 });
// @ts-expect-error Epoch ownership survives installed declarations.
session.update({ rules: [] });
void session;
