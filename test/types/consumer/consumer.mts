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
