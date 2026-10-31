# Runnable graph demos

From the repository root, select the pinned Node/npm versions, then:

```sh
npm ci
npm run build
node examples/01-map-filter.cjs
node examples/02-async-branches.cjs
```

Both examples run offline against the built library. They use the real graph compiler/runtime and finish on their own. No application server, credentials or external repositories are needed. Rebuild after changing library source. These checkout demos are distinct from the historical server/src scripts.

| Example | What it demonstrates | Expected result |
| --- | --- | --- |
| [01-map-filter.cjs](01-map-filter.cjs) | Async transformation, serial predicate and a capacity1 connection | Input1/2/3/4 becomes6/8; completed. |
| [02-async-branches.cjs](02-async-branches.cjs) | One request branches into profile/settings operations, with distinct stable component names, operation budgets, cancellation signals and merged result streams | Two results for demo-signup-42: Saved Ada and Saved dark; completed. |

The second example's save functions are asynchronous local stand-ins. They do not persist data. Both branches retain job/key correlation while derived packets record immediate lineage. The output shows results as they arrive; cross-branch arrival order is not guaranteed.

S10's merge emits two separate result packets. S11 will add joinByKey for collecting matching branch results into one combined payload. A future durable host will address persistence and recovery of running workflows. The timeout values here are demonstration settings, not production recommendations for repository calls.

To adapt these examples to an installed package, replace require('../dist/cjs') with require('event-driven-design'). Use explicit application-owned IDs when defining multiple transformations, as shown in the second demo. See [the stream component guide](../docs/architecture/stream-components.md) for API/ordering details and the [slice index](../docs/cursor_plans/fbp-slices/INDEX.md) for actual review/merge progress.
