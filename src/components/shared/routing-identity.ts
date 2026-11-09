import type { RegistryComponent } from '../../component.js';

export type RoutingOperator = 'broadcast' | 'filter' | 'merge' | 'join-by-key';
const operators = new WeakMap<RegistryComponent, RoutingOperator>();

export function markRoutingOperator<T extends RegistryComponent>(component: T, operator: RoutingOperator): T {
  operators.set(component, operator);
  return component;
}

export function routingOperator(component: RegistryComponent): RoutingOperator | undefined {
  return operators.get(component);
}


type JoinPolicy = Readonly<{ names: readonly string[]; outputId: string; maxKeys: number; completedGroupLimit: number }>;
const joins = new WeakMap<RegistryComponent, JoinPolicy>();

export function markJoinOperator<T extends RegistryComponent>(component: T, policy: JoinPolicy): T {
  joins.set(component, Object.freeze({ ...policy, names: Object.freeze([...policy.names]) }));
  return markRoutingOperator(component, 'join-by-key');
}

export function joinPolicy(component: RegistryComponent) {
  return joins.get(component);
}
