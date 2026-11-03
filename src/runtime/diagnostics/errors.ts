import { isProxy } from 'node:util/types';
import { FlowError } from '../../errors.js';
import { isDiagnosticCode, runtimeFailureCodes } from '../../model/diagnostics/codes.js';
export { runtimeFailureCodes };
/** Inspect a data property only; arbitrary application codes/messages are never exported. */
export function diagnosticErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null || isProxy(error) || !(error instanceof FlowError)) return 'COMPONENT_FAILED';
  const code: unknown = Object.getOwnPropertyDescriptor(error, 'code')?.value;
  return isDiagnosticCode(code) ? code : 'COMPONENT_FAILED';
}
