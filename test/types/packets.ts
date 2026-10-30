import { packet, derivePacket } from 'event-driven-design';
import { admitPacket } from '../../dist/cjs/packet.js';
import type { Packet } from 'event-driven-design';
import { createChannel } from '../../dist/cjs/channel.js';

const root = packet({ count: 1 }, { jobId: 'job-42', key: 'item' });
const admitted: Packet<{ count: number }> = admitPacket(root);
const child: Packet<number> = derivePacket(2, [root]);
void [admitted, child];
const internal = createChannel<Packet<Date>>(1);
const rich: Packet<Date> = { ...root, value: new Date() };
void internal.send(rich);
// @ts-expect-error Initial public payloads must be JSON-compatible.
packet(new Date());
// @ts-expect-error Function values are not JSON.
packet({ action: () => {} });
// @ts-expect-error Job IDs must be strings.
packet(1, { jobId: 42 });
// @ts-expect-error Derivation cannot change job identity.
derivePacket(2, [root], { jobId: 'other' });
// @ts-expect-error Parent metadata is immutable.
root.parentPacketIds.push('new');
// @ts-expect-error Packet identity is immutable.
root.packetId = 'new';
