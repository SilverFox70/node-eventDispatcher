# Deadlines, cleanup and diagnostic guarantees

S09 adds timeoutMs to the existing startNetwork options and verifies the same S08 orchestrator under adversarial lifecycle conditions. It accepts a positive safe integer in milliseconds; absent means no deadline. Explicit undefined/null, zero, fractions, nonfinite values and unknown options refuse INVALID_ARGUMENT before factories. No dependency, second scheduler or polling loop is introduced.

## Try a deadline

After npm run build, save this as try-deadline.cjs beside package.json and run node try-deadline.cjs:

```js
const { defineComponent, createGraph, compileGraph, startNetwork } = require('./dist/cjs');
const waiting = defineComponent({
  id: 'waiting', version: 1, title: 'Waiting', description: 'Deadline example',
  in: {}, out: {},
  create: () => async () => { await new Promise(() => {}); },
});
const builder = createGraph();
builder.add('waiting', waiting);
const compiled = compileGraph(builder.toSpec(), { 'waiting@1': waiting });
if (!compiled.ok) throw new Error(JSON.stringify(compiled.issues));
const run = startNetwork(compiled.graph, { timeoutMs: 25 });
run.done.then(console.log); // { status: 'failed', code: 'TIMEOUT' }
```

For the useful streaming example, add `{ timeoutMs: 1000 }` to its startNetwork call. Consume outputs concurrently as before. A deadline also covers waiting for output consumption; it does not turn backpressure into automatic buffering.

## Time and resource ownership

Deadlines use monotonic elapsed time. Large safe-integer durations are scheduled in chunks no larger than2147483647ms, avoiding Node's long-timer clamp. Only one deadline timer is active per run. Early wakeups schedule the remaining time; a delayed callback expires immediately if the elapsed deadline has passed. A cancelled stale callback cannot schedule another timer.

The first completed/cancelled/failed transition wins. Completion, failure, cancellation and timeout clear the deadline and remove the runtime's parent AbortSignal listener before settling done. Pre-aborted starts allocate no deadline and invoke no factory. Failure/timeout abort owned waits, discard queued packets, disable future sends and input exposure, and release execution protection only after those gates close. Repeated finish returns the same done promise; later cancellation or callbacks cannot replace terminal.

An uncooperative asynchronous promise does not delay terminal settlement. Its late resolution/rejection remains observed; it cannot send through the runtime or become an unhandled rejection of a runtime-owned promise. This does not stop arbitrary application code, undo external effects, or interrupt synchronous JavaScript blocking the event loop. Pass ctx.signal to application I/O and make application-owned resources stop cooperatively. The normal event-loop scheduling limits of Node timers still apply.

## Frozen snapshot contract

S09 retains S08's detached frozen Snapshot and bounded backend validation report, with exact counters/order tested. runId identifies the immutable executing definition; nodes/channels follow graph definition order. Channel IDs are edge:INDEX/input:NAME/output:NAME. Counters report admitted/received/discarded packets and current queue/parked-send state, never values or packet histories.

Status is running, draining, completed, failed or cancelled. finish marks even a source-only graph draining while output awaits consumption. A component failure marks its node failed, leaves completed nodes completed and marks interrupted siblings cancelled. A global timeout marks still-running nodes cancelled; TIMEOUT belongs to the run, without inventing one guilty node.

Diagnostics retain the most recent diagnosticLimit events (default100, integer0–1000), with monotonically increasing sequence numbers even when retention is zero. The baseline event set is RUN_STARTED, INPUT_CLOSED, PROCESS_COMPLETED, COMPLETED, CANCELLED and safe runtime failure/refusal codes. Late failures may add bounded events or evict an older terminal event; snapshot.status and done remain authoritative. Older snapshots never change. Actual backend validation details keep the S08 run/node/port/component/contract attribution and explicit bounds; historical rejection events are not a current-input verdict.

Completion still requires every declared input read to EOF, sends no longer parked, and exposed outputs consumed to EOF. Existing early-return, unawaited-send, original-error preservation and validation protections are reused; no duplicate runtime is built for diagnostics. Inspection registration, rendering, persistent recovery and result lookup remain later capabilities.
