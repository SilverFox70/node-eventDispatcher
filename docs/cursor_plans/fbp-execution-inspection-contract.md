# EX1 — Optional live execution inspection

User direction accepted2026-10-31; concrete implementation contract for [S18A](fbp-slices/18a-live-execution-inspector-plan.md). Existing inspection snapshots remain payload/history free. This explicit opt-in tracing surface is separate from createInspectionScope, packet admission and the non-evicting execution ledger.

## Runtime producer

`StartOptions.trace?: { limit?: number; payloads?: boolean }` enables a per-run trace. Omitted trace is disabled and does not serialize payloads or allocate a trace buffer. Trace options are data properties with only these keys; invalid shape/limit/boolean refuses INVALID_ARGUMENT before processes start. Default limit128, integer1–1024; payloads defaultsfalse. No retries, persistence or graph execution policy is changed.

`NetworkRun.trace(): ExecutionTraceSnapshot | null`, `onTrace(listener: () => void): () => void`, and `clearTrace(): void` expose bounded observation. Subscribe before initial sampling. Notifications use the same coalesced microtask/64-independent-observer/idempotent-disposer/synchronous-error-detachment semantics as S18 topology notifications. Invalid listeners refuse even when tracing is disabled; disabled valid subscriptions are no-ops. Callers own observer disposal. Completed run history remains bounded until explicitly cleared or its run is released; no global index/timer or packet lookup service is created.

Version1 snapshot: runId, total, dropped, payloads, events. Events: sequence, timeMs (monotonic elapsed observation time), kind sent/received, channelId, from/to endpoint or null, packetId/jobId/immediate parentPacketIds, payloadState omitted/captured/oversize, and optional payload. All are detached/frozen JSON. Sequence increases across clear; dropped = total minus retained events. A full ring evicts only trace records, never execution-protection entries. Clear releases retained payload/event references, retaining monotonic sequence and accurate omitted count.

Instrument the real generic channel commit points: sent when queued/handed off/parked sender committed, received when removed/handed off. Direct handoff records sent before received. Parked-but-not-committed, rejected and aborted-before-commit sends are not falsely reported as sent. Received denotes channel handoff, not successful business processing. Invalid packets, duplicate admission and wrong schemas produce no transfer record. The trace sink is synchronous and isolated; external observation cannot throw into channel delivery. Runtime route metadata maps edge:index/input:name/output:name to the captured graph endpoints.

Default records contain identities and metadata only. Explicit payloads=true copies admitted JSON only when its serialized UTF-8 size is<=2048 bytes; larger values are omitted with oversize state and are not retained. No raw rejected values or executable objects are captured. Hosts remain responsible for redaction/access control before transporting an application's opted-in trace. The demo contains only public invented sample data. No arbitrary user-supplied serializer/redactor or callback is executed as part of capture.

## Consumer, transport and demonstration

Browser-safe trace types/admission live under /model. Admission checks version/bounds/order/JSON/endpoint and payload policy; it does not evaluate application payload schemas. The Next SSE envelope adds execution alongside snapshot; existing scope snapshots are unchanged. Host subscribes to topology, trace and run completion. Frames coalesce to the latest bounded trace window; dropped counts make omitted history visible. Connection epochs/sequences and run association prevent obsolete/mismatched updates. Scope disposal cancels feeder/run, removes observers and timers, and releases trace data.

The graph uses explicit accountId→account→summary ports and distinct versioned contracts. A local asynchronous fake lookup and formatting node transform several invented account IDs, derive same-job child packets and produce actual results. Demo operation delays belong to sample services, not an artificial tracing delay. Useful cards show component title/purpose, port types, actual process state and authoritative channel counts. External input/output cards explain the destination/source and type. Hostile labels move to separate browser fixtures.

SVG highlights/packet markers and a bounded selectable timeline derive from actual sent/received events, with run/job/packet/parent identities and elapsed time. Old events are presented as retained observations, not proof that a node is executing now. No animation loop resubmits packets. Payload capture requires an explicit demo checkbox; changing it or restarting closes the old stream, clears the old view and creates a new local example. The read-only viewer is not a debugger that pauses business execution or a durable replay host.

## Manual demo address

`npm run demo:next` binds localhost:54545, prints that exact address; inspector path /inspector. `-- --port <1..65535>` explicitly overrides it. Invalid/unknown options fail before build. Occupied requested ports fail clearly with no silent fallback or terminating another process. Automated tests retain ephemeral loopback ports, and explicitly test localhost binding/collision/cleanup. No global host/network configuration changes.

## Proof ownership

C66–C73 in the master ledger belong to S18A. Core proof covers disabled mode, immutable ring/clear/overflow, direct/queued/parked transfer order, refusals, cancellation, observer isolation and quota, default privacy, explicit payload cap and JS/type validation. Production Next/browser proof covers meaningful transformations, real counters/trace correlation/markers, source selection, payload consent/reset, inert labels, reconnect/cancel/refusal and stable manual-address options. No dependency or threshold weakening is authorized.
