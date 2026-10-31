# Streaming graph execution

S08 exports startNetwork(compiledGraph, options?), NetworkRun, Terminal, Snapshot and RuntimeValidationError from the package root. It runs the real S06 compiled graph using the S04 bounded channels. Each start has a fresh UUIDv4 runId, controller, channels, component processes and duplicate-protection ledger. Factories run in deferred independent microtasks after the handle exists; there is no topological batch executor or per-packet factory recreation.

## Run a useful pipeline

Save this block as try-runtime.cjs beside package.json, then run npm run build followed by node try-runtime.cjs:

```js
const { z } = require('zod');
const { contract, defineComponent, createGraph, compileGraph,
  startNetwork, packet, derivePacket } = require('./dist/cjs');
const number = contract('number@1', z.number());
function transform(id, fn) {
  return defineComponent({
    id, version: 1, title: id, description: 'Streaming example',
    in: { in: number }, out: { out: number },
    create: () => async ctx => {
      for await (const input of ctx.inputs.in) {
        await ctx.send('out', derivePacket(fn(input.value), [input]));
      }
    },
  });
}
(async () => {
  const double = transform('double', value => value * 2);
  const plus = transform('plus', value => value + 1);
  const builder = createGraph();
  const first = builder.add('double', double), second = builder.add('plus', plus);
  builder.connect(first, 'out', second, 'in', 1);
  builder.exposeInput('in', first, 'in'); builder.exposeOutput('out', second, 'out');
  const compiled = compileGraph(builder.toSpec(), { 'double@1': double, 'plus@1': plus });
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.issues));
  const run = startNetwork(compiled.graph);
  const collected = (async () => {
    const values = [];
    for await (const result of run.outputs.out) values.push(result.value);
    return values;
  })();
  for (const value of [1, 2, 3]) await run.send('in', packet(value, { jobId: 'demo' }));
  const terminal = await run.finish();
  console.log(await collected); // [3, 5, 7]
  console.log(terminal); // { status: 'completed' }
})().catch(error => { console.error(error); process.exitCode = 1; });
```

The collector starts before the feeder and keeps consuming until EOF. Waiting for completion before starting output consumption can deliberately stall a bounded graph. In an installed project use the package name instead of ./dist/cjs.

## Run contract

- send(name, packet) resolves when admitted, not when downstream effects finish. Unknown names reject UNKNOWN_PORT; invalid envelopes reject INVALID_PACKET; wrong payload schemas reject INPUT_CONTRACT. These external refusals leave a live run usable. Validation/copy preserves packet/job/parent identities and freezes the admitted value.
- closeInput(name) prevents new sends and drains accepted/previously parked work before EOF; repeated close is harmless. Unknown name throws UNKNOWN_PORT. finish() closes all ingress and returns the same done promise on every call.
- Completion requires closed ingress, normal process returns after reading EOF on every input, and every exposed output consumed to EOF. Processes await sends and close outputs on normal completion. Incomplete input consumption fails INPUT_ABANDONED; returning with a parked output send fails UNAWAITED_SEND.
- Input iterator cleanup records that EOF was not reached; abandonment is decided on normal process return. If the loop body throws, preserve its actual failure rather than replacing it during iterator cleanup. Returning an external output iterator early fails the live run immediately.
- cancel() or parent AbortSignal produces cancelled/CANCELLED, aborts owned channel waits and suppresses future sends. Pre-abort calls no factory. Failure/cancel does not wait for uncooperative user promises. Late outcomes cannot replace the first terminal result; ignored owned waits have rejection observers. User code must pass ctx.signal to its own I/O and stop its effects cooperatively.
- Factory/process exceptions yield failed/COMPONENT_FAILED with nodeId; specific runtime refusals retain their code. Output envelope/schema validation precedes delivery. done resolves once with completed/cancelled/failed; it never rejects. Earlier outputs/effects are not rolled back and no work is retried automatically.

## Bounded duplicate protection and options

S08 adopts IC1-r2's proposed settings for this slice. executionRecordLimit defaults to65536, integer1–1048576. Each first delivery to a node reserves one (nodeId,packetId) record synchronously before enqueue/handoff, including a parked send. One packet traversing two nodes consumes two records. Across any inputs of the same node/run, a repeated ID refuses DUPLICATE_PACKET before capacity is checked; a new record above the limit refuses EXECUTION_CAPACITY. No live-run eviction; processed/failed work does not release slots. Protection records contain IDs, not retained payloads, and are cleared after terminal gates disable delivery.

External refusal leaves the run usable; an uncaught refusal inside a process fails it. Distinct nodes and runs may receive the same identity; intentional new work requires a fresh packet identity. This is in-memory protection, not restart-safe deduplication or external-effect exactly-once execution. Long streams may require an explicit larger limit or a future durable/retention profile. Boundary outputs have no destination node and do not reserve another execution record.

Options are signal, executionRecordLimit and diagnosticLimit (default100, integer0–1000). Invalid/unknown options fail INVALID_ARGUMENT before factories. S09 now adds timeoutMs and verifies cleanup/diagnostics; see [the lifecycle guide](lifecycle.md). No background host, persistence, retry engine or result lookup is provided here.

## Backend verdicts and safe inspection

RuntimeValidationError.validation and diagnostic validation details use the actual S05 validator: runId, nodeId, port/direction, componentId/version, contractId, representationId and code/path issues. Reports are immutable and bounded to16 issues,64 path segments,128 code units per string segment and64 per code; truncated is explicit. No rejected value, raw validator message, stack or dependency is copied into a snapshot.

A run is privately associated with its exact immutable S06 definition. runId identifies that association; component versions and versioned contract IDs identify the evaluated node contract. This does not invent a durable graph release ID. A future transport must bind its application-owned graph revision and request identity to this run; UI consumers must display only current responses and map codes to trusted messages. Snapshot diagnostics are bounded historical events, not an assertion that an earlier rejection is the current input state. A successful later send does not erase history. No HTTP/UI report endpoint is implemented here.

snapshot() is frozen detached metadata: runId/status, node states, channel counters and bounded sequenced diagnostics. Channels follow graph order with IDs edge:INDEX/input:NAME/output:NAME. It exposes no packet history or payload lookup and does not poll. Scope registration/rendering remain S12/S18; no global run registry is introduced.
