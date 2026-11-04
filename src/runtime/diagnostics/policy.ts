import type { GraphDefinition } from '../../graph.js';
import { FlowError } from '../../errors.js';
import { readArray, readRecord } from '../../packet/data.js';
import { validJob } from '../../packet/metadata.js';

export type CaptureRule = Readonly<{ nodeId: string; ports?: readonly string[]; jobIds?: readonly string[]; inputs: boolean; outputs: boolean }>;
export type CapturePolicy = Readonly<{ allowedNodes: readonly string[]; denyInputs: readonly string[]; denyOutputs: readonly string[]; maxPayloadBytes: number; maxSessionMs: number }>;
export function exact(value: unknown, required: string[], optional: string[] = []): Record<string, unknown> {
  const fields = readRecord(value, 'INVALID_ARGUMENT');
  if (required.some(key => !Object.hasOwn(fields, key)) || Object.keys(fields).some(key => ![...required, ...optional].includes(key))) throw new FlowError('INVALID_ARGUMENT');
  return fields;
}
export function bounded(value: unknown, max: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > max) throw new FlowError('INVALID_ARGUMENT');
  return value as number;
}
function selectors(value: unknown, max: number, valid: (entry: unknown) => boolean): readonly string[] {
  const values = readArray(value, 'INVALID_ARGUMENT', max);
  if (new Set(values).size !== values.length || !values.every(valid)) throw new FlowError('INVALID_ARGUMENT');
  return Object.freeze(values as string[]);
}
/** Resolve names against the real compiled registry, never client catalog authority. */
export function createCapturePolicy(definition: GraphDefinition, value: unknown) {
  const nodes = new Map(definition.spec.nodes.map(node => [node.id, definition.registry[node.component]!]));
  const nodeExists = (id: unknown) => typeof id === 'string' && nodes.has(id);
  let policy: CapturePolicy = Object.freeze({ allowedNodes: [], denyInputs: [], denyOutputs: [], maxPayloadBytes: 2048, maxSessionMs: 900000 });
  if (value !== undefined) {
    const fields = exact(value, ['allowedNodes', 'denyInputs', 'denyOutputs', 'maxPayloadBytes', 'maxSessionMs']);
    policy = Object.freeze({ allowedNodes: selectors(fields.allowedNodes, nodes.size, nodeExists),
      denyInputs: selectors(fields.denyInputs, nodes.size, nodeExists), denyOutputs: selectors(fields.denyOutputs, nodes.size, nodeExists),
      maxPayloadBytes: bounded(fields.maxPayloadBytes, 2048), maxSessionMs: bounded(fields.maxSessionMs, 900000) });
  }
  function rules(value: unknown): readonly CaptureRule[] {
    let jobs = 0;
    const seen = new Set<string>();
    return Object.freeze(readArray(value, 'INVALID_ARGUMENT', 32).map(input => {
      const fields = exact(input, ['nodeId', 'inputs', 'outputs'], ['ports', 'jobIds']);
      if (!nodeExists(fields.nodeId) || typeof fields.inputs !== 'boolean' || typeof fields.outputs !== 'boolean') throw new FlowError('INVALID_ARGUMENT');
      const nodeId = fields.nodeId as string, component = nodes.get(nodeId)!;
      const ports = Object.hasOwn(fields, 'ports') ? selectors(fields.ports, 256, port => typeof port === 'string' &&
        (Object.hasOwn(component.in, port) || Object.hasOwn(component.out, port))) : undefined;
      const jobIds = Object.hasOwn(fields, 'jobIds') ? selectors(fields.jobIds, 256, validJob) : undefined;
      jobs += jobIds?.length ?? 0;
      if (jobs > 256) throw new FlowError('INVALID_ARGUMENT');
      const identity = JSON.stringify([nodeId, fields.inputs, fields.outputs, ports && [...ports].sort(), jobIds && [...jobIds].sort()]);
      if (seen.has(identity)) throw new FlowError('INVALID_ARGUMENT');
      seen.add(identity);
      return Object.freeze({ nodeId, inputs: fields.inputs, outputs: fields.outputs,
        ...(ports === undefined ? {} : { ports }), ...(jobIds === undefined ? {} : { jobIds }) });
    }));
  }
  function effective(rules: readonly CaptureRule[]): readonly CaptureRule[] {
    return Object.freeze(rules.map(rule => Object.freeze({ ...rule,
      inputs: rule.inputs && policy.allowedNodes.includes(rule.nodeId) && !policy.denyInputs.includes(rule.nodeId),
      outputs: rule.outputs && policy.allowedNodes.includes(rule.nodeId) && !policy.denyOutputs.includes(rule.nodeId) })));
  }
  return { policy, rules, effective };
}
