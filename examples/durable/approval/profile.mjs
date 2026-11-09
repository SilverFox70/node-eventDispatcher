import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { contract, map } from 'event-driven-design';
import { canonicalJson } from 'event-driven-design/model';
import { assertRegistryLockMatches, fingerprintGraphDocument, parseGraphDocument } from 'event-driven-design-artifacts';
import { durableWait, prepareDurableProfile, resumeDurableProfile } from 'event-driven-design-durable';
import { z } from 'zod';
import { finalizeApproval } from './handler.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const trigger = contract('approval-request@1', z.number().int());
const decision = contract('approval-decision@1', z.strictObject({ approved: z.boolean() }));
const result = contract('approval-result@1', z.strictObject({ approved: z.boolean(), disposition: z.string() }));
const registry = {
  'durable-wait@1': durableWait(trigger, decision, 'approved'),
  'map@1': map(decision, result, finalizeApproval),
};

const graph = {
  version: 1, nodes: [{ id: 'review', component: 'durable-wait@1' }, { id: 'record', component: 'map@1' }],
  inputs: { request: { node: 'review', port: 'in' } }, outputs: { result: { node: 'record', port: 'out' } },
  edges: [{ from: { node: 'review', port: 'out' }, to: { node: 'record', port: 'in' } }],
};

export async function approvalArtifact() {
  const source = await readFile(new globalThis.URL('./handler.mjs', import.meta.url));
  const profile = await readFile(new globalThis.URL(import.meta.url));
  const bindings = Object.entries(registry).map(([component, implementation]) => ({
    component, moduleBindingId: component === 'map@1' ? 'record' : 'review',
    implementationDigest: hash(component === 'map@1' ? Buffer.concat([source, profile]) : profile),
    contractsDigest: hash(canonicalJson([implementation.in.in, implementation.out.out].map(({ id, representationId, schema }) => ({ id, representationId, schema })))),
  }));
  const registryLock = { version: 1, policyVersion: 'approval@1', representations: [{ id: 'json', version: 1 }], bindings };
  const document = parseGraphDocument({
    format: 'nodeflow.document', version: 1, workspaceId: 'approval-demo', documentId: 'approval', draftRevision: 0,
    graph, registryLock, layout: { positions: {}, groups: {} },
  });
  return { document, revisionId: fingerprintGraphDocument(document).semanticHash };
}

/** The stored artifact and executable registry must both match the recorded run pin. */
export async function approvalProfile(artifact, pin) {
  const local = await approvalArtifact();
  const document = parseGraphDocument(artifact.document);
  if (fingerprintGraphDocument(document).semanticHash !== artifact.revisionId) throw Error('LOCKED_CONTENT_MISMATCH');
  assertRegistryLockMatches(document, local.document.registryLock);
  const { bindings, policyVersion } = document.registryLock;
  const options = {
    graph: document.graph, registry,
    identity: { bindings: bindings.map(({ component, implementationDigest, contractsDigest }) => ({
      component, implementationDigest, contractsDigest,
    })), runtimeVersion: 'approval@1', policyVersion, serviceProfileDigest: hash('local-approval-demo') },
    adapters: bindings.map(({ component, implementationDigest }) => ({
      component, implementationDigest, adapterVersion: 1, replayPolicy: 'pure',
      ...(component === 'durable-wait@1' && { operator: 'wait' }),
    })),
  };
  return pin ? resumeDurableProfile(pin, options) : prepareDurableProfile(options);
}
