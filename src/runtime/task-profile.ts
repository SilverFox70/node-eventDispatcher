import { settledTaskFailureCode } from '../runtime.js';
import type { NetworkRun } from '../runtime.js';
import { ok as assert } from 'node:assert/strict';
import { FlowError } from '../errors.js';
import { isBoundedFunction } from '../function.js';
import { compileGraph, getGraphDefinition } from '../graph.js';
import type { CompiledGraph } from '../graph.js';
import type { Packet } from '../packet.js';
import { runFiniteGraph } from './finite.js';

export type TaskInvocationOptions = Readonly<{ timeoutMs: number; signal?: AbortSignal }>;

/** Prepare bounded single-packet invocations from the same compiled node definitions as streaming runs. */
export function prepareBoundedTasks(graph: CompiledGraph) {
  const { spec, registry, catalog } = getGraphDefinition(graph);
  const tasks = new Map<string, CompiledGraph>();
  const singleAttempts = new Map<string, CompiledGraph>();
  for (const node of spec.nodes) {
    const component = registry[node.component]!;
    if (!isBoundedFunction(component)) throw new FlowError('PROFILE_INELIGIBLE');
    const project = (binding: typeof node) => {
      const projected = compileGraph({
        version: spec.version, nodes: [binding], edges: [],
        inputs: { in: { node: node.id, port: 'in' } }, outputs: { out: { node: node.id, port: 'out' } },
      }, { [node.component]: component });
      assert(projected.ok, 'Validated function projection must compile');
      return projected.graph;
    };
    const graph = project(node);
    tasks.set(node.id, graph);
    const { retry, ...oneAttempt } = node;
    singleAttempts.set(node.id, retry ? project(oneAttempt) : graph);
  }

  const invoker = (projections: Map<string, CompiledGraph>) =>
    async (nodeId: string, input: Packet, options: TaskInvocationOptions) => {
      const task = projections.get(nodeId);
      if (!task) throw new FlowError('UNKNOWN_TASK_NODE');
      let run: NetworkRun;
      const result = await runFiniteGraph(task, {
        ...options, inputs: { in: [input] }, maxOutputPackets: 1, decisionEvidence: true, observe: observed => { run = observed; },
      });
      const attemptIds = Object.freeze(result.diagnostics!.events.flatMap(event =>
        event.kind === 'attempt-started' ? [event.attemptId] : []));
      const evidence = { runId: result.snapshot.runId, attemptIds };
      if (result.terminal.status !== 'completed') {
        const code = settledTaskFailureCode(run!);
        const retry = spec.nodes.find(node => node.id === nodeId)?.retry;
        const retryCode = code && retry?.codes.includes(code) ? code : undefined;
        return Object.freeze({ status: 'stopped' as const, terminal: result.terminal, retryCode, ...evidence });
      }
      return Object.freeze({ status: 'computed' as const, packet: result.outputs.out![0]!, ...evidence });
    };
  const invoke = invoker(tasks), invokeOnce = invoker(singleAttempts);
  return { spec, catalog, registry, invoke, invokeOnce };
}
