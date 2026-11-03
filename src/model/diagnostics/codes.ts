/** Existing runtime failure categories; free-form application codes never enter diagnostic records. */
export const runtimeFailureCodes = new Set(['INVALID_PACKET', 'OUTPUT_CONTRACT', 'UNKNOWN_PORT', 'CONCURRENT_SEND',
  'CONCURRENT_READ', 'CHANNEL_CLOSED', 'RUN_TERMINATED', 'DUPLICATE_PACKET', 'EXECUTION_CAPACITY',
  'DUPLICATE_KEY', 'JOIN_CAPACITY', 'JOIN_INCOMPLETE', 'JOIN_GROUP_COMPLETED', 'JOIN_HISTORY_CAPACITY',
  'UNAWAITED_TASK', 'NODE_TIMEOUT', 'TASK_ACTIVE', 'TASK_IO_ACCESS', 'TASK_TERMINATED', 'INPUT_ABANDONED', 'UNAWAITED_SEND']);
export function isDiagnosticCode(value: unknown): value is string {
  return typeof value === 'string' && (runtimeFailureCodes.has(value) ||
    ['COMPONENT_FAILED', 'TIMEOUT', 'CANCELLED'].includes(value));
}
