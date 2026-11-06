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

import { attachDiagnosticsSink, exportDiagnostics } from 'event-driven-design';
import { validateDiagnosticBatch } from 'event-driven-design/model';
const diagnostics = attachDiagnosticsSink(run, { write: async (batch, signal) => { validateDiagnosticBatch(batch); void signal.aborted; } });
void exportDiagnostics(run.diagnostics());
// @ts-expect-error Sink flush retains its deadline contract through installed declarations.
diagnostics.flush({});

import { decisionSnapshot, describeDecisions, type TaskContext } from 'event-driven-design';
import { validateDecisions, validateDecisionCatalog } from 'event-driven-design/model';
validateDecisions(decisionSnapshot(run)); validateDecisionCatalog(describeDecisions({}));
declare const decisionContext: TaskContext;
const recorded: boolean = decisionContext.recordDecision({ code: 'OK', ruleVersion: 'v1', outcome: 'keep', facts: [] }); void recorded;
// @ts-expect-error Raw values are not decision facts in installed declarations.
decisionContext.recordDecision({ code: 'OK', ruleVersion: 'v1', outcome: 'keep', facts: [{ name: 'input', value: 4 }] });

import { createGraph, defineConfiguredComponent, describeRegistry, type CatalogV2 } from 'event-driven-design';
import { validateGraph, type GraphSpecV2 } from 'event-driven-design/model';
const multiply = defineConfiguredComponent({
  id: 'multiply', version: 1, title: 'Multiply', description: '', configuration: numeric,
  in: { in: numeric }, out: { out: numeric },
  create: factor => {
    const value: number = factor; void value;
    return async context => { for await (const input of context.inputs.in) await context.send('out', input); };
  }
});
const configuredBuilder = createGraph();
const configuredHandle = configuredBuilder.add('multiply', multiply, { config: 2, taskTimeoutMs: 50 });
configuredBuilder.exposeOutput('out', configuredHandle, 'out');
const configuredSpec = configuredBuilder.toSpec();
const configuredCatalog = describeRegistry({ 'multiply@1': multiply });
if (configuredSpec.version === 2 && configuredCatalog.version === 2) {
  const graph: GraphSpecV2 = configuredSpec;
  const catalog: CatalogV2 = configuredCatalog;
  void validateGraph(graph, catalog);
}
void runNode(multiply, { config: 2, inputs: { in: [packet(2)] } });
// @ts-expect-error A configured node always requires a binding.
configuredBuilder.add('missing', multiply);
// @ts-expect-error The configuration contract decides the input type.
configuredBuilder.add('bad', multiply, { config: 'two' });
// @ts-expect-error Existing unconfigured components reject configuration.
configuredBuilder.add('old', node, { config: 2 });
// @ts-expect-error Configured test fixtures also require a binding.
void runNode(multiply, { inputs: {} });
// @ts-expect-error A configured fixture retains its input packet type.
void runNode(multiply, { config: 2, inputs: { in: [packet('wrong')] } });
