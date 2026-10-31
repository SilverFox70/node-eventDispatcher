import { createChannel } from '../channel.js';
import type { Packet } from '../packet.js';
import type { Diagnostic, Snapshot, Terminal, ValidationReport } from '../runtime.js';
export type Channel = ReturnType<typeof createChannel<Packet>>;
export type NodeState = { id: string; status: Snapshot['nodes'][number]['status'] };

/** One terminal owner; every observer sees the same immutable terminal result. */
export function createRunState(runId: string, nodes: NodeState[], channels: Map<string, Channel>, limit: number,
  clearLedger: () => void, signal?: AbortSignal) {
  const controller = new globalThis.AbortController();
  let terminal: Terminal | undefined;
  let draining = false, sequence = 0;
  const diagnostics: Diagnostic[] = [];
  let resolve!: (value: Terminal) => void;
  const done = new Promise<Terminal>(settle => { resolve = settle; });
  function record(code: string, nodeId?: string, validation?: ValidationReport): void {
    sequence++;
    if (limit === 0) return;
    diagnostics.push(Object.freeze({ sequence, code, ...(nodeId === undefined ? {} : { nodeId }),
      ...(validation === undefined ? {} : { validation }) }));
    if (diagnostics.length > limit) diagnostics.shift();
  }
  function end(result: Terminal): void {
    if (terminal) return;
    terminal = Object.freeze(result);
    signal?.removeEventListener('abort', cancel);
    if (result.status !== 'completed') {
      for (const channel of channels.values()) channel.abort();
      for (const node of nodes) if (node.status === 'running') {
        node.status = result.status === 'failed' && result.nodeId === node.id ? 'failed' : 'cancelled';
      }
      controller.abort();
    }
    clearLedger();
    record(result.status === 'completed' ? 'COMPLETED' : result.code,
      result.status === 'failed' ? result.nodeId : undefined);
    resolve(terminal);
  }
  function cancel(): void { end({ status: 'cancelled', code: 'CANCELLED' }); }
  const state = {
    controller, done, record, end, cancel,
    live: () => terminal === undefined,
    drain: () => { draining = true; },
    snapshot(): Snapshot {
      return Object.freeze({ runId, status: terminal?.status ?? (draining ? 'draining' : 'running'),
        nodes: Object.freeze(nodes.map(node => Object.freeze({ ...node }))),
        channels: Object.freeze([...channels].map(([id, channel]) => {
          const { queued, capacity, pendingSend, sent, received, discarded } = channel.stats();
          return Object.freeze({ id, queued, capacity, pendingSend, sent, received, discarded });
        })), diagnostics: Object.freeze([...diagnostics]),
      });
    },
  };
  record('RUN_STARTED');
  if (signal?.aborted) cancel();
  else signal?.addEventListener('abort', cancel, { once: true });
  return state;
}
export type RunState = ReturnType<typeof createRunState>;
