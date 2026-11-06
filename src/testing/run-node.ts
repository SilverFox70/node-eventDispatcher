import { describeRegistry } from '../component.js';
import type { Component, ConfiguredComponent, PortMap, RegistryComponent, Values } from '../component.js';
import type { Json, Packet } from '../packet.js';
import { compileGraph } from '../graph.js';
import { readRecord } from '../packet/data.js';
import { FlowError } from '../errors.js';
import { runGraph } from './run-graph.js';
import type { TestOptions, TestResult } from './run-graph.js';

type NodeInputs<I extends PortMap> = { readonly [K in keyof I]?: readonly Packet<Values<I>[K]>[] };
type NodeOutputs<O extends PortMap> = { readonly [K in keyof O]: readonly Packet<Values<O>[K]>[] };

type NodeOptions<I extends PortMap> = Omit<TestOptions, 'inputs'> & { readonly inputs: NodeInputs<NoInfer<I>> };

/** Expose every port of a real one-node graph; omitted inputs are empty streams. */
export function runNode<const I extends PortMap, const O extends PortMap>(
  component: Component<I, O>, options: NodeOptions<I> & { readonly config?: never }
): Promise<TestResult<NodeOutputs<O>>>;
export function runNode<C extends Json, const I extends PortMap, const O extends PortMap>(
  component: ConfiguredComponent<C, I, O>, options: NodeOptions<I> & { readonly config: NoInfer<C> }
): Promise<TestResult<NodeOutputs<O>>>;
export function runNode(component: RegistryComponent, options: unknown): Promise<unknown> {
  let key: string;
  try {
    const fields = readRecord(component, 'INVALID_GRAPH');
    if (typeof fields.id !== 'string' || typeof fields.version !== 'number') throw new FlowError('INVALID_GRAPH');
    key = `${fields.id}@${fields.version}`;
    describeRegistry({ [key]: component });
  } catch { throw new FlowError('INVALID_GRAPH'); }
  const endpoint = (ports: PortMap) => Object.fromEntries(Object.keys(ports).map(port => [port, { node: 'node', port }]));
  let fields = options;
  let binding = {};
  const version = component.configuration ? 2 : 1;
  if (component.configuration) {
    const record = readRecord(options, 'INVALID_ARGUMENT');
    const { config, ...rest } = record;
    if (!Object.hasOwn(record, 'config')) throw new FlowError('CONFIG_INVALID');
    fields = rest;
    binding = { config };
  }
  const result = compileGraph({ version, nodes: [{ id: 'node', component: key, ...binding }], edges: [],
    inputs: endpoint(component.in), outputs: endpoint(component.out) }, { [key]: component });
  if (!result.ok) throw new FlowError(result.issues[0]?.code === 'CONFIG_INVALID' ? 'CONFIG_INVALID' : 'INVALID_GRAPH');
  return runGraph(result.graph, fields as TestOptions);
}
