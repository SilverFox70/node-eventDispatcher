# Ordinary function nodes

S09B exports defineFunction, FunctionSpec and FunctionContext. Write a typed handler instead of a stream loop. The adapter creates the same S05 component, S06 graph and S08/S09A runtime process; it has no timer, retry loop or scheduler of its own.

Each admitted packet invokes one ctx.task operation. The configured node policy owns any permitted retry attempts. The adapter awaits final handler settlement, validates output with the authoritative runtime validator, derives one child packet and awaits send before reading the next input. Invalid input reaches no handler; invalid output reaches no downstream effect and does not trigger a handler retry.

## Run a function graph

After npm run build, save this as try-function.cjs beside package.json, then run node try-function.cjs:

```js
const { z } = require('zod');
const f = require('./dist/cjs');
const numeric = f.contract('number@1', z.number());
const double = f.defineFunction({
  id: 'double', version: 1, title: 'Double', description: 'Function example',
  input: numeric, output: numeric,
  handler: async value => value * 2,
});
const graph = f.createGraph();
const handle = graph.add('double', double, { taskTimeoutMs: 1000 });
graph.exposeInput('in', handle, 'in'); graph.exposeOutput('out', handle, 'out');
const compiled = f.compileGraph(graph.toSpec(), { 'double@1': double });
if (!compiled.ok) throw new Error(JSON.stringify(compiled.issues));
const run = f.startNetwork(compiled.graph, { timeoutMs: 2000 });
(async () => {
  const collected = (async () => {
    const values = [];
    for await (const result of run.outputs.out) values.push(result.value);
    return values;
  })();
  for (const value of [1, 2, 3]) await run.send('in', f.packet(value, { jobId: 'demo' }));
  const terminal = await run.finish();
  console.log(await collected); // [2, 4, 6]
  console.log(terminal); // { status: 'completed' }
})().catch(error => { console.error(error); process.exitCode = 1; });
```

Those durations are demo configuration, not production recommendations. Use application/provider budgets. Installed projects import the package name instead of ./dist/cjs. A handler that does not need context can omit its second parameter.

## Handler context and identity

handler(value, context) returns a value or Promise; it never names downstream nodes. Context is frozen and contains scoped signal,1-based attempt, fresh attemptId and packet (immutable version/packetId/jobId/parentPacketIds/optional key, without value). There is no context.key alias. Input JSON values are frozen; the input value is already the handler's first argument.

Pass context.signal into application I/O. Context signal closes with the attempt, so determine success from the returned outcome rather than its later aborted state. Derivation happens once after final success: new packetId, original job/key and immediate parent=input.packetId. Retry attempts keep the same input metadata and receive distinct signals/attempt IDs; duplicate input delivery remains rejected by the original execution ledger.

TypeScript infers input/output payload types from invariant contracts and rejects wrong sync/async handler returns, unknown ports and handlers too narrow for an input union. Broader compatible handlers are allowed. JavaScript callers receive the same runtime validation. Undefined/class/function/non-JSON results refuse OUTPUT_CONTRACT before derivation; safe code/path details retain run/node/port/component/contract attribution. No rejected values/messages are copied into diagnostics.

## Deadlines, retries and business outcomes

Bind taskTimeoutMs/retry at graph.add, not in FunctionSpec. [Node-operation policy](node-operations.md) still owns0-default/explicit1–5 retries, safe eligibility, settlement-before-retry and whole-flow precedence. Local timeout is fatal NODE_TIMEOUT/nodeId by default; run timeout remains TIMEOUT. Unexpected handler throw fails COMPONENT_FAILED without hidden retry. Output validation is outside the operation, so invalid results never cause another service invocation.

Expected business outcomes should be ordinary data in a declared output union, such as {kind:'unavailable'}, returned before expiry. For explicit timeout-as-data routing or multiple named ports use an advanced defineComponent with ctx.task and catch outside it; no undeclared timeout port or onTimeout hook is invented here.

Keep handlers stateless with immutable injected dependency interfaces. Captured mutable state is not cloned per run. Run-local mutable process state belongs in defineComponent.create. S13 retains the full human/agent cookbook, templates and dependency/testing recipes; S10 can now reuse this adapter for mapping and the same task owner for predicates. Runtime inspection/Next/browser/durable profiles remain separate.
