import { defineComponent } from '../component.js';
import type { Contract } from '../contracts.js';
import { FlowError } from '../errors.js';
import type { Json } from '../packet.js';
import { markRoutingOperator } from './shared/routing-identity.js';

const names = new WeakMap<object, string>();

/** A wait definition is executable only by the durable host. */
export function durableWait<I extends Json, O extends Json>(input: Contract<I>, output: Contract<O>, signalName: string) {
  if (typeof signalName !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(signalName)) {
    throw new FlowError('INVALID_ARGUMENT');
  }
  const component = markRoutingOperator(defineComponent({
    id: 'durable-wait', version: 1, title: 'Durable wait', description: 'Wait for an authorized signal',
    in: { in: input }, out: { out: output },
    create: () => async () => { throw new FlowError('PROFILE_INELIGIBLE'); },
  }), 'wait');
  names.set(component, signalName);
  return component;
}

export function waitSignalName(component: object) {
  return names.get(component);
}
