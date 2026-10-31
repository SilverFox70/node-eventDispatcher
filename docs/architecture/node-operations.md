# Node-operation deadlines and explicit retries

S09A adds operation-scoped policy to the existing runtime. A raw stream node marks active function/service work with ctx.task; idle input waits and downstream sends belong outside that callback. S09B [makes this automatic for ordinary function nodes](function-nodes.md). A policy cannot infer arbitrary JavaScript call boundaries.

## Author and configure an operation

```js
const value = await ctx.task(async ({ signal, attempt, attemptId }) => {
  return lookup(input.value, { signal });
});
await ctx.send('out', derivePacket(value, [input]));
```

Bind policy when adding the node:

```js
graph.add('lookup', lookupNode, {
  taskTimeoutMs: operationBudget,
  retry: {
    maxRetries: 2,
    codes: ['TEMPORARY'],
    delayMs: retryDelay,
    idempotent: true,
  },
});
```

Durations are application-supplied milliseconds, not recommended universal values. Policy is saved in the same immutable GraphSpec and validated in browser metadata/server compilation. Missing taskTimeoutMs means no local clock; missing retry means zero retries. Raw nodes must actually call ctx.task for this policy to apply. No process-lifetime or inactivity detector is implied.

## Two clocks and one flow ceiling

A configured per-operation timeout, retry delay or cancellation-settlement window cannot exceed a configured whole-flow timeout; startNetwork rejects INVALID_TIMEOUT_POLICY before factories/timers/effects. Equality is valid. The flow clock is never reset or enlarged. When earlier work leaves less time than an operation requests, the remaining flow budget wins with TIMEOUT. A local expiry while the flow still has time rejects NodeTimeoutError (code NODE_TIMEOUT, nodeId, timeoutMs); an uncaught local error fails that node/run.

Advanced nodes can catch NodeTimeoutError outside the callback and send an explicitly contracted failure packet. Whole-flow termination leaves no budget for routing another packet in that run. First settlement and deadline ties prioritize the existing run ceiling; monotonic checks also reject a handler result that arrives after its budget before the timer callback is delivered.

## Retry means additional attempts, not additional packet delivery

maxRetries is an integer1–5: at most2–6 total handler calls. Eligible failures are a declared list of1–16 unique uppercase codes, read from an error's own data property without invoking code getters or proxy traps. Framework packet/validation/terminal/TASK_* refusals are ineligible; NODE_TIMEOUT is selectable. Nonmatching failures and missing policy never retry.

Each eligible failure uses the configured fixed delayMs (nonnegative safe integer); there is no hidden exponential/jitter/default timing. Each new attempt has its own AbortSignal,1-based attempt and UUIDv4 attemptId. The signal is aborted when the attempt settles to close its lifetime; the returned outcome, not later signal state, determines success. Packet/job/parent identities are unchanged. Only the scoped handler repeats: input delivery, node factory, derivation and downstream send do not repeat automatically. A provider idempotency key should remain stable across attempts; the fresh attemptId is not an automatic provider deduplication key.

One node policy applies to all its ctx.task calls; split nodes when operations need different safety/eligibility policies.

idempotent:true is the application's explicit acknowledgement that retrying is safe, not proof that the provider is idempotent. Imported/client-authored graph policies still need application authorization. A provider can accept a request before its response times out; eligibility must account for that uncertainty. No rollback, reconciliation or durable retry store is created.

## Cancellation settlement and bounded concurrency

At most one unsettled handler exists per node. Concurrent/nested task calls reject TASK_ACTIVE rather than enter a queue. A timeout revokes the attempt and aborts its signal. An uncooperative attempt keeps the node's busy slot until it settles, even if the outer process catches the timeout and routes a failure.

To allow retry after local timeout, explicitly include NODE_TIMEOUT and optionally set retry.settleTimeoutMs: the maximum additional wait for cancellation settlement. It is a nonnegative safe integer, default0 (do not wait). If the old handler settles within that window, the configured retry delay precedes the next attempt. If not, the original NODE_TIMEOUT is returned and no overlapping retry starts. A positive window therefore trades some response time for a chance to retry safely; the whole-flow deadline/cancellation still interrupts it immediately. This is separate from the attempt's work budget and does not accept its late result.

Callback code returns values and uses its scoped signal for external I/O. It cannot read stream inputs, send packets, finish/close/cancel its owning run, or start another task through a captured context while inside the active operation (TASK_IO_ACCESS/TASK_ACTIVE). Async descendants retaining an expired/completed lease receive TASK_TERMINATED before queue/ledger effects. Catching the task promise resumes the outer stream scope, where deliberate error routing is allowed. Arbitrary external callbacks/application side effects are not sandboxed; do not deliberately pass raw stream capabilities into unmanaged callbacks.

Processes must await ctx.task. Returning with an active operation fails UNAWAITED_TASK rather than falsely completing. Timers, retry waits and cleanup registrations are bounded and released on settlement/termination; late handler rejections remain observed. Snapshots may contain bounded NODE_TIMEOUT/TASK_RETRY events (retry scheduled, not a confirmed provider call), never attempt/packet histories or payload lookup. Existing execution-ledger duplicate protection is unchanged.

## Run a local example

After npm run build, save this as try-node-operation.cjs beside package.json and run node try-node-operation.cjs:

```js
const f = require('./dist/cjs');
let calls = 0;
const node = f.defineComponent({
  id: 'lookup', version: 1, title: 'Lookup', description: 'Explicit retry example',
  in: {}, out: { out: f.jsonContract },
  create: () => async ctx => {
    const result = await ctx.task(({ attempt }) => {
      calls++;
      if (attempt === 1) throw new f.FlowError('TEMPORARY');
      return { found: true };
    });
    await ctx.send('out', f.packet(result));
  },
});
const graph = f.createGraph();
const handle = graph.add('lookup', node, {
  retry: { maxRetries: 1, codes: ['TEMPORARY'], delayMs: 0, idempotent: true },
});
graph.exposeOutput('out', handle, 'out');
const compiled = f.compileGraph(graph.toSpec(), { 'lookup@1': node });
if (!compiled.ok) throw new Error(JSON.stringify(compiled.issues));
const run = f.startNetwork(compiled.graph);
(async () => {
  for await (const result of run.outputs.out) console.log(result.value);
  console.log(await run.done, { calls });
})().catch(error => { console.error(error); process.exitCode = 1; });
```

Expected: one {found:true} packet, completed terminal and calls:2. This demo retries a pure illustrative operation; configure real service budgets, safe failure codes and idempotency from actual application/provider behavior.
