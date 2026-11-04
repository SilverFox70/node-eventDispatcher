# S20 diagnostic contract DG1-r1

Status: DG1 S21 subset adopted through actual S20 merge and explicit S21 execution,2026-11-03. S21 merged in PR33. Explicit S22 execution on2026-11-04 adopts the S22.A declaration refinement below (DG1-r2); S23 remains a future proposal. Canonical for S21–S24; supersedes their earlier illustrative envelopes. Existing EX1 and Snapshot/Diagnostic shapes remain unchanged. [S20 handoff](../S20-execution.md).

## Activation, ownership and errors

S21 adds a metadata-only stream to each NetworkRun: `diagnostics(): DiagnosticSnapshot` and `onDiagnostics(listener:()=>void):()=>void`. StartOptions adds `diagnostics?: {limit?:number}`. Omission means limit128; legal limit1–1024. Existing `diagnosticLimit` controls only the existing lifecycle ring, including its valid0 setting. No option in S21 enables payloads; S22 owns that policy. The new stream captures safe error metadata by default while the run object lives; it is not persistent or automatically transmitted.

Snapshot `{version:1,runId,total,dropped,events}`; total counts all emitted records, dropped=total−events.length, ring keeps newest limit records. Sequence starts1 and never reuses IDs. Time is finite nonnegative monotonic milliseconds since this run began. No clear/reset API; dispose subscriptions idempotently and preserve terminal snapshot. Notifications use existing owned change primitive, isolate listener failures and never alter business execution. No default external sink/network/logging console output.

`DiagnosticRecord = Base & Variant`, with Base `{version:1,runId,sequence,timeMs}`. No sourceId in core; inspection source registration is a separate `(sourceId,runId)` association and cannot conflate runs. Unknown keys/versions refuse in the browser model validator as `{ok:false,issues:[{code:'INVALID_DIAGNOSTIC',path:'$'}]}`. Node IDs/ports obey existing128-character names. Packet metadata retains current validated UUID/job/key/parent bounds. No payload, raw exception message/stack, function source or arbitrary error.code in S21 records.

## Exact variants

| kind | Required fields beyond Base | Optional fields / absence semantics |
| --- | --- | --- |
| input-admitted | inputName, nodeId, port, packet:PacketMetadata | None; accepted graph ingress identifies ancestry roots |
| received | nodeId, port, packet:PacketMetadata | None; actual component dequeue only |
| sent | nodeId, port, packet:PacketMetadata | None; validated accepted component output only |
| operation-started | nodeId, operationId, inputs:PacketMetadata[] | inputs=[] means explicitly node-scoped, not unknown guessed packet |
| attempt-started | nodeId, operationId, attemptId, attempt, inputs | attempt is1-based, generated before handler entry |
| attempt-finished | nodeId, operationId, attemptId, attempt, outcome:'succeeded'/'failed'/'timed-out'/'cancelled' | code required except succeeded; durationMs finite≥0 |
| operation-finished | nodeId, operationId, outcome:'succeeded'/'failed'/'cancelled' | code required except succeeded; durationMs finite≥0 |
| process-error | nodeId, code | Error outside an active task; no fabricated packet/attempt attribution |
| run-terminal | status:'completed'/'cancelled'/'failed' | code required unless completed; nodeId only if actual runtime terminal has it |

An error outcome's code is the actual known runtime allowlisted category (`NODE_TIMEOUT`, `OUTPUT_CONTRACT`, etc.) or `COMPONENT_FAILED` for unrecognized application exceptions. Never copy a free-form string error.code into diagnostic output. Validation details remain in the existing separately safe ValidationReport; S21 does not duplicate payload-bearing error objects. No second process-error for the same task failure; runtime process handling points to its already-emitted operation outcome.

Every started attempt has exactly one observed finish (including cancellation/timeout), and each operation one finish. Late actual handler settlement cannot overwrite the observed outcome or create success after timeout. Underlying noncooperative I/O may remain active; the record does not claim physical termination. Task retry keeps one operationId and distinct attemptId/count. A process-error can occur with no preceding operation. Zero-input processes may be node-scoped.

## Correct correlation

Backward-compatible ProcessContext.task overload: `task(handler, options?: {inputs: readonly Packet[]})`. Existing task(handler) remains legal and node-scoped. Explicit inputs1–256 must be exact immutable packet objects actually dequeued by this node in this run, recognized through a per-context weak delivery registry; all inputs have the same job. Reject malformed options, unknown/other-node/other-run objects, duplicates or mixed jobs as existing `INVALID_ARGUMENT` before operation start/handler entry. No value copy in the record; snapshot PacketMetadata only. No global payload index or strong packet-history store.

The function/map/filter adapters supply known input packet(s) to this overload. Join's internal step supplies its actual same-job parents only where it uses a task. Composite operations expose all parents; no arbitrary first parent or most-recent-input shortcut. Built-ins and advanced callers that deliberately omit input binding are displayed as node-scoped. FunctionContext.packet remains unchanged. This overload is about trusted causal binding, not new task execution/retry semantics.

Emit input-admitted only after successful ingress acceptance; invalid ingress is not admitted. Emit sent at existing accepted channel send and received on actual node dequeue. Filter false has no sent record. Internal route from=null/to=node is ingress, not node output; to=null received is output-consumer dequeue, not a node input. Existing EX1 still observes its original transfers independently. Avoid counting runtime intent/queue parking as completed delivery.

## S22 capture/session contract

Only sent/received/input-admitted may add optional `capture`. `capture={state:'captured',value:Json,bytes:number}` or `{state:'truncated',preview:string,bytes:number}`. bytes is original canonical JSON UTF-8 byte length; preview is a valid UTF-8 prefix≤2048bytes, not claimed parseable JSON. Metadata-only records omit capture. Oversize capture is explicit; no arbitrary object serializers. EX1 keeps its original oversize/omitted vocabulary.

Session factory lives on trusted run: `openDiagnosticsSession({rules,expiresInMs})`, returning `snapshot(), update({expectedEpoch,rules}), subscribe(listener), dispose()`. Rules `{nodeId,ports?:string[],jobIds?:string[],inputs:boolean,outputs:boolean}`; missing selectors mean all that node’s ports/jobs. Node/port selectors must exist; duplicates refuse. Matching rules OR enabled directions, then host deny/ceilings override. Graph ingress uses destination input policy. Host service authorizes opening/updating sessions; no unauthenticated remote capability is granted by this API.

Host policy is supplied at start with `capturePolicy:{allowedNodes,denyInputs,denyOutputs,maxPayloadBytes,maxSessionMs}`; absent policy denies all capture, preserving metadata-only default. Exact validated policy names/port direction matching fixture required in S22.A before implementation. Unknown configuration refuses atomically. Max32 rules/256 job selectors, max15minutes, prospective capture only. Explicit requested duration1..host max; replacement/update increments epoch, stale expected epoch returns CAPTURE_CONFLICT. Client transport uses session ID+epoch; old messages cannot mutate a newer session. Capture update never restarts a run.

S22 owns exact session/policy declaration fixtures under this selected behavior; no changes to baseline S21 API needed for payloads. Sessions share one bounded retained payload store per run; no multiplication of memory by opening sessions. Only one active capture session per run, new open refuses SESSION_ACTIVE until dispose/expiry; metadata readers can be many and owned by subscribers.

## S23 sink contract

Sink interface `{write(batch,signal):Promise<void>}`; controller `flush({timeoutMs}):Promise<{complete:boolean}>` and `dispose():Promise<void>`. Defaults128 queued records/256KiB/one in-flight batch, plus at most one in-flight bounded batch. Count both pending and in-flight bytes toward memory ceiling; truncate/reject oversized queued records under capture policy. Max batch32 records; overflow drops newest and increments visible record/byte loss counters out-of-band, never evicts admission-ledger entries.

write rejection disables sink, drops failed batch/pending queue and increments sinkErrors/dropped counters; replacement explicit. No automatic retries or business outcome change. Flush deadline does not claim unresolved third-party write stopped. Dispose aborts signal and drops pending delivery; returns without indefinitely awaiting noncooperative write and reports pending-write count in controller status. Callback closure stores no unbounded later batches. Diagnostic integrity gaps remain visible.

## Producer/consumer proof

S21 owns model validation/export, one task/attempt producer, function/builtin input bindings, runtime input/output producer, metadata defaults and secret-safe failure normalization. S22 policy/session, S23 sinks and S24 Next UI consume it. Required S21 paths extend its earlier allowlist to `src/component.ts`, `src/function.ts`, `src/components/**` binding-only, `src/runtime/task-attempt.ts`, `src/runtime/ports.ts`, `src/runtime.ts`, model/public barrels and existing test/type fixtures. No later capture/sink/editor implementation in S21.

Canonical proofs X21.1–X21.3 now include same-job multiparent, legacy node-scope, cross-run binding refusal, two-job attribution, retry/cancel/late-settlement and existing EX1 coexistence. Tests may share fixtures; no dummy test is required for every table cell if a real integration assertion already proves it.

## S22.A declaration freeze — 2026-11-04

Explicit S22 execution adopts the session behavior above with these exact refinements (DG1-r2):
- `StartOptions.capturePolicy` requires all five fields. `allowedNodes`, `denyInputs`, `denyOutputs` are unique arrays of existing node IDs; denies cover the named node's entire direction. Empty allowlist denies all. Limits are integer1–2048 bytes and1–900000 ms. Policy is copied/frozen before factories execute.
- Rule ports are unique existing names in the union of that node's input/output ports; a selected port matches only the event's actual direction/name. Job selectors use existing job-ID bounds. Maximum256 job selectors across all32 rules. Empty selector arrays match nothing. Unknown keys/accessors/duplicates refuse `INVALID_ARGUMENT` atomically.
- Session snapshot is `{sessionId,epoch,status,expiresAtMs,rules,effectiveRules,events}`. Status active/expired/disposed/terminated; absolute expiry uses monotonic performance.now milliseconds. Effective rules preserve selectors and AND requested directions with host allow/deny. Epoch starts1; successful update increments it, without extending expiry. Closed update/subscribe refuses `SESSION_CLOSED`; active stale update refuses `CAPTURE_CONFLICT`.
- Captured transfer records additionally require paired `captureSessionId` UUID and positive integer `captureEpoch`. Session events are the current epoch's records in the single run ring. Global diagnostics retain old epochs until ordinary eviction; existing caller-held snapshots cannot be revoked. No separate history/store exists.
- Session subscriptions are guarded by the epoch at subscription time; updates retire old callbacks. Dispose, expiry and run termination suppress queued callbacks, release listeners and expiry timer. Dispose is idempotent. An already accepted packet is assessed when each actual transfer occurs, using the then-current policy; pending operation ownership does not grant retrospective capture.
- Snapshot/update check expiry synchronously, so a delayed timer cannot extend permission. Opening after terminal refuses `RUN_TERMINATED`; opening while another session is active refuses `SESSION_ACTIVE`. Missing host policy still permits a metadata-only session, with both effective directions false.
- UTF-8 JSON bytes use the existing immutable JSON packet representation and JSON.stringify property order, without hooks. Truncated preview is the longest complete Unicode prefix fitting the host byte ceiling; original byte count is retained. Session ID/epoch accompany truncation too. No payload appears on error/operation/terminal records.

These are implementation fixture choices within S22's owned declaration gate, not S23 transport/sink or S24 UI functionality. Root/model type exports are necessary public declaration plumbing within the existing package; no package/build configuration change.
