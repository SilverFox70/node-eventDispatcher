import { deepStrictEqual } from 'node:assert/strict';
import { FlowError } from '../../errors.js';
import { packet } from '../../packet.js';
import type { Json } from '../../packet.js';
import type { CompiledGraph } from '../../graph.js';
import type { RegressionFixture } from '../../model/diagnostics/fixtures/fixture.js';
import { runGraph } from '../run-graph.js';
import { checkFixtureRoles, reviewedFixture } from './review.js';
import type { FixtureApproval } from './review.js';
import { checkFixtureContracts } from './contracts.js';

export type FixtureServices = Readonly<Record<string, () => Json>>;
export type FixtureBindings = FixtureApproval & Readonly<{
  executionIdentity: string;
  build: (services: FixtureServices) => CompiledGraph;
}>;

function scriptServices(fixture: RegressionFixture) {
  const cursors = new Map<string, number>();
  const services = Object.freeze(Object.assign(Object.create(null) as Record<string, () => Json>,
    Object.fromEntries(Object.entries(fixture.dependencyScripts).map(([role, steps]) => [role, () => {
      const index = cursors.get(role) ?? 0;
      cursors.set(role, index + 1);
      const step = steps[index];
      if (!step) throw new FlowError('FIXTURE_SCRIPT_EXHAUSTED');
      if (step.outcome === 'error') throw new FlowError(step.code);
      return step.value;
    }]))));
  return { services, checkConsumed() {
    for (const [role, steps] of Object.entries(fixture.dependencyScripts)) {
      if ((cursors.get(role) ?? 0) !== steps.length) throw new FlowError('FIXTURE_SCRIPT_MISMATCH');
    }
  } };
}

/** Run a reviewed fixture through the existing harness and caller-owned offline bindings. */
export async function runRegressionFixture(value: unknown, bindings: FixtureBindings): Promise<void> {
  const fixture = reviewedFixture(value, bindings.approve);
  if (fixture.executionIdentity !== bindings.executionIdentity) throw new FlowError('BINDING_MISMATCH');
  checkFixtureRoles(fixture, bindings.roles);
  const { services, checkConsumed } = scriptServices(fixture);
  const graph = bindings.build(services);
  checkFixtureContracts(graph, fixture);
  const inputs = Object.fromEntries(Object.entries(fixture.input).map(([port, packets]) => [port,
    packets.map(item => packet(item.value, { jobId: fixture.caseId, ...(item.key === undefined ? {} : { key: item.key }) }))]));
  const result = await runGraph(graph, { inputs, decisionEvidence: true, maxOutputPackets: 64 });
  if (result.terminal.status !== 'completed') throw new FlowError('FIXTURE_RUN_FAILED');
  checkConsumed();
  const decisions = result.decisions!;
  if (decisions.dropped || decisions.rejected) throw new FlowError('FIXTURE_INCOMPLETE');
  const outputs = Object.fromEntries(Object.entries(result.outputs).map(([port, packets]) => [port,
    packets.map(item => ({ value: item.value, ...(item.key === undefined ? {} : { key: item.key }) }))]));
  deepStrictEqual(JSON.parse(JSON.stringify(outputs)), JSON.parse(JSON.stringify(fixture.expected.outputs)), 'Fixture outputs changed');
  const reports = decisions.events.flatMap(row => row.format === 'nodeflow.decision'
    ? [{ nodeId: row.nodeId, code: row.code, ruleVersion: row.ruleVersion, outcome: row.outcome }] : []);
  deepStrictEqual(reports, fixture.expected.decisions, 'Fixture decisions changed');
}
