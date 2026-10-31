import type { ComponentBase } from '../component.js';
import { FlowError } from '../errors.js';
import { validateValue } from './validation.js';
type Attribution = Readonly<{ runId: string; nodeId: string; component: ComponentBase }>;
const contexts = new WeakMap<object, Attribution>();

/** Private runtime attribution lets adapters validate before deriving a child packet. */
export function registerProcessContext(context: object, attribution: Attribution): void {
  contexts.set(context, attribution);
}
export function validateProcessOutput(context: object, port: string, value: unknown): void {
  const attribution = contexts.get(context);
  if (!attribution) throw new FlowError('INVALID_ARGUMENT');
  if (!Object.hasOwn(attribution.component.out, port)) throw new FlowError('UNKNOWN_PORT');
  validateValue(value, attribution.component.out[port]!, { ...attribution, port, direction: 'output' });
}
