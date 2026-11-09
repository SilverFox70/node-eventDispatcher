import { FlowError } from 'event-driven-design';
import { checkScope } from '../steps/model.js';
import type { StepScope } from '../steps/model.js';

const timestamp = /^(?!0000)\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/;
export const stepCursor = (runId: string, time: string, stepId: string) =>
  Buffer.from(JSON.stringify([runId, time, stepId])).toString('base64url');

export function readProgressPage(scope: StepScope, after: string | undefined, limit = 50) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new FlowError('INVALID_PROGRESS_PAGE');
  if (after === undefined) return { limit, time: null, stepId: null };
  try {
    if (typeof after !== 'string' || !/^[\w-]{1,256}$/.test(after)) throw Error();
    const value: unknown = JSON.parse(Buffer.from(after, 'base64url').toString());
    if (!Array.isArray(value) || value.length !== 3) throw Error();
    const [runId, time, stepId] = value as [string, string, string];
    if (runId !== scope.runId || !timestamp.test(time) || Number.isNaN(Date.parse(time)) ||
        new Date(time).toISOString().slice(0, 23) !== time.slice(0, 23) ||
        stepCursor(runId, time, stepId) !== after) throw Error();
    checkScope(scope, stepId);
    return { limit, time, stepId };
  } catch { throw new FlowError('INVALID_PROGRESS_PAGE'); }
}
