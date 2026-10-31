# Optional live packet inspection

S18A adds a bounded, opt-in trace to the existing runtime. The graphical inspector uses actual channel sends/receives, process status and channel counters. It does not run a second scheduler or infer packet traffic from animation.

```ts
const run = startNetwork(compiled, { trace: { limit: 128 } });
const stop = run.onTrace(() => publish(run.trace()));
publish(run.trace()); // Subscribe before the initial sample.
// Feed/consume using the ordinary run API.
stop();
run.clearTrace();
```

Without StartOptions.trace, trace() returns null, onTrace accepts/disposes a no-op subscription, and no trace buffer or payload serialization is created. Invalid trace options refuse before processes start. Limit defaults128 and accepts integers1–1024. Payloads defaultsfalse; explicit payloads:true captures admitted immutable JSON only when its serialized UTF-8 size is<=2048 bytes. Oversize values are omitted entirely. Hosts must decide access/redaction before transporting an opted-in application trace. The demo contains invented public data.

## Actual transfer semantics

A version1 ExecutionTraceSnapshot contains runId, total, dropped, payloads and events. Each event contains sequence, elapsed timeMs, sent/received kind, channelId, from/to node-port endpoints (null at the external boundary), packetId, jobId, immediate parentPacketIds and payloadState. Only captured events contain payload.

Sent means a packet entered the channel buffer or was handed to a waiting reader. A parked send records nothing until it commits. Received means channel handoff/removal, not successful application processing. Direct handoff records sent before received; queued and parked cases preserve their real ordering. Admission refusal, duplicate rejection and abort-before-commit do not invent transfers. Two observations normally describe each channel handoff.

Trace records use a bounded rolling window. Overwriting observations never evicts duplicate-execution protection entries. dropped reports total observations no longer retained, including an explicit clear. Sequence remains monotonic across clear. Snapshots/records/payload copies are detached and frozen; clearing releases the run's retained references but cannot revoke a snapshot an application already copied. History remains per-run until cleared or the owning run is released; there is no global lookup store or persistence.

onTrace coalesces change notification into microtasks, admits at most64 independent subscriptions and returns idempotent disposers. Invalid callbacks refuse, synchronous observer errors detach that observer, and observers cannot throw through channel delivery. Async callback results are not awaited. The same private observation primitive serves dispatcher topology notifications. Applications own removing observers; no background tracing timer is introduced.

## Browser and host boundaries

/model exports the immutable trace types and validateExecutionTrace, which admits bounded JSON/order/endpoint/payload metadata rather than evaluating application payload schemas. The Next host carries execution beside the existing snapshot in its SSE frame. createInspectionScope remains the original payload-free point-in-time sampler.

The browser checks metadata, current run association and graph channel membership; obsolete stream callbacks/sequences cannot overwrite current state. The stream retains at most one queued frame plus one latest pending frame. A dropped trace window is visible instead of pretending to be complete history. Disconnect/disposal removes observers/timers, aborts the demonstration's feeder and cancels its run.

The viewer shows component purpose/version, semantic port names/types, process state and authoritative sent/received counts. Packet markers are triggered by real sent observations, animate once and fade; reduced-motion users have the equivalent timeline. Selecting an observation shows full IDs and immediate lineage. Payload inspection needs explicit consent and is bounded. Changing capture or restarting closes the old stream and clears the old view before creating a fresh local example.

This is read-only observation, not pause/step execution, durable replay or graph editing. Reconnecting the demonstration creates new fake work; adapting it to a real application should observe that application's existing owned sources rather than resubmit business jobs. Optional durable execution and visual authoring remain separate roadmap work.

[EX1 contract](../cursor_plans/fbp-execution-inspection-contract.md) and [S18A receipt](../cursor_plans/fbp-slices/S18A-execution.md) record the exact scope/proofs. [Next guide](../nextjs.md) describes localhost:54545 and the runnable example.
