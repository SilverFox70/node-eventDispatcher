import type { ExecutionIdentityInput } from '../../diagnostics/causal/identity.js';
import type { CompiledGraph } from '../../graph.js';
import type { Json } from '../../packet.js';
import type { FixtureApproval } from '../fixtures/review.js';
import type { FixtureServices } from '../fixtures/run.js';

import { isDeepStrictEqual } from 'node:util';
import { FlowError } from '../../errors.js';
import { copyJson } from '../../packet/json.js';
import { hashEvidence } from '../../diagnostics/causal/identity.js';
import { runGraph } from '../run-graph.js';
import { fixtureInputs } from '../fixtures/run.js';
import { bindRevision, fixtureDigest, readRevision, readSide } from './revision.js';
import { observeComparison } from './observations.js';

export type ComparisonSide = FixtureApproval & Readonly<{
  fixture: unknown;
  revision: ExecutionIdentityInput;
  deterministic: true;
  origins?: Readonly<Record<string, string>>;
  build: (services: FixtureServices) => CompiledGraph;
}>;

export type ComparisonKind = 'output' | 'decision' | 'path' | 'failure';
export type ComparisonChange = Readonly<{
  kind: ComparisonKind; origin: readonly string[]; occurrence: number;
  baseline?: Json; candidate?: Json;
}>;
export type RevisionDigests = Readonly<{ execution: string; graph: string; code: string; contracts: string }>;
export type ComparisonResult = Readonly<{
  status: 'not-comparable'; reason: 'FIXTURE_MISMATCH' | 'FIXTURE_REFUSED' | 'REVISION_UNVERIFIED' |
    'BINDING_MISMATCH' | 'INCOMPATIBLE_CONTRACT' | 'INCOMPLETE_EVIDENCE';
} | {
  status: 'equal-on-fixtures' | 'changed-on-fixtures'; caseId: string;
  fixtureDigest: string; dependencyScriptDigest: string;
  baseline: RevisionDigests; candidate: RevisionDigests;
  changes: readonly ComparisonChange[]; unchanged: readonly ComparisonChange[];
}>;

type Refusal = Extract<ComparisonResult, { status: 'not-comparable' }>['reason'];
const refused = (reason: Refusal): ComparisonResult => ({ status: 'not-comparable', reason });

/** Compare two explicit revisions against the same reviewed, finite service facts. */
export async function compareFixture(pair: Readonly<{ baseline: ComparisonSide; candidate: ComparisonSide }>): Promise<ComparisonResult> {
  let phase: Refusal = 'FIXTURE_REFUSED';
  try {
    const { baseline, candidate } = pair;
    const fixture = readSide(baseline);
    const digest = fixtureDigest(fixture);
    const other = readSide(candidate);
    if (digest !== fixtureDigest(other) || !isDeepStrictEqual(fixture, other)) return refused('FIXTURE_MISMATCH');

    phase = 'REVISION_UNVERIFIED';
    const before = readRevision(baseline), after = readRevision(candidate);
    if (before.environment !== after.environment) return refused('FIXTURE_MISMATCH');
    if (before.digests.execution !== fixture.executionIdentity) return refused('BINDING_MISMATCH');

    phase = 'BINDING_MISMATCH';
    const left = bindRevision(baseline, before, fixture, true), right = bindRevision(candidate, after, fixture, false);
    phase = 'INCOMPLETE_EVIDENCE';
    async function run(revision: typeof left) {
      const result = await runGraph(revision.graph, { inputs: fixtureInputs(fixture), decisionEvidence: true, maxOutputPackets: 64 });
      revision.checkConsumed();
      return observeComparison(result, revision.origins);
    }
    const leftSeries = await run(left), rightSeries = await run(right);
    const changes: ComparisonChange[] = [], unchanged: ComparisonChange[] = [];
    const keys = [...new Set([...leftSeries.keys(), ...rightSeries.keys()])].sort();
    for (const key of keys) {
      const a = leftSeries.get(key), b = rightSeries.get(key);
      const { kind, origin } = (a ?? b)!;
      for (let occurrence = 0; occurrence < Math.max(a?.values.length ?? 0, b?.values.length ?? 0); occurrence++) {
        const av = a?.values[occurrence], bv = b?.values[occurrence];
        const row = { kind, origin, occurrence, ...(av === undefined ? {} : { baseline: av }),
          ...(bv === undefined ? {} : { candidate: bv }) };
        (isDeepStrictEqual(av, bv) ? unchanged : changes).push(row);
      }
    }
    return { status: changes.length ? 'changed-on-fixtures' : 'equal-on-fixtures', caseId: fixture.caseId,
      fixtureDigest: digest, dependencyScriptDigest: hashEvidence(copyJson(fixture.dependencyScripts)),
      baseline: before.digests, candidate: after.digests, changes, unchanged };
  } catch (error) {
    if (error instanceof FlowError) {
      if (error.code === 'FIXTURE_CONTRACT') return refused('INCOMPATIBLE_CONTRACT');
      if (error.code === 'BINDING_MISMATCH') return refused('BINDING_MISMATCH');
    }
    return refused(phase);
  }
}
