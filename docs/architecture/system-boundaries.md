# System boundaries

Status: architecture summary of SC-FBP-4/SP1 proposals; no implemented-runtime claim. Exact schemas/signatures/error rules live in the approved feature contract and master, not a second API definition here.

## Current source

| Current source | Responsibility / known limitation |
| --- | --- |
| src/dispatcher.ts, src/dispatcher/log.ts | Independent synchronous dispatcher instances and bounded metadata-only logs; optional shared instance |
| server/src/eventDispatcher.js | CommonJS shim delegating to the built dispatcher; no separate implementation |
| examples/legacy/www.cjs, wwwPromise.cjs | Legacy native-fetch examples, with localhost regression tests; not core graph transport |
| examples/legacy/eventNodeMap.cjs, fileLoader.cjs | Heuristic source scanning/examples, not authoritative runtime relationship graph |
| Historical scratch scripts | Removed at S16; retained in Git history rather than the package |

## Proposed layers and owners

| Layer | Owns | Does not own | Slice |
| --- | --- | --- | --- |
| Dispatcher | Legacy synchronous event behavior, active subscription/declared publisher topology | Async packet scheduling | S02–S03 |
| Packet/admission | Value validation, representation/ownership and frozen identity rules | Result persistence or queue scheduling | S00/S04 |
| Generic FIFO channel | Bounded single-reader/writer transport, drain/abort | JSON encoding, domain identity allocation or global completion order | S04 |
| Contract/component/catalog | Schema-inferred typed ports, runtime validators, safe descriptors | Executable browser registry or subtyping solver | S05 |
| Shared model/compiler | JSON graph validation, port/identity/capacity/cycle checks, immutable handle | Running processes | S06 |
| Typed builder | Checked construction of the same GraphSpec | A second graph language/executor | S07 |
| Runtime | Run-local processes/channels/context and terminal/resource lifecycle | Durability, provider retries or rollback | S08–S09 |
| Components | Map/filter/broadcast/merge/keyed collation | Hidden global state or unconstrained retained results | S10–S11 |
| Inspection | Explicitly registered graph/event inventory and safe diagram export | Automatic discovery or payload/function-source capture | S12 |
| Function API / test SDK | Easy authoring and bounded tests delegating to production runtime | Competing scheduler, hosted agent engine | S13–S14 |
| Package / Next fixture | Real install/declarations, bounded server flow, browser-safe metadata and graphical inspector | Core Next dependency, persistent route-hosted jobs or full editor | S16–S18 |

Separate intended package exports: root is Node execution/authoring; /model is serializable browser-safe definitions/inspection; /testing is Node helpers with no assertion-framework dependency. The framework stays useful independently of Next or a renderer. UI consumes structured snapshots and cannot grant server execution capability.

## Deliberate initial limits

JSON public payload admission and acyclic topology are initial profiles. Generic transport/type boundaries preserve later expansion; enabling custom objects requires validation/copy-or-share/serialization/resource rules, and enabling feedback requires seed/budget/termination/deadlock/cancellation contracts. Stable job IDs and retained addressable results are separate concerns; S00 must settle the initial identity and lookup scope. No existing in-memory object becomes durable merely by receiving an ID.

See [decision register](decision-register.md) and [master extension horizon](../cursor_plans/fbp-foundation-plan.md) rather than creating speculative plugin/loop/durable-store implementations now.


## Internal module organization

The layers above define responsibilities, not a one-file-per-layer mandate. Follow [readability rules](../agent-rules/readability-and-structure.md): a public runtime.ts/graph.ts entry can delegate to a small capability-owned directory of cohesive internal modules. Keep orchestration/effect ownership singular and public exports deliberate. Prefer meaningful capability names and shallow enough hierarchies that a human can trace data flow without hunting through generic utility buckets. Around200 lines is a review cue, not a hard limit; document why a larger cohesive unit is clearer when retaining it.
