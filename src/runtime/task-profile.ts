export { durableWait, waitSignalName } from '../components/durable-wait.js';
export { joinPolicy } from '../components/shared/routing-identity.js';
export { joinValue } from '../components/join-by-key/collate.js';
import { routingOperator } from '../components/shared/routing-identity.js';
import type { RoutingOperator } from '../components/shared/routing-identity.js';
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
export function prepareBoundedTasks(graph: CompiledGraph, operators: ReadonlyMap<string, RoutingOperator> = new Map()) {
  const { spec, registry, catalog } = getGraphDefinition(graph);
  const tasks = new Map<string, CompiledGraph>();
  const singleAttempts = new Map<string, CompiledGraph>();
  for (const node of spec.nodes) {
    const component = registry[node.component]!;
    const operator = operators.get(node.component);
    if (operator ? routingOperator(component) !== operator : !isBoundedFunction(component)) throw new FlowError('PROFILE_INELIGIBLE');
    if (operator === 'join-by-key' || operator === 'wait') continue;
    const project = (binding: typeof node) => {
      const projected = compileGraph({
        version: spec.version, nodes: [binding], edges: [],
        inputs: Object.fromEntries(Object.keys(component.in).map(port => [port, { node: node.id, port }])),
        outputs: Object.fromEntries(Object.keys(component.out).map(port => [port, { node: node.id, port }])),
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
    async (nodeId: string, input: Packet, options: TaskInvocationOptions, port: string) => {
      const task = projections.get(nodeId);
      if (!task) throw new FlowError('UNKNOWN_TASK_NODE');
      let run: NetworkRun;
      const result = await runFiniteGraph(task, {
        ...options, inputs: { [port]: [input] }, maxOutputPackets: 32, decisionEvidence: true, observe: observed => { run = observed; },
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
      return Object.freeze({ status: 'computed' as const, outputs: result.outputs, ...evidence });
    };
  const single = (run: ReturnType<typeof invoker>) => async (nodeId: string, input: Packet, options: TaskInvocationOptions) => {
    const result = await run(nodeId, input, options, 'in');
    if (result.status === 'stopped') return result;
    const { outputs, ...evidence } = result;
    const [packet] = outputs.out ?? [];
    assert(packet, 'Use the delivery invocation API for multi-port or filtering operators');
    return Object.freeze({ ...evidence, packet });
  };
  const invokeDelivery = invoker(singleAttempts);
  return { spec, catalog, registry, invoke: single(invoker(tasks)), invokeOnce: single(invokeDelivery), invokeDelivery };

}
