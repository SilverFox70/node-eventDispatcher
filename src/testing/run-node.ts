import { describeRegistry } from '../component.js';
import type { Component, ComponentBase, PortMap, Values } from '../component.js';
import type { Packet } from '../packet.js';
import { compileGraph } from '../graph.js';
import { readRecord } from '../packet/data.js';
import { FlowError } from '../errors.js';
import { runGraph } from './run-graph.js';
import type { TestOptions, TestResult } from './run-graph.js';

type NodeInputs<I extends PortMap> = { readonly [K in keyof I]?: readonly Packet<Values<I>[K]>[] };
type NodeOutputs<O extends PortMap> = { readonly [K in keyof O]: readonly Packet<Values<O>[K]>[] };

/** Expose every port of a real one-node graph; omitted inputs are empty streams. */
export function runNode<const I extends PortMap, const O extends PortMap>(
  component: Component<I, O>, options: Omit<TestOptions, 'inputs'> & { readonly inputs: NodeInputs<NoInfer<I>> }
): Promise<TestResult<NodeOutputs<O>>>;
export function runNode(component: ComponentBase, options: unknown): Promise<unknown> {
  let key: string;
  try {
    const fields = readRecord(component, 'INVALID_GRAPH');
    if (typeof fields.id !== 'string' || typeof fields.version !== 'number') throw new FlowError('INVALID_GRAPH');
    key = `${fields.id}@${fields.version}`;
    describeRegistry({ [key]: component });
  } catch { throw new FlowError('INVALID_GRAPH'); }
  const endpoint = (ports: PortMap) => Object.fromEntries(Object.keys(ports).map(port => [port, { node: 'node', port }]));
  const result = compileGraph({ version: 1, nodes: [{ id: 'node', component: key }], edges: [],
    inputs: endpoint(component.in), outputs: endpoint(component.out) }, { [key]: component });
  if (!result.ok) throw new FlowError('INVALID_GRAPH');
  return runGraph(result.graph, options as TestOptions);
}
