import { FlowError } from '../../errors.js';
import { getGraphDefinition } from '../../graph.js';
import type { CompiledGraph } from '../../graph.js';
import type { CausalEvidence } from '../../model/diagnostics/causal/evidence.js';
import { validateCausalEvidence } from '../../model/diagnostics/causal/evidence.js';
import type { RegressionFixture, FixturePorts } from '../../model/diagnostics/fixtures/fixture.js';
import type { DiagnosticRecord } from '../../model/diagnostics/index.js';
import type { Endpoint } from '../../model/graph.js';
import { checkFixtureRoles, reviewedFixture } from '../../testing/fixtures/review.js';
import type { FixtureApproval } from '../../testing/fixtures/review.js';
import { checkFixtureContracts } from '../../testing/fixtures/contracts.js';

import { matchesReviewed, pointerPart } from './substitutions.js';

const prepared = new WeakSet<RegressionFixture>();
type Transfer = Extract<DiagnosticRecord, { packet: object }>;

function requireCaptures(
  records: readonly Transfer[], jobId: string, ports: FixturePorts,
  endpoints: Readonly<Record<string, Endpoint>>, references: readonly number[],
  root: string, substitutions: ReadonlySet<string>,
): void {
  const matching = records.filter(record => record.packet.jobId === jobId);
  const actual: number[] = [];
  for (const [name, endpoint] of Object.entries(endpoints)) {
    const stream = matching.filter(row => row.nodeId === endpoint.node && row.port === endpoint.port);
    if (stream.length !== ports[name]!.length) {
      throw new FlowError('FIXTURE_INCOMPLETE');
    }
    for (const [index, record] of stream.entries()) {
      const capture = record.capture;
      if (capture?.state !== 'captured') throw new FlowError('FIXTURE_INCOMPLETE');
      const original = { value: capture.value, ...(record.packet.key === undefined ? {} : { key: record.packet.key }) };
      if (!matchesReviewed(original, ports[name]![index], root + '/' + pointerPart(name) + '/' + index, substitutions)) {
        throw new FlowError('FIXTURE_REVIEW_REQUIRED');
      }
      actual.push(record.sequence);
    }
  }
  if (actual.length !== matching.length || actual.length !== references.length ||
    actual.some((sequence, index) => sequence !== references[index])) throw new FlowError('FIXTURE_INCOMPLETE');
}

/** Review receives only the authored fixture, never the raw captured payloads. */
export function prepareRegressionFixture(
  graph: CompiledGraph, evidence: CausalEvidence, jobId: string, candidate: unknown, approval: FixtureApproval,
): RegressionFixture {
  const { spec } = getGraphDefinition(graph);
  if (!validateCausalEvidence(evidence).ok || evidence.identity.status !== 'verified' ||
    evidence.diagnostics.dropped || evidence.decisions.dropped ||
    !evidence.diagnostics.events.some(row => row.kind === 'run-terminal' && row.status === 'completed')) {
    throw new FlowError('FIXTURE_INCOMPLETE');
  }
  const digest = evidence.identity.digest;
  const fixture = reviewedFixture(candidate, value => {
    if (value.executionIdentity !== digest || value.provenance.runId !== evidence.runId) {
      throw new FlowError('BINDING_MISMATCH');
    }
    checkFixtureRoles(value, approval.roles);
    checkFixtureContracts(graph, value);
    const events = evidence.diagnostics.events;
    const substitutions = new Set(value.redactionReview.substitutions);
    requireCaptures(events.filter(row => row.kind === 'input-admitted'), jobId, value.input, spec.inputs,
      value.provenance.inputSequences, '/input', substitutions);
    const endpoints = Object.values(spec.outputs);
    const outputs = events.filter((row): row is Transfer => row.kind === 'sent' &&
      endpoints.some(endpoint => endpoint.node === row.nodeId && endpoint.port === row.port));
    requireCaptures(outputs, jobId, value.expected.outputs, spec.outputs,
      value.provenance.outputSequences, '/expected/outputs', substitutions);
    return approval.approve(value);
  });
  prepared.add(fixture);
  return fixture;
}

export function assertPreparedFixture(fixture: RegressionFixture): void {
  if (!prepared.has(fixture)) throw new FlowError('FIXTURE_REVIEW_REQUIRED');
}
