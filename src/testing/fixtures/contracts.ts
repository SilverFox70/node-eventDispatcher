import { getGraphDefinition } from '../../graph.js';
import type { CompiledGraph } from '../../graph.js';
import { getContractIssues } from '../../contracts.js';
import { FlowError } from '../../errors.js';
import type { RegressionFixture } from '../../model/diagnostics/fixtures/fixture.js';

/** Preflight both reviewed inputs and expectations before invoking graph factories. */
export function checkFixtureContracts(graph: CompiledGraph, fixture: RegressionFixture, checkDecisions = true): void {
  const { spec, registry } = getGraphDefinition(graph);
  for (const [ports, endpoints, direction] of [
    [fixture.input, spec.inputs, 'in'], [fixture.expected.outputs, spec.outputs, 'out'],
  ] as const) {
    const names = Object.keys(endpoints);
    if (names.length !== Object.keys(ports).length) throw new FlowError('BINDING_MISMATCH');
    for (const name of names) {
      const endpoint = endpoints[name]!;
      const node = spec.nodes.find(node => node.id === endpoint.node)!;
      const contract = registry[node.component]![direction][endpoint.port]!;
      if (!Object.hasOwn(ports, name)) throw new FlowError('BINDING_MISMATCH');
      if (ports[name]!.some(packet => getContractIssues(contract, packet.value).length)) throw new FlowError('FIXTURE_CONTRACT');
    }
  }
  if (!checkDecisions) return;
  for (const decision of fixture.expected.decisions) {
    const node = spec.nodes.find(node => node.id === decision.nodeId);
    if (!node || !registry[node.component]!.decisions?.some(row => row.code === decision.code &&
      row.ruleVersion === decision.ruleVersion && row.outcomes.includes(decision.outcome))) throw new FlowError('BINDING_MISMATCH');
  }
}
