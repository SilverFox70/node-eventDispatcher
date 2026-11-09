import { createHash } from 'node:crypto';
import { FlowError } from 'event-driven-design';
import type { Json } from 'event-driven-design';
import { validIdentifier } from '../submission/input.js';
import { serialize } from '../steps/model.js';

export type ExternalOperationRequest = Readonly<{
  provider: string;
  businessKey: string;
  resourceKey: string;
  revision: number;
  policy: 'reconcile-required';
  policyVersion: string;
  payload: Json;
}>;
export type ExternalOperation = Readonly<{
  operationId: string;
  state: 'prepared' | 'invocation-intent' | 'uncertain' | 'succeeded';
}>;

export function readOperation(input: ExternalOperationRequest) {
  const request = JSON.parse(serialize(input)) as ExternalOperationRequest;
  if (!request) throw new FlowError('INVALID_EXTERNAL_OPERATION');
  const { provider, businessKey, resourceKey, policy, policyVersion, revision } = request;
  if (Object.keys(request).length !== 7 || !Object.hasOwn(request, 'payload') ||
      ![provider, businessKey, resourceKey, policyVersion].every(validIdentifier) ||
      policy !== 'reconcile-required' || !Number.isInteger(revision) || revision < 1 || revision > 2147483647) {
    throw new FlowError('INVALID_EXTERNAL_OPERATION');
  }
  const fingerprint = createHash('sha256').update(serialize(request)).digest('hex');
  return { request, fingerprint };
}
