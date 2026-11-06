import { readArray, readRecord } from '../../packet/data.js';
import { checkDeclarations } from '../../model/diagnostics/decisions.js';
import type { DecisionDeclaration } from '../../model/diagnostics/decisions.js';
import { snapshotJsonMetadata } from '../../model/contracts.js';
import { FlowError } from '../../errors.js';
/** Reject active objects before passive validation; declarations never carry executable code. */
export function readDeclarations(value: unknown): readonly DecisionDeclaration[] {
  try {
    const declarations = readArray(value, 'INVALID_ARGUMENT', 32).map(item => {
      const fields = readRecord(item, 'INVALID_ARGUMENT');
      return { ...fields, outcomes: readArray(fields.outcomes, 'INVALID_ARGUMENT', 5), facts: readArray(fields.facts, 'INVALID_ARGUMENT', 16) };
    });
    checkDeclarations(declarations);
    return snapshotJsonMetadata(declarations) as unknown as readonly DecisionDeclaration[];
  } catch { throw new FlowError('INVALID_ARGUMENT'); }
}
