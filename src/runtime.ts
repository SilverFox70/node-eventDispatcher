import { randomUUID } from 'node:crypto';
import { getGraphDefinition } from './graph.js';
import type { CompiledGraph, GraphDefinition } from './graph.js';
import { createChannel } from './channel.js';
import type { Packet } from './packet.js';
import type { ContractIssue } from './model/contracts.js';
import { FlowError } from './errors.js';
import { readRecord } from './packet/data.js';
import { createRunState } from './runtime/state.js';
import type { Channel, NodeState } from './runtime/state.js';
import { createAdmission, inputIterator } from './runtime/ports.js';
import type { Port } from './runtime/ports.js';
import { RuntimeValidationError } from './runtime/validation.js';
export { RuntimeValidationError } from './runtime/validation.js';

export type Terminal = Readonly<{ status: 'completed' } | { status: 'cancelled'; code: 'CANCELLED' } |
  { status: 'failed'; code: string; nodeId?: string }>;
export type ValidationReport = Readonly<{
  runId: string; nodeId: string; port: string; direction: 'input' | 'output';
  componentId: string; componentVersion: number; contractId: string; representationId: string;
  issues: readonly ContractIssue[]; truncated: boolean;
}>;
export type Diagnostic = Readonly<{ sequence: number; code: string; nodeId?: string; validation?: ValidationReport }>;
export type Snapshot = Readonly<{
  runId: string; status: 'running' | 'draining' | Terminal['status'];
  nodes: readonly Readonly<{ id: string; status: 'running' | 'completed' | 'failed' | 'cancelled' }>[];
  channels: readonly Readonly<{ id: string; queued: number; capacity: number; pendingSend: boolean;
    sent: number; received: number; discarded: number }>[];
  diagnostics: readonly Diagnostic[];
}>;
export type StartOptions = Readonly<{ signal?: AbortSignal; executionRecordLimit?: number; diagnosticLimit?: number }>;
export type NetworkRun = Readonly<{
  runId: string; outputs: Readonly<Record<string, AsyncIterable<Packet>>>;
  send(name: string, packet: Packet): Promise<void>; closeInput(name: string): void;
  finish(): Promise<Terminal>; cancel(): void; done: Promise<Terminal>; snapshot(): Snapshot;
}>;

const definitions = new WeakMap<NetworkRun, GraphDefinition>();
const internalCodes = new Set(['INVALID_PACKET', 'OUTPUT_CONTRACT', 'UNKNOWN_PORT', 'CONCURRENT_SEND',
  'CONCURRENT_READ', 'CHANNEL_CLOSED', 'RUN_TERMINATED', 'DUPLICATE_PACKET', 'EXECUTION_CAPACITY',
  'INPUT_ABANDONED', 'UNAWAITED_SEND']);

/** Start independent stream processes; callers must consume outputs concurrently with feeding inputs. */
export function startNetwork(graph: CompiledGraph, options: StartOptions = {}): NetworkRun {
  const definition = getGraphDefinition(graph), fields = readRecord(options, 'INVALID_ARGUMENT');
  if (Object.keys(fields).some(key => !['signal', 'executionRecordLimit', 'diagnosticLimit'].includes(key))) throw new FlowError('INVALID_ARGUMENT');
  const recordLimit = Object.hasOwn(fields, 'executionRecordLimit') ? fields.executionRecordLimit : 65536;
  const diagnosticLimit = Object.hasOwn(fields, 'diagnosticLimit') ? fields.diagnosticLimit : 100;
  if (!Number.isSafeInteger(recordLimit) || (recordLimit as number) < 1 || (recordLimit as number) > 1048576 ||
    !Number.isSafeInteger(diagnosticLimit) || (diagnosticLimit as number) < 0 || (diagnosticLimit as number) > 1000 ||
    (Object.hasOwn(fields, 'signal') && !(fields.signal instanceof globalThis.AbortSignal))) throw new FlowError('INVALID_ARGUMENT');
  const signal = fields.signal as AbortSignal | undefined;
  const runId = randomUUID(), channels = new Map<string, Channel>();
  const inputs = new Map<string, Port>(), outputs = new Map<string, Port>();
  const nodeInputs = new Map<string, Map<string, Port>>(), nodeOutputs = new Map<string, Map<string, Port>>();
  const destinations = new Map<Channel, Port>();
  const nodeStates: NodeState[] = definition.spec.nodes.map(node => ({ id: node.id, status: 'running' }));
  for (const node of nodeStates) { nodeInputs.set(node.id, new Map()); nodeOutputs.set(node.id, new Map()); }
  function port(endpoint: { node: string; port: string }, channel: Channel): Port {
    const spec = definition.spec.nodes.find(node => node.id === endpoint.node)!;
    return { channel, nodeId: endpoint.node, port: endpoint.port, component: definition.registry[spec.component]! };
  }
  function channel(id: string, capacity = 16): Channel {
    const result = createChannel<Packet>(capacity); channels.set(id, result); return result;
  }
  definition.spec.edges.forEach((edge, index) => {
    const queue = channel(`edge:${index}`, edge.capacity), from = port(edge.from, queue), to = port(edge.to, queue);
    nodeOutputs.get(from.nodeId)!.set(from.port, from); nodeInputs.get(to.nodeId)!.set(to.port, to);
    destinations.set(queue, to);
  });
  for (const [name, endpoint] of Object.entries(definition.spec.inputs)) {
    const target = port(endpoint, channel(`input:${name}`));
    inputs.set(name, target); nodeInputs.get(target.nodeId)!.set(target.port, target);
  }
  for (const [name, endpoint] of Object.entries(definition.spec.outputs)) {
    const target = port(endpoint, channel(`output:${name}`));
    outputs.set(name, target); nodeOutputs.get(target.nodeId)!.set(target.port, target);
  }
  const ledger = new Set<string>();
  const state = createRunState(runId, nodeStates, channels, diagnosticLimit as number, () => ledger.clear(), signal);
  const admission = createAdmission(runId, recordLimit as number, ledger);
  const closed = new Set<string>(), drained = new Set<string>();
  function complete(): void {
    if (state.live() && closed.size === inputs.size && drained.size === outputs.size &&
      nodeStates.every(node => node.status === 'completed')) state.end({ status: 'completed' });
  }
  function fail(error: unknown, nodeId?: string): void {
    const code = error instanceof FlowError && internalCodes.has(error.code) ? error.code : 'COMPONENT_FAILED';
    if (error instanceof RuntimeValidationError) state.record(code, nodeId, error.validation);
    if (!state.live()) { state.record(code, nodeId); return; }
    state.end({ status: 'failed', code, ...(nodeId === undefined ? {} : { nodeId }) });
  }
  function closeInput(name: string): void {
    const target = inputs.get(name);
    if (!target) throw new FlowError('UNKNOWN_PORT');
    if (!state.live() || closed.has(name)) return;
    closed.add(name); target.channel.close(); state.record('INPUT_CLOSED');
    if (closed.size === inputs.size) state.drain();
    complete();
  }
  const publicOutputs = Object.freeze(Object.fromEntries([...outputs].map(([name, target]) => [name,
    inputIterator(target.channel, state, () => { drained.add(name); complete(); }, () => fail(new FlowError('INPUT_ABANDONED'))),
  ])));
  const run: NetworkRun = Object.freeze({
    runId, outputs: publicOutputs, done: state.done, cancel: state.cancel, closeInput, snapshot: state.snapshot,
    send(name: string, packet: Packet): Promise<void> {
      let result: Promise<void>;
      if (!state.live()) result = Promise.reject(new FlowError('RUN_TERMINATED'));
      else {
        const target = inputs.get(name);
        result = target ? admission.send(target, packet, 'input') : Promise.reject(new FlowError('UNKNOWN_PORT'));
      }
      void result.catch(error => {
        if (error instanceof RuntimeValidationError) state.record(error.code, error.validation.nodeId, error.validation);
      });
      return result;
    },
    finish(): Promise<Terminal> { for (const name of inputs.keys()) closeInput(name); return state.done; },
  });
  definitions.set(run, definition);
  queueMicrotask(() => {
    for (const node of nodeStates) {
      const inputPorts = nodeInputs.get(node.id)!, outputPorts = nodeOutputs.get(node.id)!;
      const eof = new Set<string>();
      // EOF is checked on normal process return; iterator cleanup must preserve an original throw.
      const ctx = Object.freeze({
        signal: state.controller.signal,
        inputs: Object.freeze(Object.fromEntries([...inputPorts].map(([name, target]) => [name,
          inputIterator(target.channel, state, () => { eof.add(name); }),
        ]))),
        send(name: string, packet: Packet): Promise<void> {
          const target = outputPorts.get(name);
          const result = !state.live() ? Promise.reject(new FlowError('RUN_TERMINATED')) : target
            ? admission.send(target, packet, 'output', destinations.get(target.channel)) : Promise.reject(new FlowError('UNKNOWN_PORT'));
          void result.catch(() => {});
          return result;
        },
      });
      void Promise.resolve().then(() => {
        if (!state.live()) return;
        const spec = definition.spec.nodes.find(spec => spec.id === node.id)!;
        const process = definition.registry[spec.component]!.create();
        if (typeof process !== 'function') throw new FlowError('COMPONENT_FAILED');
        return (process as (context: typeof ctx) => unknown)(ctx);
      }).then(() => {
        if (!state.live()) return;
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
