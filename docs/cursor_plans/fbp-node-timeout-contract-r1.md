# Node-operation deadlines — shared contract NT1

Contract version:2. Revision:NT1-r1,2026-10-30. Status: blocked-on-decision for active-operation timing versus whole stream-process lifetime. User explicitly requested plans and implementation of node deadlines as the next roadmap work, with compatible flow/node budgets. The exact operation-scoping proposal below awaits the pending timing-boundary answer; no source implementation is released by this document.

Execution order: S09 → [S09A](fbp-slices/09a-node-task-deadlines-plan.md) → [S09B](fbp-slices/09b-function-task-deadlines-plan.md) → S10. Original S00–S19 IDs retain their meanings. S13 keeps recipes/templates and aggregate authoring proof; its minimal function adapter moves forward to S09B. These are two feature branches, not one unbounded timeout-and-authoring branch.

## Evidence and authority

User direction: whole-flow and node/function timeouts must cooperate; a configured flow timeout shorter than a configured node timeout is unacceptable. Current source: S09 branch33ae613 (PR16 open at inspection), actual origin/master185f303/S08. Runtime factories create one long-lived async stream process per node/run; they do not invoke a handler per packet. ProcessContext currently exposes inputs/send/signal only. GraphSpec has version1 nodes{id,component}, no timeout metadata; builder.add has two arguments; S13's defineFunction is planned, not delivered. S09's deadline helper provides monotonic/chunked timers and terminal cleanup.

Do not equate an arbitrary raw process's lifetime with one service call. Do not claim automatic function timing exists until S09B. Recheck S09 merge and source applicability before release. Current untracked .DS_Store/.feedback-log remain user/local artifacts.

## Proposed semantics and invariants

R1. Persist optional per-node taskTimeoutMs in GraphSpec and expose it through builder.add(id,component,{taskTimeoutMs?}). It is a positive safe integer; malformed explicit values fail INVALID_TIMEOUT_POLICY before effects. Missing means no local deadline, with whole-flow policy still applying. Component contract/catalog schemas remain application data contracts, not execution capabilities.

R2. startNetwork(specHandle,{timeoutMs?}) validates every configured node budget before factories/channels/timers. If both exist and any taskTimeoutMs > timeoutMs, throw FlowError(INVALID_TIMEOUT_POLICY); equality is valid. No automatic expansion of the flow budget. A budget need not be less than the sum of other budgets: branches can run in parallel and queues consume time.

R3. New ProcessContext.task<T>(handler:(context:TaskContext)=>T|PromiseLike<T>):Promise<T>, with TaskContext={readonly signal:AbortSignal}. A local deadline starts immediately before invoking this operation, not when its stream process starts. Idle input waits and sends outside the callback are excluded. Each operation in the same node uses its full configured local allowance, subject to the remaining whole-flow budget. The whole-flow clock never resets.

R4. Preserve S09 run TIMEOUT as the overall ceiling. Example: flow10s/node3s, task starts after8s → flow TIMEOUT after2s, not NODE_TIMEOUT. A local3s limit reached while the run still has time produces NodeTimeoutError(code=NODE_TIMEOUT,nodeId,timeoutMs). Whole-flow expiration wins exact deadline ties, checked using the common monotonic deadline owner even if timer callbacks are delivered in the opposite order. Flow termination rejects pending operations with RUN_TERMINATED and aborts their signals; it is never routed as a local timeout.

R5. Operation timeout rejects its wrapper promptly and aborts its local signal. The raw process may catch NodeTimeoutError outside the task and send a declared failure packet; no automatic failure output or retry is invented. An uncaught NODE_TIMEOUT fails the run with that nodeId. A function node in S09B has this fatal default; advanced nodes own explicit timeout-as-data ports. Business outcomes returned before expiry remain normal schema-validated data.

R6. At most one unsettled handler per node. A second or nested task fails TASK_ACTIVE immediately; no hidden promise queue. If an expired handler ignores cancellation and has not settled, that slot remains occupied: an explicit later task still fails TASK_ACTIVE. This prevents repeated timeouts accumulating unbounded zombie work. Routing a failure packet outside the expired task is allowed; starting replacement work requires the previous handler to settle or a separately governed new run. No claim that abort undoes external I/O.

R7. Use a private async operation lease (Node AsyncLocalStorage), owned by the existing runtime. Operation callbacks return values and use their scoped signal for service I/O. Reading stream inputs or sending packets from inside an active operation is refused TASK_IO_ACCESS; perform these around the task in the outer process. Work continuing from an expired/completed lease is refused TASK_TERMINATED before touching queues, reserving execution IDs or exposing input. A sibling node cannot consume another node's task lease. No process-global run inventory.

R8. Catching the wrapper's rejection resumes the outer process scope, so its explicit failure routing is permitted while the flow remains live. Async children retaining an expired lease cannot send/read/start tasks later, including after a caught timeout or successful task completion. Late resolution/rejection is observed, never wins a race or becomes an unhandled runtime rejection. Gates cannot prevent arbitrary application-owned external side effects; handlers must cooperate with AbortSignal/idempotency/reconciliation.

R9. Node/task timers and parent signal links are owned, bounded and cleared on success, handler rejection, local expiry, run cancellation/failure/completion. Reuse S09 monotonic/chunked scheduler; no second executor or detached polling. First terminal wins; reserve/retry/lineage rules from S08 remain intact. Snapshot may record bounded NODE_TIMEOUT/nodeId diagnostics but no task/packet histories, values or service objects. Existing snapshot status/counters/backend validation protocol is preserved.

R10. S09B adds the planned typed defineFunction API now, wrapping defineComponent. Every packet invokes its handler through ctx.task; handler signal is the operation signal and ctx.packet remains frozen metadata only. Validate/derive/send after successful handler settlement, outside its lease; schema failure is OUTPUT_CONTRACT, not an implicit task retry. No handler prefetch/reentry or next packet while handler work remains unsettled. Same runtime/compiler and packet factories only.

## Exact proposed interface delta

- GraphSpec.nodes member gains taskTimeoutMs?:number. Shape parser permits only this additional field; model validation adds INVALID_TIMEOUT_POLICY at $.nodes[INDEX].taskTimeoutMs. Browser/server validation stays identical.
- GraphBuilder.add<C>(id:string,component:C,options?:Readonly<{taskTimeoutMs?:number}>) retains exact NodeHandle<C['in'],C['out']>. Reject unknown options/accessors/explicit undefined values as INVALID_ARGUMENT; invalid supplied duration as INVALID_TIMEOUT_POLICY. toSpec remains detached/frozen.
- ProcessContext<I,O> gains task<T>(handler:(context:Readonly<{signal:AbortSignal}>)=>T|PromiseLike<T>):Promise<T>. Callback nonfunction → INVALID_ARGUMENT. Returned values remain ordinary in-process values; packet JSON rules apply only on actual send.
- Root exports TaskContext type and NodeTimeoutError for reliable classification. NodeTimeoutError contains only stable code, nodeId and configured timeoutMs; no rejected payload/history. Existing RuntimeValidationError unchanged.
- defineFunction<I extends Json,O extends Json>(spec:{id;version;title;description;input:Contract<I>;output:Contract<O>;handler(value:Readonly<I>,context:FunctionContext):O|Promise<O>}):Component<{in:Contract<I>},{out:Contract<O>}>. FunctionContext={signal:AbortSignal;packet:PacketMetadata}; no ctx.key or packet-value alias. Exact literal ports and wrong-return rejection required.
- No per-operation timeout override, automatic retry, dynamic deadline extension, node inactivity detector, timer resetting on progress, per-process lifetime cap, optional timeout ports, persistence or distributed cancellation in these slices.

## Producer/consumer and effect boundary

Builder/JSON → S06 model parsing → immutable compiled node configuration → start preflight budget comparison → existing run deadline owner → one per-node task owner → handler/service call → wrapper settles → outer process derives/validates/sends → same downstream admission ledger. S09A owns configuration/runtime integration; S09B owns automatic function adapter invocation. S10 map/filter must subsequently wrap callbacks with ctx.task; broadcast/merge are transport processes and do not invent active work timers around blocked sends. Raw components are explicitly responsible for scoping their operations; configuring a budget does not let the runtime infer arbitrary JavaScript call boundaries.

External effect owner remains the handler/application. Before configuration rejection:0 factories/service calls. After provider success but before wrapper receives acknowledgement: a deadline can leave an uncertain external effect; no replay/rollback. Crash loses in-memory task state and run state. F01 durability remains separate. Identity/CAS/domain-authority provenance is N/A: these are engine control boundaries, not account/database writes.

## Authoritative new condition ledger (NT1 only)

Existing C21–C25/C32/C35/C36/C58 remain referenced preservation/aggregate proofs; do not copy their assertions into competing ledgers. These rows own new deadline behavior:

| ID | Valid setup → order → exact assertion / forbidden effect | Owner / executable proof |
| --- | --- | --- |
| NT01 | JSON/builder task budget2000 → serialize/compile → field preserved and frozen; duration0/null/fraction/extra option → exact refusal before factory0 | S09A / test/node-task-policy.test.js::configuration parity |
| NT02 | flow1000/node2000 → start → INVALID_TIMEOUT_POLICY,0 factories/timers/service calls;1000/1000 succeeds; missing flow permits2000 | S09A / same::budget preflight |
| NT03 | flow10000/node3000; spend8000 before task starts → advance2000 → run TIMEOUT, operation RUN_TERMINATED, local signal aborted,0 late output; equal deadlines still flow cause | S09A / test/node-task-runtime.test.js::remaining flow ceiling |
| NT04 | node30 task hangs; flow100 → advance30 → catch NODE_TIMEOUT with correct nodeId/30, signal aborted; outer process sends exactly one declared failure packet and completes | S09A / same::explicit timeout routing |
| NT05 | same task uncaught timeout → run failed NODE_TIMEOUT/nodeId,0 extra handler/downstream calls; handler rejects before timeout → original COMPONENT_FAILED, no retry | S09A / same::fatal default |
| NT06 | wait for input50 and blocked send50 around a5ms task budget; task's actual1ms callback succeeds → neither idle wait nor backpressure consumes local allowance; flow budget remains running throughout | S09A / same::operation boundary |
| NT07 | active task → second/nested task → TASK_ACTIVE, handler2 calls0; expired unresolved task → replacement refused until original settles; distinct nodes/runs remain independent | S09A / same::bounded task ownership |
| NT08 | inside active task try read/send → TASK_IO_ACCESS before counters/ledger change; after timeout catch routes outside; release old child and try send/read/task → TASK_TERMINATED,0 late delivery | S09A / same::expired lease isolation |
| NT09 | success/reject/timeout/cancel/flow failure/completion → owned local timers/links0; late resolution/rejection cannot replace first outcome/unhandled rejection; long local budget uses S09 chunk bounds | S09A / same::resource cleanup |
| NT10 | model/compile diagnostics and root declarations from installed CJS/ESM tarball → same budget policy; wrong task callback/options/port/payload fail generated types; /model has no ALS/timers/handlers | S09A / package/type/model fixtures |
| NT11 | defineFunction numeric double, input2/job/key P → handler1, child4 with parentP/samejob/key; operation-scoped signal; input packets processed serially, no second handler while first waits | S09B / test/function-task.test.js::automatic operation scope |
| NT12 | configured function5 hangs in flow20 → NODE_TIMEOUT/nodeId, handler1/output0; provider rejection before5 → COMPONENT_FAILED; wrong output schema → OUTPUT_CONTRACT, no downstream effects | S09B / same::function outcome mapping |
| NT13 | numeric handler returns string → named tsc failure; JS wrong value reaches real OUTPUT_CONTRACT; packed CJS/ESM function succeeds and times out with real timers | S09B / declaration/packed fixtures |
| NT14 | caught expected business result before deadline derives/sends normal typed union data; timeout racing success yields one disposition, no retry/duplicate execution or metadata rewrite | S09B / same::first settlement and business data |

## Baseline, readiness and release

Existing baseline fbp-pre-modernization-r2 is historical characterization only. Reuse S09 build/type/lint/full-coverage receipts after actual merge for unchanged tooling; establish meaningful new runtime/type failures after interfaces exist. No DB/Next/browser/Figma claim. Required checks: npm run check; node --test test/node-task*.test.js (S09A) or test/function-task.test.js (S09B); npm run coverage with populated offline npm cache and localhost permissions for existing fixtures. Per-file statements/lines/branches≥95% and100% meaningful reachable conditions, unchanged denominator/exclusions.

G1 GAP: active-work versus process-lifetime timing awaits user answer; exact proposal otherwise given above. G2 PASS proposed ownership/order: S09→S09A→S09B→S10, with S13 recipe work retained. G3 PASS proposed fixtures NT01–14; no tests exist yet. G4 PASS in-memory effect policy: cancellation is cooperative, uncertain effects never replayed. G5 PASS subplan allowlists/tasks. G6 PASS current tooling, baseline and packed/model boundaries. G7 GAP until timing decision and S09 merge release the integration tasks. Two executors must preserve these exact outcomes; choosing a different start clock, late-send rule, concurrency policy or timeout routing is a contract amendment.

Pending user questions: Q1 merge S09 PR16 or explicitly authorize stacking; Q2 approve operation-scoped timing or request whole-process lifetime. No elapsed-time inference. S09A/S09B implementation remains blocked until the relevant answer; planning is authorized and saved now.
