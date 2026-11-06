import { executionIdentity, hashEvidence } from '../../diagnostics/causal/identity.js';
import { getGraphDefinition } from '../../graph.js';
import type { CompiledGraph } from '../../graph.js';
import { copyJson } from '../../packet/json.js';
import { FlowError } from '../../errors.js';
import { checkFixtureContracts } from '../fixtures/contracts.js';
import { checkFixtureRoles, reviewedFixture } from '../fixtures/review.js';
import { scriptServices } from '../fixtures/run.js';
import type { RegressionFixture } from '../../model/diagnostics/fixtures/fixture.js';
import type { ExecutionIdentityInput } from '../../diagnostics/causal/identity.js';
import type { ComparisonSide, RevisionDigests } from './compare.js';

export const fixtureDigest = (fixture: RegressionFixture) => hashEvidence(copyJson(fixture));

export function readSide(side: ComparisonSide) {
  const fixture = reviewedFixture(side.fixture, side.approve);
  checkFixtureRoles(fixture, side.roles);
  return fixture;
}

export function readRevision(side: ComparisonSide) {
  if (side.deterministic !== true) throw new FlowError('REVISION_UNVERIFIED');
  const revision = copyJson(side.revision) as unknown as ExecutionIdentityInput;
  const identity = executionIdentity(revision);
  if (identity.status !== 'verified') throw new FlowError('REVISION_UNVERIFIED');
  const graph = hashEvidence(copyJson(revision.graph));
  const entries = [...revision.bindings].sort((a, b) => a.component < b.component ? -1 : Number(a.component !== b.component));
  const code = hashEvidence(copyJson(entries.map(binding => [binding.component, binding.implementationDigest])));
  const contracts = hashEvidence(copyJson(entries.map(binding => [binding.component, binding.contractsDigest])));
  const digests: RevisionDigests = { execution: identity.digest, graph, code, contracts };
  const nodes = revision.graph.nodes.map(node => node.id);
  const overrides = copyJson(side.origins ?? {}) as Readonly<Record<string, string>>;
  if (Object.entries(overrides).some(([key, value]) => !nodes.includes(key) || typeof value !== 'string' || !value || value.length > 128)) {
    throw new FlowError('BINDING_MISMATCH');
  }
  const origins = new Map(nodes.map(node => [node, Object.hasOwn(overrides, node) ? overrides[node]! : node]));
  if (new Set(origins.values()).size !== nodes.length) throw new FlowError('BINDING_MISMATCH');
  const environment = hashEvidence([revision.runtimeVersion, revision.policyVersion, revision.serviceProfileDigest]);
  return { digests, origins, environment };
}

export function bindRevision(side: ComparisonSide, revision: ReturnType<typeof readRevision>, fixture: RegressionFixture, baseline: boolean):
  ReturnType<typeof readRevision> & { graph: CompiledGraph; checkConsumed: () => void } {
  const { services, checkConsumed } = scriptServices(fixture);
  const graph = side.build(services);
  const definition = getGraphDefinition(graph);
  if (hashEvidence(copyJson(definition.spec)) !== revision.digests.graph) throw new FlowError('BINDING_MISMATCH');
  checkFixtureContracts(graph, fixture, baseline);
  return { ...revision, graph, checkConsumed };
}
