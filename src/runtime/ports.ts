import type { ComponentBase } from '../component.js';
import type { Packet } from '../packet.js';
import { admitPacket } from '../packet.js';
import { FlowError } from '../errors.js';
import { validateValue } from './validation.js';
import type { RunState, Channel } from './state.js';
export type Port = { channel: Channel; nodeId: string; port: string; component: ComponentBase };

/** Synchronous reservation protects queued and parked deliveries across all inputs of one node. */
export function createAdmission(runId: string, limit: number, ledger: Set<string>) {
  function send(target: Port, value: unknown, direction: 'input' | 'output', destination?: Port): Promise<void> {
    try {
      const stats = target.channel.stats();
      if (stats.closed) throw new FlowError('CHANNEL_CLOSED');
      if (stats.pendingSend) throw new FlowError('CONCURRENT_SEND');
      const packet = admitPacket(value);
      validateValue(packet, target.component[direction === 'input' ? 'in' : 'out'][target.port]!, {
        runId, nodeId: target.nodeId, port: target.port, component: target.component, direction,
      });
      const recipient = direction === 'input' ? target : destination;
      if (recipient) {
        const identity = JSON.stringify([recipient.nodeId, packet.packetId]);
        if (ledger.has(identity)) throw new FlowError('DUPLICATE_PACKET');
        if (ledger.size === limit) throw new FlowError('EXECUTION_CAPACITY');
        ledger.add(identity);
      }
      return target.channel.send(packet);
    } catch (error) { return Promise.reject(error); }
  }
  return { send };
}

export function inputIterator(channel: Channel, state: RunState, onEof: () => void, onAbandon?: () => void): AsyncIterableIterator<Packet> {
  let eof = false;
  async function read(): Promise<IteratorResult<Packet, undefined>> {
    if (eof) return { done: true, value: undefined };
    if (!state.live()) throw new FlowError('RUN_TERMINATED');
    const result = await channel.receive();
    if (!state.live()) throw new FlowError('RUN_TERMINATED');
    if (result.done) { eof = true; onEof(); }
    return result;
  }
  return {
    [Symbol.asyncIterator]() { return this; },
    next() {
      const result = read();
      void result.catch(() => {});
      return result;
    },
    async return() {
      if (!eof && state.live()) onAbandon?.();
      eof = true;
      return { done: true, value: undefined };
    },
  };
}
