import type { NetworkRun } from '../../runtime.js';
import { getRunDefinition } from '../../runtime.js';
import { getDecisionStream } from './records.js';
import type { Registry } from '../../component.js';
import { describeRegistry } from '../../component.js';
import type { DecisionCatalog, DecisionSnapshot } from '../../model/diagnostics/decisions.js';
import { FlowError } from '../../errors.js';
/** Trusted declarations live beside strict catalog1, never inside its unchanged schema. */
export function describeDecisions(registry: Registry): DecisionCatalog {
  const catalog = describeRegistry(registry);
  if (catalog.components.length > 1024) throw new FlowError('INVALID_ARGUMENT');
  return Object.freeze({ format: 'nodeflow.decision-catalog', version: 1,
    components: Object.freeze(catalog.components.map(item => Object.freeze({ component: `${item.id}@${item.version}`,
      decisions: registry[`${item.id}@${item.version}`]!.decisions ?? Object.freeze([]) }))) });
}
export function decisionSnapshot(run: NetworkRun): DecisionSnapshot { getRunDefinition(run); return getDecisionStream(run.diagnostics).snapshot(); }
/** Shares the existing bounded owner/notification lifetime with metadata diagnostics. */
export function onDecisions(run: NetworkRun, listener: () => void): () => void { getRunDefinition(run); return run.onDiagnostics(listener); }
