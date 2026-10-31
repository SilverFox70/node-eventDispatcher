# Stream components

S10 adds four component factories to the package root. They use the existing compiler, runtime, channels and packet admission; there is no second executor.

| Factory | Ports | Behavior |
| --- | --- | --- |
| `map(input, output, handler)` | `in` → `out` | Await one handler per packet, validate its result and derive a child. |
| `filter(contract, predicate)` | `in` → `out` | Await a boolean predicate; true forwards the original envelope, false intentionally consumes it. |
| `broadcast(contract, names)` | `in` → named outputs | Derive a distinct child for each output, awaiting sends in declaration order. |
| `merge(contract, names)` | named inputs → `out` | Forward original envelopes as inputs become ready; finish after all inputs reach EOF. |

Map/filter callbacks receive the same immutable attempt context and `context.packet` metadata as [ordinary function nodes](function-nodes.md). They inherit [operation deadlines and explicit retries](node-operations.md). No policy means no retries. A non-boolean JavaScript predicate result fails with OUTPUT_CONTRACT; a thrown callback fails the run unless an explicitly configured operation retry applies. Transport waits in broadcast/merge do not start operation timers; the overall flow budget still applies.

Every transformation preserves job/key correlation. Map/broadcast outputs have fresh packet IDs and one immediate parent; filter/merge preserve the original packet ID and parent list. Broadcast payloads are independently copied and deeply frozen. No accidental duplicate execution is enabled.

## Naming definitions

Factories return definitions with built-in IDs map/filter/broadcast/merge, each at version1. Reuse one definition across graph instances when it represents the same operation. For distinct operations of the same kind, give each definition an application-owned stable ID using the existing definition API:

```js
const double = defineComponent({
  ...map(numeric, numeric, value => value * 2),
  id: 'double',
  title: 'Double',
});
```

Register it as `double@1`. This keeps saved graph specifications tied to an explicit application registry; do not overwrite one registry entry with another handler. A graph node's instance ID and its component definition ID serve different purposes.

## Branching and ordering

Names must be at least two distinct nonempty strings, each at most128 characters. Lists are validated without executing getters and captured independently of subsequent caller mutation. Declaration order includes numeric-looking names, regardless of JavaScript object-key enumeration order.

Broadcast awaits every branch before reading another input. A full branch slows upstream work; delivery to an earlier branch can already have happened when a later branch fails or the run is cancelled. There is no rollback or automatic replay of those deliveries. Application side effects still require their own failure/idempotency design.

Merge retains at most one outstanding read or ready result per input, plus the current output send. Earlier readiness stays ahead while output is blocked. Reads settling in the same microtask batch are ties and use declaration order. Each input retains FIFO ordering; there is no global ordering guarantee across independent inputs. Pending reads settle through the owning runtime on cancellation/failure.

Merge emits separate packets. S11's planned keyed join will collate related branch results into one payload. To split a multifaceted object today, broadcast it explicitly, then use a differently typed map on each branch to extract the part that branch needs; each branch can perform asynchronous work.

## Runnable pipeline

After `npm run build`, save this as `try-components.cjs` in the repository root and run `node try-components.cjs`. In an installed application, replace `./dist/cjs` with `event-driven-design`.

```js
const { z } = require('zod');
const { contract, map, filter, broadcast, merge, createGraph,
  compileGraph, startNetwork, packet } = require('./dist/cjs');

const numeric = contract('demo-number@1', z.number());
const stages = [
  map(numeric, numeric, async value => value * 2),
  filter(numeric, value => value > 2),
  broadcast(numeric, ['left', 'right']),
  merge(numeric, ['left', 'right']),
];
const builder = createGraph();
const handles = stages.map((stage, i) => builder.add(`stage${i}`, stage));
builder.connect(handles[0], 'out', handles[1], 'in');
builder.connect(handles[1], 'out', handles[2], 'in');
for (const port of ['left', 'right']) {
  builder.connect(handles[2], port, handles[3], port);
}
builder.exposeInput('in', handles[0], 'in');
builder.exposeOutput('out', handles[3], 'out');
const registry = Object.fromEntries(stages.map(stage => [`${stage.id}@1`, stage]));
const compiled = compileGraph(builder.toSpec(), registry);
if (!compiled.ok) throw Error(JSON.stringify(compiled.issues));
const run = startNetwork(compiled.graph);

(async () => {
  const output = (async () => {
    const values = [];
    for await (const result of run.outputs.out) values.push(result.value);
    return values;
  })();
  await run.send('in', packet(1));
  await run.send('in', packet(2));
  console.log(await run.finish());
  console.log(await output);
})().catch(error => { console.error(error); process.exitCode = 1; });
```

This prints completed and `[4, 4]`: the filter drops2, and broadcast produces two independent children carrying4. The merge forwards both children; it does not execute the same packet twice.
