import { metadataRecord, snapshotJsonMetadata } from '../contracts.js';
import { FlowError } from '../../errors.js';
export type RetryPolicy = Readonly<{
  maxRetries: number; codes: readonly string[]; delayMs: number; idempotent: true; settleTimeoutMs?: number;
}>;
export type TaskPolicy = Readonly<{ taskTimeoutMs?: number; retry?: RetryPolicy }>;
const reserved = new Set(['COMPONENT_FAILED', 'TIMEOUT', 'RUN_TERMINATED', 'INVALID_ARGUMENT', 'INVALID_PACKET', 'INPUT_CONTRACT',
  'OUTPUT_CONTRACT', 'UNAWAITED_TASK', 'UNKNOWN_PORT', 'CONCURRENT_SEND', 'CONCURRENT_READ', 'DUPLICATE_PACKET',
  'EXECUTION_CAPACITY', 'CHANNEL_CLOSED', 'INPUT_ABANDONED', 'UNAWAITED_SEND', 'INVALID_TIMEOUT_POLICY',
  'INVALID_GRAPH', 'INVALID_CATALOG', 'UNKNOWN_COMPONENT', 'DUPLICATE_ID', 'PORT_CARDINALITY',
  'CONTRACT_MISMATCH', 'CONTRACT_ID_CONFLICT', 'INVALID_CAPACITY', 'GRAPH_LIMIT', 'CYCLE',
  'UNSUPPORTED_REPRESENTATION', 'UNSUPPORTED_SCHEMA', 'INVALID_EXAMPLE', 'INVALID_LINEAGE',
  'JOB_MISMATCH', 'CORRELATION_MISMATCH', 'DUPLICATE_KEY', 'JOIN_GROUP_COMPLETED', 'JOIN_CAPACITY',
  'JOIN_HISTORY_CAPACITY', 'JOIN_INCOMPLETE']);
const duration = (value: unknown, minimum: number): boolean => Number.isSafeInteger(value) && (value as number) >= minimum;

/** Serializable execution policy; never executable predicates or implicit retry defaults. */
export function readTaskPolicy(value: unknown): TaskPolicy {
  try {
    const snapshot = snapshotJsonMetadata(value);
    const fields = metadataRecord(snapshot);
    if (Object.keys(fields).some(key => !['taskTimeoutMs', 'retry'].includes(key))) throw Error();
    if (Object.hasOwn(fields, 'taskTimeoutMs') && !duration(fields.taskTimeoutMs, 1)) throw Error();
    if (Object.hasOwn(fields, 'retry')) {
      const retry = metadataRecord(fields.retry);
      if (Object.keys(retry).some(key => !['maxRetries', 'codes', 'delayMs', 'idempotent', 'settleTimeoutMs'].includes(key)) ||
        !duration(retry.maxRetries, 1) || (retry.maxRetries as number) > 5 || retry.idempotent !== true ||
        !duration(retry.delayMs, 0) || !Array.isArray(retry.codes) || retry.codes.length < 1 || retry.codes.length > 16 ||
        new Set(retry.codes).size !== retry.codes.length || retry.codes.some(code =>
          typeof code !== 'string' || !/^[A-Z][A-Z0-9_]{0,63}$/.test(code) || reserved.has(code) || code.startsWith('TASK_')) ||
        (Object.hasOwn(retry, 'settleTimeoutMs') && !duration(retry.settleTimeoutMs, 0))) throw Error();
    }
    return snapshot as TaskPolicy;
  } catch { throw new FlowError('INVALID_TIMEOUT_POLICY'); }
}
