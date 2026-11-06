import type { PacketMetadata } from '../../../packet.js';
import type { DiagnosticRecord } from '../index.js';
import type { CausalEvidence } from './evidence.js';

export type Transfer = Extract<DiagnosticRecord, { packet: PacketMetadata }>;
export const isTransfer = (event: DiagnosticRecord): event is Transfer => 'packet' in event;
export type LineageGap = 'missing-parent' | 'missing-admission' | 'cycle' | 'conflicting-packet' | 'limit';
export type PacketLink = Readonly<{ parent: string; child: string }>;

export function traceLineage(evidence: CausalEvidence, subject: Transfer, forward: boolean, limit: number) {
  const packets = new Map<string, PacketMetadata>();
  const children = new Map<string, Set<string>>();
  const admissions = new Set<string>();
  const conflicts = new Set<string>();
  const gaps = new Set<LineageGap>();
  for (const event of [...evidence.diagnostics.events, ...evidence.decisions.events]) {
    if ('kind' in event && event.kind === 'input-admitted') admissions.add(event.packet.packetId);
    const rows = 'packet' in event ? [event.packet] : 'inputs' in event ? event.inputs : [];
    for (const packet of rows) {
      if (packet.jobId !== subject.packet.jobId) continue;
      const previous = packets.get(packet.packetId);
      if (previous) {
        if (previous.jobId !== packet.jobId || previous.key !== packet.key ||
          previous.parentPacketIds.join() !== packet.parentPacketIds.join()) conflicts.add(packet.packetId);
        continue;
      }
      packets.set(packet.packetId, packet);
      for (const parent of packet.parentPacketIds) {
        if (!children.has(parent)) children.set(parent, new Set());
        children.get(parent)!.add(packet.packetId);
      }
    }
  }
  const ids = new Set<string>();
  const links: PacketLink[] = [];
  const linked = new Set<string>();
  type Frame = { id: string; next?: Iterator<string> };
  function walk(roots: readonly string[], descend: boolean) {
    const active = new Set<string>(), completed = new Set<string>();
    const stack: Frame[] = [];
    for (const root of roots) {
      stack.push({ id: root });
      while (stack.length) {
        const frame = stack.at(-1)!;
        if (!frame.next) {
          if (active.has(frame.id)) { gaps.add('cycle'); stack.pop(); continue; }
          if (completed.has(frame.id)) { stack.pop(); continue; }
          const packet = packets.get(frame.id)!;
          if (!ids.has(frame.id) && ids.size >= limit) { gaps.add('limit'); return; }
          if (conflicts.has(frame.id)) gaps.add('conflicting-packet');
          ids.add(frame.id); active.add(frame.id);
          if (!descend && !packet.parentPacketIds.length && !admissions.has(frame.id)) gaps.add('missing-admission');
          frame.next = (descend ? children.get(frame.id) ?? [] : packet.parentPacketIds)[Symbol.iterator]();
        }
        const next = frame.next.next();
        if (next.done) {
          completed.add(frame.id); active.delete(frame.id); stack.pop();
          continue;
        }
        if (!packets.has(next.value)) { gaps.add('missing-parent'); continue; }
        const link = descend ? { parent: frame.id, child: next.value } : { parent: next.value, child: frame.id };
        const key = link.parent + ':' + link.child;
        if (!linked.has(key)) {
          if (links.length >= limit) { gaps.add('limit'); return; }
          linked.add(key); links.push(link);
        }
        stack.push({ id: next.value });
      }
    }
  }
  walk([subject.packet.packetId], forward);
  const descendants = new Set(ids);
  if (forward) walk([...ids], false);
  return { ids, descendants, links, gaps };
}
