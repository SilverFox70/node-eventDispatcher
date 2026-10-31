import type { Component } from '../component.js';
import { defineComponent } from '../component.js';
import type { Contract } from '../contracts.js';
import type { Json, Packet } from '../packet.js';
import { namedPorts } from './shared/named-ports.js';

type Read<T> = { result?: IteratorResult<Packet<T>>; failed: boolean; error?: unknown };

/** One outstanding read per input; ready ties use declaration order, with no global FIFO. */
export function merge<T extends Json, const N extends readonly string[]>(input: Contract<T>, names: N) {
  const captured = namedPorts(input, names);
  const inputs: Readonly<Record<string, Contract<T>>> = captured.ports;
  const order = captured.order;
  return defineComponent({
    id: 'merge', version: 1, title: 'Merge', description: 'Bounded readiness-ordered fan-in', in: inputs, out: { out: input },
    create: () => async ctx => {
      const iterators = order.map(name => ctx.inputs[name]![Symbol.asyncIterator]());
      const reads = new Map<number, Read<T>>();
      const ready: number[] = [];
      const batch: number[] = [];
      let wake: (() => void) | undefined;
      function settled(index: number): void {
        batch.push(index);
        if (batch.length !== 1) return;
        queueMicrotask(() => {
          ready.push(...batch.sort((a, b) => a - b));
          batch.length = 0;
          wake?.();
        });
      }
      function read(index: number): void {
        const state: Read<T> = { failed: false };
        void iterators[index]!.next().then(
          result => { state.result = result; settled(index); },
          error => { state.failed = true; state.error = error; settled(index); }
        );
        reads.set(index, state);
      }
      for (let index = 0; index < iterators.length; index++) read(index);
      while (reads.size) {
        if (!ready.length) await new Promise<void>(resolve => { wake = resolve; });
        wake = undefined;
        const index = ready.shift()!;
        const state = reads.get(index)!;
        if (state.failed) throw state.error;
        const result = state.result!;
        reads.delete(index);
        if (!result.done) { await ctx.send('out', result.value); read(index); }
      }
    }
  // namedPorts proves all captured ports carry T; restore the literal names after homogeneous internal iteration.
  }) as unknown as Component<{ readonly [K in N[number]]: Contract<T> }, { out: Contract<T> }>;
}
