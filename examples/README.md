# Runnable graph demos

From the repository root, select the pinned Node/npm versions, then:

```sh
npm ci
npm run build
node examples/01-map-filter.cjs
node examples/02-async-branches.cjs
node examples/03-keyed-collation.cjs
node examples/04-inspection.cjs
node examples/05-node-authoring.cjs
node examples/06-testing.cjs
node examples/07-external-feed.cjs
```

All examples run offline against the built library. They use the real graph compiler/runtime and finish on their own. No application server, credentials or external repositories are needed. Rebuild after changing library source. These checkout demos are distinct from the historical server/src scripts.

| Example | What it demonstrates | Expected result |
| --- | --- | --- |
| [01-map-filter.cjs](01-map-filter.cjs) | Async transformation, serial predicate and a capacity1 connection | Input1/2/3/4 becomes6/8; completed. |
| [02-async-branches.cjs](02-async-branches.cjs) | One request branches into profile/settings operations, with distinct stable component names, operation budgets, cancellation signals and merged result streams | Two results for demo-signup-42: Saved Ada and Saved dark; completed. |
| [03-keyed-collation.cjs](03-keyed-collation.cjs) | Async branches with heterogeneous results and a job/key join | One object containing profile and settings, with two immediate parents; completed. |
| [04-inspection.cjs](04-inspection.cjs) | Explicit live/idle graph and dispatcher registrations, scoped snapshots and Mermaid export | Three source subgraphs; once listener disappears on the next snapshot. |
| [05-node-authoring.cjs](05-node-authoring.cjs) | Inject a local async lookup service using ordinary JavaScript | Found Ada, then missing; two service calls; completed. |
| [06-testing.cjs](06-testing.cjs) | Public runNode/runGraph helpers with real execution and independent assertions | Node4/6, graph5/7, completed; wrong input rejects INPUT_CONTRACT. |
| [07-external-feed.cjs](07-external-feed.cjs) | Serial external input feeding with a gated slow consumer and capacity1 edge | Complete50 packets/sum2450; cancel returns0 results and releases waits. |

The second and third examples' save functions are asynchronous local stand-ins. They do not persist data. Both branches retain job/key correlation while derived packets record immediate lineage. The output shows results as they arrive; cross-branch arrival order is not guaranteed.

S10's merge emits two separate result packets. S11's joinByKey collects matching branch results into one combined payload. The third demo uses distinct result contracts for profile/settings, with one collated output and two immediate parents. A future durable host will address persistence and recovery of running workflows. The timeout values here are demonstration settings, not production recommendations for repository calls.

To adapt these examples to an installed package, use package exports as these scripts do. Use explicit application-owned IDs when defining multiple transformations, as shown in the second demo. See [the runtime overview](../docs/architecture/fbp-runtime.md) for API/ordering details and the [slice index](https://github.com/SilverFox70/node-eventDispatcher/blob/master/docs/cursor_plans/fbp-slices/INDEX.md) for actual review/merge progress.

The fifth demo is an installed-friendly JavaScript lookup example; the exact TypeScript template is independently compiled/tested by the installed cookbook checks. See [the application guide](../docs/guide.md). The seventh uses controlled local promises to demonstrate backpressure and cancellation, without timers pretending to be service latency.

Installed consumers can run these files under node_modules/event-driven-design/examples. They need no repository test helpers, source aliases or TypeScript runtime. The native-fetch/scanner modules under legacy are copyable historical utilities, not core public exports; see [migration](../docs/migration.md).

For the live graphical account example, run `npm run demo:next`, open http://localhost:54545/inspector and watch real packet observations. Payload capture requires the checkbox; sample data is invented. See [the Next guide](../docs/nextjs.md) for the explicit port override and [execution inspection](../docs/architecture/execution-inspection.md) for the optional runtime API.
