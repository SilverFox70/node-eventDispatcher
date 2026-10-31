import type { ComponentBase } from '../component.js';
import { FlowError } from '../errors.js';
import { validateValue } from './validation.js';
type Attribution = Readonly<{ runId: string; nodeId: string; component: ComponentBase }>;
type Owner = Attribution & Readonly<{ onEnd: (cleanup: () => void) => unknown }>;
const contexts = new WeakMap<object, Owner>();

/** Private runtime attribution lets adapters validate before deriving a child packet. */
export function registerProcessContext(context: object, attribution: Attribution, onEnd: Owner['onEnd']): void {
  contexts.set(context, { ...attribution, onEnd });
}
export function validateProcessOutput(context: object, port: string, value: unknown): void {
  const attribution = contexts.get(context);
  if (!attribution) throw new FlowError('INVALID_ARGUMENT');
  if (!Object.hasOwn(attribution.component.out, port)) throw new FlowError('UNKNOWN_PORT');
  validateValue(value, attribution.component.out[port]!, { ...attribution, port, direction: 'output' });
}

/** Private cleanup registration retains protection through downstream work, including successful completion. */
export function onProcessRunEnd(context: object, cleanup: () => void): void {
  const owner = contexts.get(context);
  if (!owner) throw new FlowError('INVALID_ARGUMENT');
  owner.onEnd(cleanup);
}
