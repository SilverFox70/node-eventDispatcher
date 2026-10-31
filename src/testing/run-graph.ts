import type { Packet } from '../packet.js';
import { getGraphDefinition } from '../graph.js';
import type { CompiledGraph } from '../graph.js';
import { FlowError } from '../errors.js';
import { readArray, readRecord } from '../packet/data.js';
import { startNetwork } from '../runtime.js';
import type { Terminal } from '../runtime.js';
import type { Snapshot } from '../model/inspection.js';

export type TestOptions = Readonly<{
  inputs: Readonly<Record<string, readonly Packet[]>>;
  timeoutMs?: number; maxOutputPackets?: number; signal?: AbortSignal;
}>;
export type TestResult<O = Readonly<Record<string, readonly Packet[]>>> = Readonly<{
  terminal: Terminal; outputs: O; snapshot: Snapshot;
}>;

/** Exercise the production runtime; ordering between different ingress streams is unspecified. */
export async function runGraph(graph: CompiledGraph, options: TestOptions): Promise<TestResult> {
  const definition = getGraphDefinition(graph);
  const fields = readRecord(options, 'INVALID_ARGUMENT');
  if (Object.keys(fields).some(key => !['inputs', 'timeoutMs', 'maxOutputPackets', 'signal'].includes(key))) {
    throw new FlowError('INVALID_ARGUMENT');
  }
  const timeoutMs = Object.hasOwn(fields, 'timeoutMs') ? fields.timeoutMs : 1000;
  const limit = Object.hasOwn(fields, 'maxOutputPackets') ? fields.maxOutputPackets : 1024;
  if (!Number.isSafeInteger(timeoutMs) || (timeoutMs as number) < 1 ||
    !Number.isSafeInteger(limit) || (limit as number) < 1 || (limit as number) > 100000 ||
    (Object.hasOwn(fields, 'signal') && !(fields.signal instanceof globalThis.AbortSignal))) {
    throw new FlowError('INVALID_ARGUMENT');
  }
  const inputs = readRecord(fields.inputs, 'INVALID_ARGUMENT');
  const streams = new Map<string, readonly Packet[]>();
  let total = 0;
  for (const [name, values] of Object.entries(inputs)) {
    if (!Object.hasOwn(definition.spec.inputs, name)) throw new FlowError('UNKNOWN_PORT');
    const packets = readArray(values, 'INVALID_ARGUMENT', 100000);
    total += packets.length;
    if (total > 100000) throw new FlowError('INVALID_ARGUMENT');
    streams.set(name, packets as Packet[]);
  }
  const run = startNetwork(graph, { timeoutMs: timeoutMs as number,
    ...(Object.hasOwn(fields, 'signal') ? { signal: fields.signal as AbortSignal } : {}) });
  const outputs: Record<string, Packet[]> = Object.fromEntries(Object.keys(run.outputs).map(name => [name, []]));
  let collected = 0;
  let refusal: { error: unknown } | undefined;
  const work: Promise<void>[] = [];
  function observe(promise: Promise<void>): void {
    work.push(promise.catch(error => {
      // Aborted channel waits reflect the runtime's terminal, not a second harness failure.
      if (error instanceof FlowError && error.code === 'RUN_TERMINATED') return;
      refusal ??= { error };
      run.cancel();
    }));
  }
  try {
    for (const [name, stream] of Object.entries(run.outputs)) {
      observe((async () => {
        for await (const packet of stream) {
          if (collected === limit) throw new FlowError('TEST_OUTPUT_LIMIT');
          collected++;
          outputs[name]!.push(packet);
        }
      })());
    }
    for (const name of Object.keys(definition.spec.inputs)) {
      const packets = streams.get(name) ?? [];
      observe((async () => {
        try {
          for (const packet of packets) await run.send(name, packet);
        } finally { run.closeInput(name); }
      })());
    }
    const [terminal] = await Promise.all([run.done, Promise.all(work)]);
    if (refusal) throw refusal.error;
    return Object.freeze({ terminal,
      outputs: Object.freeze(Object.fromEntries(Object.entries(outputs).map(([name, packets]) => [name, Object.freeze(packets)]))),
      snapshot: run.snapshot() });
  } finally {
    run.cancel();
    await Promise.allSettled(work);
    await run.done;
  }
}
