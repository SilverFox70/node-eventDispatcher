import type { RegistryComponent } from '../../component.js';

export type RoutingOperator = 'broadcast' | 'filter' | 'merge';
const operators = new WeakMap<RegistryComponent, RoutingOperator>();

export function markRoutingOperator<T extends RegistryComponent>(component: T, operator: RoutingOperator): T {
  operators.set(component, operator);
  return component;
}

export function routingOperator(component: RegistryComponent): RoutingOperator | undefined {
  return operators.get(component);
}
