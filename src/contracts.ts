import * as z from 'zod';
import { safeParse } from 'zod/v4/core';
import type { ContractBase, ContractIssue } from './model/contracts.js';
import { assertDescriptorSchema, contractsCompatible, snapshotJsonMetadata } from './model/contracts.js';
import type { Json } from './packet.js';
import { copyJson } from './packet/json.js';
import { readRecord } from './packet/data.js';
import { FlowError } from './errors.js';
import { assertSupported } from './contracts/schema.js';

declare const contractType: unique symbol;
export type Contract<T> = ContractBase & Readonly<{
  [contractType]: (value: T) => T;
  validate(value: unknown): value is T;
}>;
const contracts = new WeakMap<object, (value: unknown) => readonly ContractIssue[]>();

export function assertContract(value: unknown): asserts value is ContractBase {
  if (typeof value === 'object' && value !== null && contracts.has(value)) return;
  const fields = readRecord(value, 'INVALID_ARGUMENT');
  if (typeof fields.representationId === 'string' && fields.representationId !== 'json@1') {
    throw new FlowError('UNSUPPORTED_REPRESENTATION');
  }
  throw new FlowError('INVALID_ARGUMENT', 'Expected a framework contract');
}

function makeContract<T>(id: string, schema: Json, check: (value: Json) => readonly ContractIssue[]): Contract<T> {
  const issues = (value: unknown): readonly ContractIssue[] => {
    try { return check(copyJson(value)); }
    catch (error) {
      if (error instanceof FlowError && error.code === 'INVALID_PACKET') {
        return Object.freeze([Object.freeze({ code: 'INVALID_PACKET', path: Object.freeze([]) })]);
      }
      throw error;
    }
  };
  const result = Object.freeze({
    id, representationId: 'json@1', schema,
    validate(value: unknown): value is T { return issues(value).length === 0; }
  }) as Contract<T>;
  contracts.set(result, issues);
  return result;
}

/** Internal runtime/UI handoff: safe schema paths/codes, never raw Zod messages or inputs. */
export function getContractIssues(contract: ContractBase, value: unknown): readonly ContractIssue[] {
  assertContract(contract);
  return contracts.get(contract)!(value);
}

function assertContractId(id: string): void {
  if (typeof id !== 'string' || id.length === 0 || id.length > 128 || id.lastIndexOf('@') < 1 || id.endsWith('@') || id === 'json@1') {
    throw new FlowError('INVALID_ARGUMENT', 'Invalid or reserved contract ID');
  }
}

export function contract<T extends Json>(id: string, schema: z.ZodType<T, T>): Contract<T> {
  assertContractId(id);
  assertSupported(schema);
  let descriptor: Json;
  try {
    descriptor = snapshotJsonMetadata(JSON.parse(JSON.stringify(z.toJSONSchema(schema, {
      target: 'draft-2020-12', unrepresentable: 'throw', cycles: 'throw', reused: 'inline',
      metadata: z.registry()
    }))));
    assertDescriptorSchema(descriptor);
  } catch { throw new FlowError('UNSUPPORTED_SCHEMA'); }
  return makeContract(id, descriptor, value => {
    const parsed = safeParse(schema, value);
    if (parsed.success) return Object.freeze([]);
    return Object.freeze(parsed.error.issues.map(issue => Object.freeze({
      code: issue.code,
      // JSON payloads and supported object schemas have no symbol keys.
      path: Object.freeze([...issue.path] as (string | number)[])
    })));
  });
}

export const jsonContract: Contract<Json> = makeContract('json@1', Object.freeze({}), () => Object.freeze([]));

/** Internal compiler handoff: validated contract identity, not structural subtyping. */
export function assertCompatibleContracts(source: ContractBase, destination: ContractBase): void {
  assertContract(source); assertContract(destination);
  const port = (value: ContractBase) => ({ contractId: value.id, representationId: value.representationId, schema: value.schema });
  if (!contractsCompatible(port(source), port(destination))) throw new FlowError('CONTRACT_MISMATCH');
}

/** Internal product contract: compose trusted validators and descriptors, without schema interpretation. */
export function objectContract(id: string, inputs: Readonly<Record<string, ContractBase>>): Contract<Json> {
  assertContractId(id);
  const fields = readRecord(inputs, 'INVALID_ARGUMENT');
  for (const value of Object.values(fields)) assertContract(value);
  const ports = fields as Readonly<Record<string, ContractBase>>;
  const names = Object.keys(fields);
  const descriptor = snapshotJsonMetadata({ type: 'object', additionalProperties: false,
    properties: Object.fromEntries(names.map(name => [name, ports[name]!.schema])), required: names });
  assertDescriptorSchema(descriptor);
  return makeContract(id, descriptor, value => {
    const issue = (code: string, path: readonly (string | number)[]): ContractIssue => Object.freeze({ code, path: Object.freeze([...path]) });
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return Object.freeze([issue('invalid_type', [])]);
    const issues: ContractIssue[] = [];
    if (Object.keys(value).some(name => !Object.hasOwn(fields, name))) issues.push(issue('unrecognized_keys', []));
    for (const name of names) {
      for (const child of getContractIssues(ports[name]!, Object.hasOwn(value, name) ? value[name] : undefined)) {
        issues.push(issue(child.code, [name, ...child.path]));
      }
    }
    return Object.freeze(issues);
  });
}
