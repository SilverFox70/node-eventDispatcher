import { performance } from 'node:perf_hooks';
import { readRecord, readArray } from '../../packet/data.js';
import { snapshotJsonMetadata } from '../../model/contracts.js';
import { checkDecisionRequest } from '../../model/diagnostics/decisions.js';
import type { DecisionDeclaration, DecisionRequest, DecisionRecord, DecisionSnapshot } from '../../model/diagnostics/decisions.js';
import type { AttemptObservation } from '../task-attempt.js';

type Binding = { nodeId: string; operationId: string; attemptId: string; attempt: number; inputs: AttemptObservation['inputs'] };
const attempts = new WeakMap<object, (value: unknown) => void>();
/** Runtime-only observation hook: callers cannot forge filter observations through recordDecision. */
export function observeFilterResult(context: object, value: unknown): void { attempts.get(context)?.(value); }
export function createDecisionStream(runId: string, started: number, retain: (evict: () => void) => void, changed: () => void) {
  let total = 0, rejected = 0;
  const events: DecisionRecord[] = [];
  function emit(binding: Binding, data: { format: 'nodeflow.filter'; outcome: 'keep' | 'drop' } | ({ format: 'nodeflow.decision' } & DecisionRequest)) {
    events.push(Object.freeze({ ...binding, ...data, version: 1 as const, runId, sequence: total + 1, timeMs: performance.now() - started }));
    total++; retain(() => { events.shift(); }); changed();
  }
  function bind(context: object, binding: Binding, declarations: readonly DecisionDeclaration[], live: () => boolean) {
    let count = 0;
    attempts.set(context, value => {
      try { if (typeof value === 'boolean' && live()) emit(binding, { format: 'nodeflow.filter', outcome: value ? 'keep' : 'drop' }); }
      catch { rejected++; changed(); }
    });
    return (value: DecisionRequest): boolean => {
      try {
        if (!live() || count >= 32) throw Error('Closed or full attempt');
        const fields = readRecord(value, 'INVALID_ARGUMENT');
        const facts = readArray(fields.facts, 'INVALID_ARGUMENT', 16).map(fact => readRecord(fact, 'INVALID_ARGUMENT'));
        const request = { ...fields, facts }; checkDecisionRequest(request);
        const declaration = declarations.find(item => item.code === fields.code && item.ruleVersion === fields.ruleVersion);
        if (!declaration || !declaration.outcomes.includes(fields.outcome as DecisionRequest['outcome']) ||
          facts.some(fact => !declaration.facts.includes(fact.name as string) || (Object.hasOwn(fact, 'sourcePacketId') && !binding.inputs.some(input => input.packetId === fact.sourcePacketId)))) throw Error('Undeclared decision');
        const copied = snapshotJsonMetadata(request) as unknown as DecisionRequest;
        emit(binding, { format: 'nodeflow.decision', ...copied }); count++; return true;
      } catch { rejected++; changed(); return false; }
    };
  }
  return { bind, snapshot(): DecisionSnapshot {
    return Object.freeze({ format: 'nodeflow.decisions', version: 1, runId, total, dropped: total - events.length, rejected, events: Object.freeze([...events]) });
  } };
}
