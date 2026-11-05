# Correlated diagnostic records

S21 adds bounded, metadata-only observations to every run. They explain actual transfers and operation/attempt outcomes without collecting application values or exception messages. This is in-memory evidence, not a durable job ledger or a complete history.

```ts
const run = startNetwork(compiled, { diagnostics: { limit: 128 } });
const stop = run.onDiagnostics(() => publish(run.diagnostics()));
publish(run.diagnostics()); // Subscribe before sampling; own the disposer.
// Feed and consume the run normally.
await run.done;
const final = run.diagnostics();
stop();
```

Omit diagnostics options for limit128; permitted integers1–1024. The snapshot has version1, runId, total, dropped and immutable events. Sequence starts1 and never resets. Newest records are retained; dropped counts evicted records. Retaining/copying a snapshot can retain those observations longer than the run's current window, so applications own their copies and subscribers.

Existing `snapshot().diagnostics` and its diagnosticLimit option remain the original lifecycle/validation view. Existing EX1 trace/onTrace/clearTrace remains separate, including opt-in payload capture. Clearing EX1 does not reset correlated diagnostics or duplicate-execution protection. S22 adds the optional selective capture policy below; S23 adds explicit bounded sinks/export below.

## What gets recorded

- input-admitted: an ingress send actually commits, with exposed input and destination node/port.
- received: a validated packet is actually delivered to a component's input iterator.
- sent: validated output enters its channel or direct handoff, not merely a parked send attempt.
- operation-started/finished: one task call and its observed outcome.
- attempt-started/finished: distinct attempt ID/count, duration and safe outcome/code; retries share operation identity.
- process-error: factory/process failure outside an already-recorded task failure.
- run-terminal: the authoritative final result, after active owned operation cancellation.

Metadata contains packet/job identities and immediate parents where applicable, never value. Errors use known runtime categories or COMPONENT_FAILED; no arbitrary exception message/stack or application error.code is copied. A timed-out/cancelled operation can still have noncooperative underlying I/O; these records cannot prove physical termination or remote rollback. Late settlement does not change the observed outcome or append success after terminal.

## Packet attribution

Ordinary defineFunction/map/filter nodes automatically bind their actual input packet. Advanced processes can explicitly bind1–256 same-job packets:

```ts
for await (const input of ctx.inputs.in) {
  const result = await ctx.task(() => service(input.value), { inputs: [input] });
  // Validate/derive/send through the normal process APIs outside the task.
}
```

Only exact packet objects delivered to this node/run are accepted. Copies, roots not delivered here, another node/run, duplicates and mixed jobs refuse INVALID_ARGUMENT before handler entry. The registry is weak: no retained global payload history. Omitting the options keeps the existing task(handler) behavior and records inputs=[], explicitly node-scoped; the runtime never guesses the latest packet. Output contract validation still occurs at its existing boundary, which can follow a successful task and produce a separate process-error.

## Browser model and observation lifecycle

`event-driven-design/model` exports DiagnosticRecord/DiagnosticSnapshot types and validateDiagnostics. Validate detached/transported snapshots before displaying them. The validator enforces strict versions/fields, safe identities/codes, sequence/bounds and packet metadata; it does not evaluate business payloads or certify algorithm correctness.

Observers are bounded to64 independent subscriptions, coalesced into microtasks, and have idempotent disposers. Synchronous exceptions detach the observer without changing the business operation; callback results are not awaited, matching existing onTrace behavior. Applications own asynchronous transport handling and authorization. No default external logging/network traffic is introduced. Active S22 sessions own one unref expiry timer, cleared on disposal or terminal.

The Next inspector's existing EX1 view is unchanged in S21. Per-node controls and richer causal explanations have their own subsequent slices. Unknown/evicted evidence is not reconstructible from immediate-parent IDs alone.

[DG1 contract](../cursor_plans/fbp-extensions/contracts/diagnostics-v1.md) and [S21 receipt](../cursor_plans/fbp-extensions/S21-execution.md) own accepted behavior and proof. No graph editing, global lookup or recovery API is enabled by these records.

## Selective live capture (S22)

Trusted host code opts in when starting the run. All five policy fields are required. Missing policy denies capture even when a caller opens a session. The host must authorize any remote request before invoking this API; client catalog data grants no authority.

```ts
const run = startNetwork(compiled, {
  capturePolicy: {
    allowedNodes: ['stats'], denyInputs: [], denyOutputs: ['stats'],
    maxPayloadBytes: 2048, maxSessionMs: 60_000,
  },
});
const session = run.openDiagnosticsSession({
  rules: [{ nodeId: 'stats', inputs: true, outputs: false,
    ports: ['in'], jobIds: ['job-A'] }],
  expiresInMs: 30_000,
});
const stop = session.subscribe(() => render(session.snapshot()));
// Changing rules is prospective; expiry is never extended.
session.update({ expectedEpoch: session.snapshot().epoch, rules: [] });
stop();
session.dispose();
```

Only actual input admission, input dequeue and accepted output can capture values. A packet already accepted can be captured at a later transfer if the current rule selects it. Prior records are never retroactively enriched. Rules OR their directions; host allowlist/denies take precedence. Port names match the actual transfer direction; missing selectors match all ports/jobs, empty arrays match none. Unknown fields/nodes/ports, duplicate selectors or equivalent duplicate rules refuse INVALID_ARGUMENT before a policy change. Maximum32 rules and256 job selectors total.

One active session is allowed per run (SESSION_ACTIVE otherwise). Snapshot includes sessionId, epoch, status, expiresAtMs, requested rules, effectiveRules and the current epoch's captured events. expiresAtMs uses the host's monotonic performance.now clock; remote clients should use status and server-provided duration rather than interpret it as a wall-clock date. Updates require the current epoch (CAPTURE_CONFLICT when stale); closed sessions refuse update/subscribe with SESSION_CLOSED. Subscribe again after update: old epoch callbacks are retired. Dispose is idempotent. Expiry and terminal release the timer/listeners, and opening after terminal refuses RUN_TERMINATED. Control APIs do not restart or retry business work.

Each captured transfer carries captureSessionId/captureEpoch and either `{state:'captured',value,bytes}` or `{state:'truncated',preview,bytes}`. Bytes is the original JSON.stringify UTF-8 length using the existing JSON packet property order. Maximum host ceiling2048 bytes; preview contains a complete Unicode prefix within the ceiling and may not parse as JSON. Session duration maximum15minutes. There is one shared diagnostic ring, so eviction can remove session evidence; it never weakens duplicate-execution protection. Previously retained snapshots remain readable after disable/expiry; hosts own downstream retention and access.

The existing EX1 payload option remains separately host-controlled and unchanged. The session API adds no remote endpoint or inspector toggle. S23 sinks below consume the existing recorder; S24 owns inspector controls. [S22 proof receipt](../cursor_plans/fbp-extensions/S22-execution.md).

## Bounded sinks and JSONL export (S23)

```ts
const sink = attachDiagnosticsSink(run, {
  async write(batch, signal) {
    // Host-owned adapter; honor signal and handle its own transport authorization.
    await saveDiagnosticBatch(batch, signal);
  },
});
// Feed and consume business work normally; diagnostics never gate run.done.
await run.done;
const drained = await sink.flush({ timeoutMs: 1000 });
const status = sink.snapshot(); // Inspect drops/errors even when drained.complete is true.
await sink.dispose();
const jsonl = exportDiagnostics(run.diagnostics()); // Payloads omitted by default.
```

No sink is installed automatically. Supply a plain object containing only an own write function; wrap existing service/class adapters in that function. write receives a frozen version1 DiagnosticBatch, at most32 events, run identity, captureMode and cumulative loss counters. Only real future observations enter the sink; attaching never replays earlier work. Explicit export serializes the currently retained snapshot into newline-terminated batches. Default captureMode omitted removes capture values and attribution. `{includeCaptures:true}` exports only existing host-authorized captures; it grants no new capture permission. `/model.validateDiagnosticBatch` validates transported envelopes and original increasing sequences, including gaps. Never add counters from successive batches: each is cumulative.

Options default to recordLimit128, byteLimit262144, batchSize32, includeCaptures:false. Legal maxima are1024 records,1048576 bytes and32 events/batch. Record/UTF-8 event-line byte limits count pending plus in-flight together; bookkeeping/envelope overhead is separately bounded. Oversize/overflow drops newest; status reports exact droppedRecords/droppedBytes without evicting runtime admission protection. JSONL sourceRecords marks older observations already lost from the source ring; their byte size is unknown. A sink's dropped counters cover observations it refused/abandoned while attached; a disabled/detached sink does not claim to count future unobserved work.

Only one write is in flight. Rejection, throw or a non-Promise return disables/detaches delivery and increments sinkErrors, dropping its batch and queued records. It never changes the business outcome or requests retries. flush requires a1–60000ms deadline, with at most64 waiters. Complete means the active controller became idle, not that no records were lost. A busy source can extend flushing to the deadline. Timeout returns false without pretending to stop physical I/O.

Dispose detaches, aborts the supplied signal and returns without awaiting a noncooperative write. Check pendingWrites; late settlement only releases that bounded in-flight resource (and counts rejection), never resumes delivery. Repeated disposal is harmless. Explicit replacement is allowed only after disabled/disposed and pendingWrites0; otherwise SINK_ACTIVE prevents accumulating unresolved writes. Hosts own adapter lifetime, asynchronous/global side effects and access to retained snapshots. No built-in filesystem/network adapter or durable logging guarantee is included.

[S23 receipt](../cursor_plans/fbp-extensions/S23-execution.md) records verification and review status. S24 adds installed demo controls using these APIs.

Runnable offline sink/export example: `node examples/08-diagnostics.cjs` after building. It executes the same runtime and prints payload-omitting JSONL; [example index](../../examples/README.md).
