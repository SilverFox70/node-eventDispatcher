import { createHash } from 'node:crypto';
import { compileGraph, executionIdentity, FlowError } from 'event-driven-design';
import type { ExecutionIdentityInput, Registry } from 'event-driven-design';
import { canonicalJson } from 'event-driven-design/model';
import type { ComponentDescriptorV2, GraphSpec } from 'event-driven-design/model';
import { joinPolicy, prepareBoundedTasks } from 'event-driven-design/task-profile';
import { readDurableProfilePin } from '../model/index.js';
import type { DurableProfilePin } from '../model/index.js';
import { rememberProfile } from './definition.js';

export type DurableTaskAdapter = Readonly<{
  component: string;
  implementationDigest: string;
  adapterVersion: 1;
  replayPolicy: 'pure';
  operator?: 'broadcast' | 'filter' | 'merge' | 'join-by-key';
}>;

export type DurableProfileOptions = Readonly<{
  graph: GraphSpec;
  registry: Registry;
  identity: Omit<ExecutionIdentityInput, 'graph'>;
  adapters: readonly DurableTaskAdapter[];
}>;

function prepare(options: DurableProfileOptions) {
  const compiled = compileGraph(options.graph, options.registry);
  if (!compiled.ok) throw new FlowError('PROFILE_INELIGIBLE');
  const adapters = JSON.parse(canonicalJson(options.adapters, 1024 * 1024)) as DurableTaskAdapter[];
  const operators = new Map<string, NonNullable<DurableTaskAdapter['operator']>>();
  if (!Array.isArray(adapters)) throw new FlowError('PROFILE_INELIGIBLE');
  for (const adapter of adapters) {
    if (adapter && Object.hasOwn(adapter, 'operator')) {
      if (!adapter.operator || !['broadcast', 'filter', 'merge', 'join-by-key'].includes(adapter.operator)) throw new FlowError('PROFILE_INELIGIBLE');
      operators.set(adapter.component, adapter.operator);
    }
  }
  const { spec, catalog, registry, invoke, invokeOnce, invokeDelivery } = prepareBoundedTasks(compiled.graph, operators);
  const joins = new Map(spec.nodes.flatMap(node => {
    const policy = joinPolicy(registry[node.component]!);
    return policy ? [[node.id, policy] as const] : [];
  }));
  if (catalog.components.some(component =>
    (operators.get(component.id + '@' + component.version) !== 'join-by-key' && Object.keys(component.in).length > 32) ||
    Object.keys(component.out).length > 32)) {
    throw new FlowError('PROFILE_INELIGIBLE');
  }
  const { runtimeVersion, policyVersion, serviceProfileDigest, bindings } = options.identity;
  const execution = executionIdentity({ graph: spec, bindings, runtimeVersion, policyVersion, serviceProfileDigest });
  if (execution.status !== 'verified') throw new FlowError('PROFILE_INELIGIBLE');
  if (adapters.length !== bindings.length) throw new FlowError('PROFILE_INELIGIBLE');
  const implementations = new Map(bindings.map(binding => [binding.component, binding.implementationDigest]));
  for (const adapter of adapters) {
    if (!adapter || Object.keys(adapter).length !== (adapter.operator ? 5 : 4) || adapter.adapterVersion !== 1 || adapter.replayPolicy !== 'pure' ||
        !implementations.has(adapter.component) || implementations.get(adapter.component) !== adapter.implementationDigest) {
      throw new FlowError('PROFILE_INELIGIBLE');
    }
    implementations.delete(adapter.component);
  }
  const byComponent = new Map<string, ComponentDescriptorV2>(catalog.components.map(component => [component.id + '@' + component.version, component]));
  const pin = readDurableProfilePin({
    format: 'nodeflow.durable-profile', version: 1, executionDigest: execution.digest,
    adapterDigest: createHash('sha256').update(canonicalJson([...adapters]
      .sort((a, b) => a.component < b.component ? -1 : 1).map(adapter => {
        const { in: input, out: output, configuration } = byComponent.get(adapter.component)!;
        const join = joinPolicy(registry[adapter.component]!);
        return { adapter, input, output, configuration: configuration ?? null, ...(join && { join }) };
      }))).digest('hex'),
  });
  const profile = Object.freeze({ pin, invoke, invokeOnce, invokeDelivery, routed: operators.size > 0 });
  rememberProfile(profile, { spec, registry, operators, joins });
  return profile;
}

/** Admit a new pure task profile. Application review is the authority for replay safety. */
export function prepareDurableProfile(options: DurableProfileOptions) {
  try { return prepare(options); }
  catch { throw new FlowError('PROFILE_INELIGIBLE'); }
}

/** Resolve only the exact profile recorded for an existing run. */
export function resumeDurableProfile(pin: DurableProfilePin, options: DurableProfileOptions) {
  try {
    const expected = readDurableProfilePin(pin);
    const current = prepare(options);
    if (expected.executionDigest === current.pin.executionDigest && expected.adapterDigest === current.pin.adapterDigest) {
      return current;
    }
  } catch {
    // Missing or invalid bindings are unavailable for this recorded run.
  }
  throw new FlowError('VERSION_UNAVAILABLE');
}
