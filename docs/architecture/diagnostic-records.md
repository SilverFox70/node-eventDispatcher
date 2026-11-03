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

Existing `snapshot().diagnostics` and its diagnosticLimit option remain the original lifecycle/validation view. Existing EX1 trace/onTrace/clearTrace remains separate, including opt-in payload capture. Clearing EX1 does not reset correlated diagnostics or duplicate-execution protection. Per-node payload capture/session policy and sinks remain later work.

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

Observers are bounded to64 independent subscriptions, coalesced into microtasks, and have idempotent disposers. Synchronous exceptions detach the observer without changing the business operation; callback results are not awaited, matching existing onTrace behavior. Applications own asynchronous transport handling and authorization. No default external logging/network traffic or background diagnostic timer is introduced.

The Next inspector's existing EX1 view is unchanged in S21. Per-node controls and richer causal explanations have their own subsequent slices. Unknown/evicted evidence is not reconstructible from immediate-parent IDs alone.

[DG1 contract](../cursor_plans/fbp-extensions/contracts/diagnostics-v1.md) and [S21 receipt](../cursor_plans/fbp-extensions/S21-execution.md) own accepted behavior and proof. No graph editing, data capture policy, global lookup or recovery API is enabled by these records.
