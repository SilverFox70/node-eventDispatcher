import type { Packet } from './packet.js';
import type { Contract } from './contracts.js';
import type { ContractBase } from './model/contracts.js';
import type { ComponentDescriptor, Catalog } from './model/catalog.js';
import { assertContract } from './contracts.js';
import { FlowError } from './errors.js';
import { readArray, readRecord } from './packet/data.js';
import { canonicalSchema, snapshotJsonMetadata } from './model/contracts.js';

export type PortMap = Readonly<Record<string, ContractBase>>;
export type Values<P> = { [K in keyof P]: P[K] extends Contract<infer T> ? T : unknown };
import type { TaskContext } from './runtime/tasks.js';
export type ProcessContext<I extends PortMap, O extends PortMap> = Readonly<{
  inputs: { readonly [K in keyof I]: AsyncIterable<Packet<Values<I>[K]>> };
  send<K extends keyof O>(port: K, packet: Packet<Values<O>[NoInfer<K>]>): Promise<void>;
  signal: AbortSignal;
  task<T>(handler: (context: TaskContext) => T | PromiseLike<T>): Promise<T>;
}>;
export type ComponentBase = Readonly<{
  id: string; version: number; title: string; description: string;
  in: PortMap; out: PortMap; create: () => unknown;
}>;
export type Component<I extends PortMap, O extends PortMap> = Omit<ComponentBase, 'in' | 'out' | 'create'> & Readonly<{
  in: I; out: O; create: () => (ctx: ProcessContext<I, O>) => Promise<void>;
}>;
export type ComponentSpec<I extends PortMap, O extends PortMap> = Readonly<{
  id: string; version: number; title: string; description: string; in: I; out: O;
  create: () => (ctx: ProcessContext<I, O>) => Promise<void>;
  examples?: readonly { in?: Partial<Values<I>>; out?: Partial<Values<O>> }[];
  effects?: readonly string[]; requiredDependencies?: readonly string[];
}>;
export type Registry = Readonly<Record<string, ComponentBase>>;
const definitions = new WeakMap<ComponentBase, ComponentDescriptor>();

function identifier(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 128) throw new FlowError('INVALID_ARGUMENT');
}
function ports(value: PortMap): PortMap {
  const entries = readRecord(value, 'INVALID_ARGUMENT');
  for (const [name, item] of Object.entries(entries)) { identifier(name); assertContract(item as ContractBase); }
  return Object.freeze(entries) as PortMap;
}
function descriptors(value: PortMap): ComponentDescriptor['in'] {
  return Object.freeze(Object.fromEntries(Object.entries(value).map(([name, item]) => [name,
    Object.freeze({ contractId: item.id, representationId: item.representationId, schema: item.schema })
  ])));
}
function checkMeanings(descriptor: ComponentDescriptor, seen: Map<string, string>): void {
  for (const port of [...Object.values(descriptor.in), ...Object.values(descriptor.out)]) {
    const schema = canonicalSchema(port.schema);
    if (seen.has(port.contractId) && seen.get(port.contractId) !== schema) throw new FlowError('CONTRACT_ID_CONFLICT');
    seen.set(port.contractId, schema);
  }
}

/** Capture definition metadata without calling the process factory. */
export function defineComponent<const I extends PortMap, const O extends PortMap>(spec: ComponentSpec<I, O>): Component<I, O> {
  const fields = readRecord(spec, 'INVALID_ARGUMENT');
  identifier(fields.id);
  if (!Number.isSafeInteger(spec.version) || spec.version < 1 || typeof spec.title !== 'string' ||
    spec.title.length === 0 || typeof spec.description !== 'string' || typeof spec.create !== 'function') {
    throw new FlowError('INVALID_ARGUMENT');
  }
  const input = ports(spec.in), output = ports(spec.out);
  const meta: Record<string, unknown> = {};
  for (const key of ['effects', 'requiredDependencies'] as const) {
    if (spec[key] !== undefined) {
      if (!Array.isArray(spec[key])) throw new FlowError('INVALID_ARGUMENT');
      const items = readArray(spec[key], 'INVALID_ARGUMENT');
      for (const item of items) identifier(item);
      meta[key] = items;
    }
  }
  if (spec.examples !== undefined) {
    if (!Array.isArray(spec.examples)) throw new FlowError('INVALID_EXAMPLE');
    for (const example of readArray(spec.examples, 'INVALID_EXAMPLE')) {
      const sides = readRecord(example, 'INVALID_EXAMPLE');
      for (const [side, values] of Object.entries(sides)) {
        if (side !== 'in' && side !== 'out') throw new FlowError('INVALID_EXAMPLE');
        for (const [name, value] of Object.entries(readRecord(values, 'INVALID_EXAMPLE'))) {
          const port = (side === 'in' ? input : output)[name];
          if (!port) throw new FlowError('INVALID_EXAMPLE');
          assertContract(port);
          if (!(port as Contract<unknown>).validate(value)) throw new FlowError('INVALID_EXAMPLE');
        }
      }
    }
    meta.examples = spec.examples;
  }
  const descriptor = snapshotJsonMetadata({ id: spec.id, version: spec.version, title: spec.title,
    description: spec.description, in: descriptors(input), out: descriptors(output), ...meta }) as unknown as ComponentDescriptor;
  checkMeanings(descriptor, new Map());
  const component = Object.freeze({ id: spec.id, version: spec.version, title: spec.title,
    description: spec.description, in: input, out: output, create: spec.create }) as Component<I, O>;
  definitions.set(component, descriptor);
  return component;
}

export function describeRegistry(registry: Registry): Catalog {
  const seen = new Map<string, string>();
  const components: ComponentDescriptor[] = [];
  for (const [key, item] of Object.entries(readRecord(registry, 'INVALID_ARGUMENT'))) {
    const component = item as ComponentBase;
    const descriptor = definitions.get(component);
    if (!descriptor || key !== `${descriptor.id}@${descriptor.version}`) throw new FlowError('INVALID_ARGUMENT');
    checkMeanings(descriptor, seen);
    components.push(descriptor);
  }
  return Object.freeze({ version: 1, components: Object.freeze(components) });
}
