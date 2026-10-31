import type { ComponentBase, PortMap, Values } from './component.js';
import { describeRegistry } from './component.js';
import type { Endpoint, GraphSpec } from './model/graph.js';
import { snapshotJsonMetadata } from './model/contracts.js';
import { isName } from './model/graph/structure.js';
import { readRecord } from './packet/data.js';
import { readTaskPolicy } from './model/graph/task-policy.js';
import type { TaskPolicy } from './model/graph/task-policy.js';
import { FlowError } from './errors.js';

declare const nodeType: unique symbol;
/** Invariant port types retain exact keys; runtime ownership is private to each builder. */
export type NodeHandle<I extends PortMap, O extends PortMap> = Readonly<{
  [nodeType]: (ports: { in: I; out: O }) => { in: I; out: O };
}>;
type CompatibleInputs<Value, Inputs extends PortMap> = {
  [K in keyof Inputs]: [Value] extends [Values<Inputs>[K]] ? K : never
}[keyof Inputs] & string;

export type GraphBuilder = Readonly<{
  add<const C extends ComponentBase>(id: string, component: C, options?: TaskPolicy): NodeHandle<C['in'], C['out']>;
  connect<I extends PortMap, O extends PortMap, DI extends PortMap, DO extends PortMap,
    F extends keyof O & string>(
    from: NodeHandle<I, O>, fromPort: F, to: NodeHandle<DI, DO>,
    toPort: CompatibleInputs<Values<O>[NoInfer<F>], NoInfer<DI>>,
    capacity?: number
  ): void;
  exposeInput<I extends PortMap, O extends PortMap>(name: string, node: NodeHandle<I, O>, port: keyof I & string): void;
  exposeOutput<I extends PortMap, O extends PortMap>(name: string, node: NodeHandle<I, O>, port: keyof O & string): void;
  toSpec(): GraphSpec;
}>;

/** Build portable wiring; compileGraph remains authoritative for contracts and topology. */
export function createGraph(): GraphBuilder {
  const handles = new WeakMap<object, { id: string; component: ComponentBase }>();
  const nodes = new Map<string, Readonly<{ id: string; component: string }> & TaskPolicy>();
  const edges: { from: Endpoint; to: Endpoint; capacity?: number }[] = [];
  const inputs = new Map<string, Endpoint>(), outputs = new Map<string, Endpoint>();

  function endpoint(handle: object, port: string, side: 'in' | 'out'): Endpoint {
    const entry = handles.get(handle);
    if (!entry) throw new FlowError('INVALID_ARGUMENT');
    if (!isName(port) || !Object.hasOwn(entry.component[side], port)) throw new FlowError('UNKNOWN_PORT');
    return { node: entry.id, port };
  }
  function expose(target: Map<string, Endpoint>, name: string, handle: object, port: string, side: 'in' | 'out'): void {
    if (!isName(name)) throw new FlowError('INVALID_ARGUMENT');
    if (target.has(name)) throw new FlowError('DUPLICATE_ID');
    target.set(name, endpoint(handle, port, side));
  }
  return Object.freeze({
    add(id, component, options = {}) {
      if (!isName(id)) throw new FlowError('INVALID_ARGUMENT');
      if (nodes.has(id)) throw new FlowError('DUPLICATE_ID');
      const fields = readRecord(component, 'INVALID_ARGUMENT');
      if (typeof fields.id !== 'string' || typeof fields.version !== 'number') throw new FlowError('INVALID_ARGUMENT');
      const identity = `${fields.id}@${fields.version}`;
      describeRegistry({ [identity]: component });
      const handle = Object.freeze({}) as NodeHandle<typeof component.in, typeof component.out>;
      const policy = readTaskPolicy(options);
      nodes.set(id, { id, component: identity, ...policy });
      handles.set(handle, { id, component });
      return handle;
    },
    connect(from, fromPort, to, toPort, capacity) {
      const source = endpoint(from, fromPort, 'out'), target = endpoint(to, toPort, 'in');
      if (capacity !== undefined && (!Number.isInteger(capacity) || capacity < 1 || capacity > 256)) {
        throw new FlowError('INVALID_CAPACITY');
      }
      edges.push({ from: source, to: target, ...(capacity === undefined ? {} : { capacity }) });
    },
    exposeInput(name, node, port) { expose(inputs, name, node, port, 'in'); },
    exposeOutput(name, node, port) { expose(outputs, name, node, port, 'out'); },
    toSpec() {
      return snapshotJsonMetadata({ version: 1,
        nodes: [...nodes.values()], edges,
        inputs: Object.fromEntries(inputs), outputs: Object.fromEntries(outputs),
      }) as unknown as GraphSpec;
    },
  } satisfies GraphBuilder);
}
