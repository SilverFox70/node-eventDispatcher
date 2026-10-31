import type { Packet } from '../../packet.js';
import { FlowError } from '../../errors.js';

/** Run-local group payloads and bounded completion markers; reservation precedes output effects. */
export class JoinGroups {
  private readonly pending = new Map<string, Map<string, Packet>>();
  private readonly completed = new Set<string>();
  constructor(private readonly names: readonly string[], private readonly maxKeys: number, private readonly historyLimit: number) {}

  accept(name: string, packet: Packet): readonly Packet[] | undefined {
    if (packet.key === undefined) throw new FlowError('INVALID_PACKET');
    const key = JSON.stringify([packet.jobId, packet.key]);
    if (this.completed.has(key)) throw new FlowError('JOIN_GROUP_COMPLETED');
    const group = this.pending.get(key);
    if (group?.has(name)) throw new FlowError('DUPLICATE_KEY');
    if (!group && this.pending.size === this.maxKeys) throw new FlowError('JOIN_CAPACITY');
    if (group?.size === this.names.length - 1) {
      if (this.completed.size === this.historyLimit) throw new FlowError('JOIN_HISTORY_CAPACITY');
      const parents = this.names.map(port => port === name ? packet : group.get(port)!);
      this.completed.add(key);
      this.pending.delete(key);
      return parents;
    }
    const partial = group ?? new Map<string, Packet>();
    partial.set(name, packet);
    this.pending.set(key, partial);
    return undefined;
  }

  finish(): void {
    if (this.pending.size) throw new FlowError('JOIN_INCOMPLETE');
  }

  clear(): void {
    this.pending.clear();
    this.completed.clear();
  }
}
