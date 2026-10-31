import { defineFunction } from '../function.js';
import type { FunctionSpec } from '../function.js';
import type { Contract } from '../contracts.js';
import type { Json } from '../packet.js';

/** Transform serially, deriving one child per input using the runtime's task policy. */
export function map<I extends Json, O extends Json>(input: Contract<I>, output: Contract<O>, handler: FunctionSpec<NoInfer<I>, NoInfer<O>>['handler']) {
  return defineFunction({ id: 'map', version: 1, title: 'Map', description: 'Serial payload transformation', input, output, handler });
}
