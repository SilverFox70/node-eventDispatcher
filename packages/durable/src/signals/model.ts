import type { Json } from 'event-driven-design';

export const signalRetentionHours = 7 * 24;
export const pendingSignalsPerWorkspace = 1000;

export type SignalCommand = Readonly<{
  actorId: string; nodeId: string; generation: string; expectedRevision: number;
  signalName: string; commandKey: string; payload: Json;
}>;

export type SignalReceipt = Readonly<{
  generation: string; commandKey: string; state: 'pending' | 'consumed' | 'expired' | 'closed';
}>;

export type SignalAuthorization = (target: Readonly<{ workspaceId: string; runId: string }>,
  command: SignalCommand) => boolean | Promise<boolean>;
