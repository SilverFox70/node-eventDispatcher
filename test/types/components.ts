import { map, filter, broadcast, merge, contract, packet, defineComponent } from 'event-driven-design';
import { z } from 'zod';
const number = contract('component-number@1', z.number());
const text = contract('component-text@1', z.string());
const double = map(number, number, (value, context) => { const id: string = context.packet.jobId; void id; return value * 2; });
const stringify = map(number, text, async value => String(value));
const even = filter(number, async value => value % 2 === 0);
const fork = broadcast(number, ['profile', 'billing']);
const fanIn = merge(number, ['left', 'right']);
void [double, stringify, even, fanIn.in.left, fork.out.billing];
// @ts-expect-error The callback cannot widen the output contract.
map(number, number, () => 'wrong');
// @ts-expect-error The callback must accept numeric input.
map(number, number, (value: string) => value.length);
// @ts-expect-error Predicates must return boolean.
filter(number, () => 1);
// @ts-expect-error Predicates must accept every allowed input.
filter(number, (value: string) => value.length > 0);
// @ts-expect-error Exact broadcast output names survive inference.
void fork.out.missing;
// @ts-expect-error Exact merge input names survive inference.
void fanIn.in.missing;
const named = defineComponent({ ...double, id: 'double' });
void named;
void fork.create()({ inputs: { in: { async *[Symbol.asyncIterator]() { yield packet(1); } } }, signal: new AbortController().signal,
  task: async handler => handler({ signal: new AbortController().signal, attempt: 1, attemptId: 'test' }),
  send: async (port, p) => { const n: number = p.value; void [port, n]; } });
