import { randomUUID } from 'node:crypto';
import { getGraphDefinition } from './graph.js';
import type { CompiledGraph, GraphDefinition } from './graph.js';
import { createChannel } from './channel.js';
import type { Packet } from './packet.js';
import type { Snapshot } from './model/inspection.js';
export type { Snapshot, Diagnostic, ValidationReport } from './model/inspection.js';
import { createExecutionTrace } from './runtime/trace.js';
import type { TraceOptions } from './runtime/trace.js';
import type { ExecutionTraceSnapshot } from './model/execution-trace.js';
import type { Endpoint } from './model/graph.js';
import { FlowError } from './errors.js';
import { readRecord } from './packet/data.js';
import { createRunState } from './runtime/state.js';
import type { Channel, NodeState } from './runtime/state.js';
import { createAdmission, inputIterator } from './runtime/ports.js';
import type { Port } from './runtime/ports.js';
import { registerProcessContext } from './runtime/context-validation.js';
import { createTasks } from './runtime/tasks.js';
import { createTaskScope } from './runtime/task-scope.js';
import { RuntimeValidationError } from './runtime/validation.js';
export { RuntimeValidationError } from './runtime/validation.js';

export type Terminal = Readonly<{ status: 'completed' } | { status: 'cancelled'; code: 'CANCELLED' } |
  { status: 'failed'; code: string; nodeId?: string }>;
export type StartOptions = Readonly<{ signal?: AbortSignal; executionRecordLimit?: number; diagnosticLimit?: number; timeoutMs?: number; trace?: TraceOptions }>;
export type NetworkRun = Readonly<{
  runId: string; outputs: Readonly<Record<string, AsyncIterable<Packet>>>;
  send(name: string, packet: Packet): Promise<void>; closeInput(name: string): void;
  trace(): ExecutionTraceSnapshot | null; onTrace(listener: () => void): () => void; clearTrace(): void;
  finish(): Promise<Terminal>; cancel(): void; done: Promise<Terminal>; snapshot(): Snapshot;
}>;

const definitions = new WeakMap<NetworkRun, GraphDefinition>();
const internalCodes = new Set(['INVALID_PACKET', 'OUTPUT_CONTRACT', 'UNKNOWN_PORT', 'CONCURRENT_SEND',
  'CONCURRENT_READ', 'CHANNEL_CLOSED', 'RUN_TERMINATED', 'DUPLICATE_PACKET', 'EXECUTION_CAPACITY',
  'DUPLICATE_KEY', 'JOIN_CAPACITY', 'JOIN_INCOMPLETE', 'JOIN_GROUP_COMPLETED', 'JOIN_HISTORY_CAPACITY',
  'UNAWAITED_TASK', 'NODE_TIMEOUT', 'TASK_ACTIVE', 'TASK_IO_ACCESS', 'TASK_TERMINATED', 'INPUT_ABANDONED', 'UNAWAITED_SEND']);

/** Start independent stream processes; callers must consume outputs concurrently with feeding inputs. */
export function startNetwork(graph: CompiledGraph, options: StartOptions = {}): NetworkRun {
  const definition = getGraphDefinition(graph), fields = readRecord(options, 'INVALID_ARGUMENT');
  if (Object.keys(fields).some(key => !['signal', 'executionRecordLimit', 'diagnosticLimit', 'timeoutMs', 'trace'].includes(key))) throw new FlowError('INVALID_ARGUMENT');
  const recordLimit = Object.hasOwn(fields, 'executionRecordLimit') ? fields.executionRecordLimit : 65536;
  const diagnosticLimit = Object.hasOwn(fields, 'diagnosticLimit') ? fields.diagnosticLimit : 100;
  if (!Number.isSafeInteger(recordLimit) || (recordLimit as number) < 1 || (recordLimit as number) > 1048576 ||
    !Number.isSafeInteger(diagnosticLimit) || (diagnosticLimit as number) < 0 || (diagnosticLimit as number) > 1000 ||
    (Object.hasOwn(fields, 'signal') && !(fields.signal instanceof globalThis.AbortSignal))) throw new FlowError('INVALID_ARGUMENT');
  if (Object.hasOwn(fields, 'timeoutMs') && (!Number.isSafeInteger(fields.timeoutMs) || (fields.timeoutMs as number) < 1)) {
    throw new FlowError('INVALID_ARGUMENT');
  }
  for (const node of definition.spec.nodes) {
    const budgets = [node.taskTimeoutMs, node.retry?.delayMs, node.retry?.settleTimeoutMs];
    if (typeof fields.timeoutMs === 'number' && budgets.some(ms => ms !== undefined && ms > (fields.timeoutMs as number))) {
      throw new FlowError('INVALID_TIMEOUT_POLICY');
    }
  }
  const scope = createTaskScope();
  const signal = fields.signal as AbortSignal | undefined;
  const runId = randomUUID();
  const trace = Object.hasOwn(fields, 'trace') ? createExecutionTrace(runId, fields.trace) : undefined;
  const channels = new Map<string, Channel>();
  const inputs = new Map<string, Port>(), outputs = new Map<string, Port>();
  const nodeInputs = new Map<string, Map<string, Port>>(), nodeOutputs = new Map<string, Map<string, Port>>();
  const destinations = new Map<Channel, Port>();
  const nodeStates: NodeState[] = definition.spec.nodes.map(node => ({ id: node.id, status: 'running' }));
  for (const node of nodeStates) { nodeInputs.set(node.id, new Map()); nodeOutputs.set(node.id, new Map()); }
  function port(endpoint: { node: string; port: string }, channel: Channel): Port {
    const spec = definition.spec.nodes.find(node => node.id === endpoint.node)!;
    return { channel, nodeId: endpoint.node, port: endpoint.port, component: definition.registry[spec.component]! };
  }
  function channel(id: string, capacity = 16, from: Endpoint | null = null, to: Endpoint | null = null): Channel {
    const result = createChannel<Packet>(capacity, trace && ((kind, packet) => trace.record(kind, { channelId: id, from, to }, packet))); channels.set(id, result); return result;
  }
  definition.spec.edges.forEach((edge, index) => {
    const queue = channel(`edge:${index}`, edge.capacity, edge.from, edge.to), from = port(edge.from, queue), to = port(edge.to, queue);
    nodeOutputs.get(from.nodeId)!.set(from.port, from); nodeInputs.get(to.nodeId)!.set(to.port, to);
    destinations.set(queue, to);
  });
  for (const [name, endpoint] of Object.entries(definition.spec.inputs)) {
    const target = port(endpoint, channel(`input:${name}`, 16, null, endpoint));
    inputs.set(name, target); nodeInputs.get(target.nodeId)!.set(target.port, target);
  }
  for (const [name, endpoint] of Object.entries(definition.spec.outputs)) {
    const target = port(endpoint, channel(`output:${name}`, 16, endpoint, null));
    outputs.set(name, target); nodeOutputs.get(target.nodeId)!.set(target.port, target);
  }
  const ledger = new Set<string>();
  const state = createRunState(runId, nodeStates, channels, diagnosticLimit as number, () => ledger.clear(), signal, fields.timeoutMs as number | undefined);
  const admission = createAdmission(runId, recordLimit as number, ledger);
  const closed = new Set<string>(), drained = new Set<string>();
  function complete(): void {
    if (state.check() && closed.size === inputs.size && drained.size === outputs.size &&
      nodeStates.every(node => node.status === 'completed')) state.end({ status: 'completed' });
  }
  function fail(error: unknown, nodeId?: string): void {
    const code = error instanceof FlowError && internalCodes.has(error.code) ? error.code : 'COMPONENT_FAILED';
    if (error instanceof RuntimeValidationError) state.record(code, nodeId, error.validation);
    if (!state.check()) { state.record(code, nodeId); return; }
    state.end({ status: 'failed', code, ...(nodeId === undefined ? {} : { nodeId }) });
  }
  function closeInput(name: string): void {
    scope.guard();
    const target = inputs.get(name);
    if (!target) throw new FlowError('UNKNOWN_PORT');
    if (!state.check() || closed.has(name)) return;
    closed.add(name); target.channel.close(); state.record('INPUT_CLOSED');
    if (closed.size === inputs.size) state.drain();
    complete();
  }
  const publicOutputs = Object.freeze(Object.fromEntries([...outputs].map(([name, target]) => [name,
    inputIterator(target.channel, state, () => { drained.add(name); complete(); }, () => fail(new FlowError('INPUT_ABANDONED')), () => scope.guard()),
  ])));
  const run: NetworkRun = Object.freeze({
    trace: () => trace?.snapshot() ?? null, clearTrace: () => { trace?.clear(); },
    onTrace(listener: () => void) {
      if (typeof listener !== 'function') throw new TypeError('Trace observer must be a function');
      return trace?.subscribe(listener) ?? (() => {});
    },
    runId, outputs: publicOutputs, done: state.done, cancel: () => { scope.guard(); state.cancel(); }, closeInput, snapshot: state.snapshot,
    send(name: string, packet: Packet): Promise<void> {
      let result: Promise<void>;
      try { scope.guard(); } catch (error) { result = Promise.reject(error); void result.catch(() => {}); return result; }
      if (!state.check()) result = Promise.reject(new FlowError('RUN_TERMINATED'));
      else {
        const target = inputs.get(name);
        result = target ? admission.send(target, packet, 'input') : Promise.reject(new FlowError('UNKNOWN_PORT'));
      }
      void result.catch(error => {
        if (error instanceof RuntimeValidationError) state.record(error.code, error.validation.nodeId, error.validation);
      });
      return result;
    },
    finish(): Promise<Terminal> {
      scope.guard();
      for (const name of inputs.keys()) closeInput(name);
      if (state.check()) state.drain();
      return state.done;
    },
  });
  definitions.set(run, definition);
  queueMicrotask(() => {
    for (const node of nodeStates) {
      const inputPorts = nodeInputs.get(node.id)!, outputPorts = nodeOutputs.get(node.id)!;
      const eof = new Set<string>();
      const nodeSpec = definition.spec.nodes.find(spec => spec.id === node.id)!;
      const operations = createTasks(state, scope, node.id, nodeSpec);
      // EOF is checked on normal process return; iterator cleanup must preserve an original throw.
      const ctx = Object.freeze({
        signal: state.controller.signal, task: operations.task,
        inputs: Object.freeze(Object.fromEntries([...inputPorts].map(([name, target]) => [name,
          inputIterator(target.channel, state, () => { eof.add(name); }, undefined, () => scope.guard()),
        ]))),
        send(name: string, packet: Packet): Promise<void> {
          try { scope.guard(); } catch (error) { const refused = Promise.reject<void>(error); void refused.catch(() => {}); return refused; }
          const target = outputPorts.get(name);
          const result = !state.check() ? Promise.reject(new FlowError('RUN_TERMINATED')) : target
            ? admission.send(target, packet, 'output', destinations.get(target.channel)) : Promise.reject(new FlowError('UNKNOWN_PORT'));
          void result.catch(() => {});
          return result;
        },
      });
      registerProcessContext(ctx, { runId, nodeId: node.id, component: definition.registry[nodeSpec.component]! }, state.onEnd);
      void Promise.resolve().then(() => {
        if (!state.check()) return;
        const spec = definition.spec.nodes.find(spec => spec.id === node.id)!;
        const process = definition.registry[spec.component]!.create();
        if (typeof process !== 'function') throw new FlowError('COMPONENT_FAILED');
        return (process as (context: typeof ctx) => unknown)(ctx);
      }).then(() => {
        if (!state.check()) return;
        if (operations.pending()) throw new FlowError('UNAWAITED_TASK');
        if ([...outputPorts.values()].some(target => target.channel.stats().pendingSend)) throw new FlowError('UNAWAITED_SEND');
        if (eof.size !== inputPorts.size) throw new FlowError('INPUT_ABANDONED');
        node.status = 'completed';
        for (const target of outputPorts.values()) target.channel.close();
        state.record('PROCESS_COMPLETED', node.id); complete();
      }).catch(error => fail(error, node.id));
    }
    complete();
  });
  return run;
}
/** Internal association for the later explicit inspection scope. */
export function getRunDefinition(run: NetworkRun): GraphDefinition {
  const definition = definitions.get(run);
  if (!definition) throw new FlowError('INVALID_ARGUMENT');
  return definition;
}
