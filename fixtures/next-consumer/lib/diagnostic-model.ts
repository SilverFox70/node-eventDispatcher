import { validateDiagnostics } from 'event-driven-design/model';
import type { DiagnosticSnapshot, InspectionSnapshot } from 'event-driven-design/model';
export type NodeCapture = { nodeId: string; inputs: boolean; outputs: boolean };
export type DiagnosticView = { version: 1; token: string; sourceId: string; runId: string; records: DiagnosticSnapshot;
  session: { sessionId: string; epoch: number; status: 'active' | 'expired' | 'disposed' | 'terminated'; remainingMs: number; effectiveRules: NodeCapture[] };
  busy: boolean; submitted: number; completed: number };
export type DiagnosticAction = { action: 'capture' | 'load' | 'export'; token: string; sourceId: string; runId: string;
  sessionId: string; expectedEpoch: number; nodeId?: string; inputs?: boolean; outputs?: boolean; includeCaptures?: boolean };
const uuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
function exact(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length ||
    !keys.every(key => Object.hasOwn(value, key))) throw Error('Invalid diagnostic view');
}
/** Admit passive host state against the selected graph; never evaluate payload contracts in the browser. */
export function readDiagnosticView(value: unknown, inspection: InspectionSnapshot): DiagnosticView {
  exact(value, ['version', 'token', 'sourceId', 'runId', 'records', 'session', 'busy', 'submitted', 'completed']);
  const source = inspection.sources.find(source => source.id === value.sourceId && source.kind === 'graph');
  if (value.version !== 1 || !uuid(value.token) || !source || source.kind !== 'graph' || source.run?.runId !== value.runId ||
    !validateDiagnostics(value.records).ok || (value.records as DiagnosticSnapshot).runId !== value.runId || typeof value.busy !== 'boolean' ||
    !Number.isSafeInteger(value.submitted) || (value.submitted as number) < 0 || (value.submitted as number) > 30 ||
    !Number.isSafeInteger(value.completed) || (value.completed as number) < 0 || (value.completed as number) > (value.submitted as number)) throw Error('Invalid diagnostic association');
  const session = value.session;
  exact(session, ['sessionId', 'epoch', 'status', 'remainingMs', 'effectiveRules']);
  if (!uuid(session.sessionId) || !Number.isSafeInteger(session.epoch) || (session.epoch as number) < 1 ||
    !['active', 'expired', 'disposed', 'terminated'].includes(session.status as string) ||
    !Number.isSafeInteger(session.remainingMs) || (session.remainingMs as number) < 0 || (session.remainingMs as number) > 60000 ||
    !Array.isArray(session.effectiveRules) || session.effectiveRules.length > 32) throw Error('Invalid capture state');
  const ids = new Set<string>();
  for (const rule of session.effectiveRules) {
    exact(rule, ['nodeId', 'inputs', 'outputs']);
    if (typeof rule.nodeId !== 'string' || !source.spec.nodes.some(node => node.id === rule.nodeId) || ids.has(rule.nodeId) ||
      typeof rule.inputs !== 'boolean' || typeof rule.outputs !== 'boolean') throw Error('Invalid node policy');
    ids.add(rule.nodeId);
  }
  return value as DiagnosticView;
}
/** An older response must not undo a newer policy or replace later observations. */
export function latestDiagnosticView(current: DiagnosticView | null, next: DiagnosticView): DiagnosticView {
  if (!current || current.token !== next.token) return next;
  if (next.session.epoch < current.session.epoch || (next.session.epoch === current.session.epoch &&
    (next.records.total < current.records.total || next.submitted < current.submitted || next.completed < current.completed))) return current;
  return next;
}
