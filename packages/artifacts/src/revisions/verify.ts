import { randomUUID } from 'node:crypto';
import { compileGraph, executionIdentity } from 'event-driven-design';
import type { Registry } from 'event-driven-design';
import { runRegressionFixture } from 'event-driven-design/testing';
import type { FixtureApproval, FixtureServices } from 'event-driven-design/testing';
import { assertRegistryLockMatches } from '../model/index.js';
import type { Draft } from '../store/index.js';
import { prepareProfile } from './profile.js';
import type { TestProfile, TestReceipt } from './profile.js';

export type DraftVerification = TestProfile & FixtureApproval & Readonly<{
  registry: (services: FixtureServices) => Registry;
}>;

/** Issue a receipt only after the ordinary offline fixture assertions have passed. */
export async function verifyDraft(draft: Draft, profile: DraftVerification): Promise<TestReceipt> {
  const { fixture, registryLock, pins } = prepareProfile(profile);
  const { document, semanticHash } = draft;
  assertRegistryLockMatches(document, registryLock);
  const { graph } = document;
  const identity = executionIdentity({
    graph,
    bindings: registryLock.bindings.map(({ component, implementationDigest, contractsDigest }) =>
      ({ component, implementationDigest, contractsDigest })),
    policyVersion: registryLock.policyVersion,
    runtimeVersion: pins.runtimeVersion,
    serviceProfileDigest: pins.serviceProfileHash,
  });
  if (identity.status !== 'verified') throw Error('UNVERIFIED_TEST_IDENTITY');
  await runRegressionFixture(fixture, {
    executionIdentity: identity.digest, approve: profile.approve, roles: profile.roles,
    build(services) {
      const compiled = compileGraph(graph, profile.registry(services));
      if (!compiled.ok) throw Error('INVALID_TEST_GRAPH');
      return compiled.graph;
    },
  });
  return { ...pins, version: 1, outcome: 'passed', semanticHash, policyVersion: registryLock.policyVersion,
    receiptId: randomUUID() };
}
