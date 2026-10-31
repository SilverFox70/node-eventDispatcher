type Read<T> = { result?: IteratorResult<T>; failed: boolean; error?: unknown };

/** One read or ready value per input; same-microtask settlements tie in declaration order. */
export async function* readyInputs<T>(inputs: Readonly<Record<string, AsyncIterable<T>>>, order: readonly string[]): AsyncGenerator<{ name: string; value: T }> {
  const iterators = order.map(name => inputs[name]![Symbol.asyncIterator]());
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
    if (!result.done) {
      yield { name: order[index]!, value: result.value };
      read(index);
    }
  }
}
