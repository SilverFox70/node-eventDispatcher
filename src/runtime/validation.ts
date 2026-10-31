import { FlowError } from '../errors.js';
import { getContractIssues } from '../contracts.js';
import type { ComponentBase } from '../component.js';
import type { ContractBase, ContractIssue } from '../model/contracts.js';
import type { ValidationReport } from '../runtime.js';

/** Authoritative verdict with bounded safe details; never retain rejected values or messages. */
export class RuntimeValidationError extends FlowError {
  constructor(code: string, readonly validation: ValidationReport) { super(code); }
}
export function validateValue(value: unknown, contract: ContractBase, context: {
  runId: string; nodeId: string; port: string; direction: 'input' | 'output'; component: ComponentBase;
}): void {
  const issues = getContractIssues(contract, value);
  if (issues.length === 0) return;
  let truncated = issues.length > 16;
  const bounded: ContractIssue[] = issues.slice(0, 16).map(issue => {
    if (issue.path.length > 64 || issue.code.length > 64) truncated = true;
    const path = issue.path.slice(0, 64).map(part => {
      if (typeof part === 'string' && part.length > 128) { truncated = true; return part.slice(0, 128); }
      return part;
    });
    return Object.freeze({ code: issue.code.slice(0, 64), path: Object.freeze(path) });
  });
  throw new RuntimeValidationError(context.direction === 'input' ? 'INPUT_CONTRACT' : 'OUTPUT_CONTRACT', Object.freeze({
    runId: context.runId, nodeId: context.nodeId, port: context.port, direction: context.direction,
    componentId: context.component.id, componentVersion: context.component.version,
    contractId: contract.id, representationId: contract.representationId,
    issues: Object.freeze(bounded), truncated,
  }));
}
