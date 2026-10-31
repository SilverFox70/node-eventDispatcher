import type { ValidationReport } from 'event-driven-design/model';

/** Only backend-authored, bounded runtime details cross this local demo boundary. */
export type DemoReply = Readonly<
  { status: 'completed'; value: number } |
  { code: 'INVALID_INPUT' | 'TIMEOUT' | 'FLOW_FAILED' | 'CANCELLED'; validation?: ValidationReport }
>;
export type DemoResult = Readonly<{ reply: DemoReply; requestId: string; graphRevision: string; runId: string }>;
