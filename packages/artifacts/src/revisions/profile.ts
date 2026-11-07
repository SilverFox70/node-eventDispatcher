import { createHash } from 'node:crypto';
import { canonicalJson } from 'event-driven-design/model';
import type { GraphSpec, RegressionFixture } from 'event-driven-design/model';
import { parseArtifactFixture } from '../model/index.js';
import type { GraphLayout, RegistryLock } from '../model/index.js';
import { digest, maxArtifactBytes, name } from '../model/fields.js';

export type TestProfile = Readonly<{
  fixture: unknown; registryLock: RegistryLock; serviceProfileHash: string; runtimeVersion: string;
}>;

export type ReceiptPins = Readonly<{
  fixtureHash: string; assertionSetHash: string; serviceProfileHash: string; runtimeVersion: string;
}>;

export type TestReceipt = ReceiptPins & Readonly<{
  version: 1; receiptId: string; semanticHash: string; policyVersion: string; outcome: 'passed';
}>;

export type LockedRevision = Readonly<{
  format: 'nodeflow.revision'; version: 1; revisionId: string; documentId: string; semanticHash: string;
  graph: GraphSpec; registryLock: RegistryLock; testReceipt: TestReceipt; createdAt: string; actorId: string;
}>;

export type LockedGraph = Readonly<{ revision: LockedRevision; layout: GraphLayout }>;

function hash(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

export function prepareProfile(profile: TestProfile): {
  fixture: RegressionFixture; registryLock: RegistryLock; pins: ReceiptPins;
} {
  if (!digest(profile.serviceProfileHash) || !name(profile.runtimeVersion)) throw Error('INVALID_TEST_PROFILE');
  const fixture = parseArtifactFixture(profile.fixture);
  const registryLock = JSON.parse(canonicalJson(profile.registryLock, maxArtifactBytes)) as RegistryLock;
  return { fixture, registryLock, pins: {
    fixtureHash: hash(fixture), assertionSetHash: hash(fixture.expected),
    serviceProfileHash: profile.serviceProfileHash, runtimeVersion: profile.runtimeVersion,
  } };
}
