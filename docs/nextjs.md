# Run the packaged framework inside Next.js

S17 supplies a small App Router application under fixtures/next-consumer. It installs an actual event-driven-design tarball, not checkout source aliases. The core library gains no Next, React, server-only or browser-test dependency. This fixture pins Next16.4.3, React/ReactDOM19.3.1 and Node26.13.0/npm11.20.0; it does not claim compatibility with every historical Next release.

From the repository root:

```sh
npm ci
npm run demo:next
```

The command builds/packs the library, copies the fixture into a unique temporary application, installs its locked dependencies, builds a production Next server and prints its localhost URL. Open that URL, submit a number and see the server result.2 becomes4. Ctrl+C stops the child server. This does not deploy anything or change your global Node/browser configuration. The first setup needs network access for dependencies; the app itself uses only local fakes.

For automated acceptance:

```sh
npm run check
npm run test:next
```

The latter additionally installs task-scoped Chromium, proves a server-only import fails the client build, runs HTTP/browser tests against production builds and checks source-mapped server/browser coverage. Evidence and the exact tarball manifest/integrity remain in the printed temporary directory. Tests use localhost only; dependency/browser installation is preparation. Linux CI prepares browser system libraries as needed.

## Server owns execution

lib/registry.ts and provider.ts import server-only. A fixed double@1 node receives one finite number, runs through public runNode and returns its doubled output. No transpilePackages setting, handler serialization, uploaded code or client-selected registry is involved. The request signal and a1000ms flow deadline bound this demonstration; that test budget is not production latency advice.

POST /api/demo accepts exactly {value:number}. Malformed JSON, missing/extra fields and wrong/nonfinite values return400 INVALID_INPUT before the handler runs. Success returns200 {status:'completed',value:4}; timeout returns504 TIMEOUT and unexpected node failure500 FLOW_FAILED. A disconnected request cancels its run;499 CANCELLED can be returned if its connection is still writable. There are no automatic retries, route-global runs, durable result maps or provider calls.

Every reply has x-flow-request-id (server UUID), x-graph-revision demo@1 and no-store. Started runs also have x-flow-run-id. Runtime schema failures may add validation: the library's existing bounded ValidationReport, with component/node/port/direction/contract/representation/code/path attribution. Rejected values, stacks and provider messages are absent. Request-shape refusal has no invented runtime report or run ID. The UI echoes the backend verdict; /model validates descriptor/wiring metadata rather than application payload schemas.

Server-owned environment modes let acceptance tests exercise a local throwing provider or a cooperative wait. Request JSON cannot select them. Metadata-only effect/reply/terminal log markers synchronize exact call-count and cancellation assertions; they contain synthetic request IDs/status, not input values. No business state lives in those logs.

## Client receives metadata and current results

The client imports only event-driven-design/model plus its own response coordinator. The root page displays the form and result/error details and links to the separate graphical inspector. Invalid descriptors disable running. A new submission aborts the old request, and a sequence guard ignores late responses even if transport cancellation is ignored. Leaving the demo cancels active work.

The source-mapped production client assets and initial HTML are scanned for a server-only canary and Node/runtime/test imports. A deliberate asset mutation must be rejected, then restored. A tampered public catalog can claim a string is acceptable; the actual server still rejects it using its numeric contract before effects. Catalog JSON is not execution authority.

## Verification and boundaries

Existing core CI tests the library on Linux/macOS/Windows. A separate Ubuntu24.04 Next job builds and runs this pinned production consumer, including Chromium. These are automatic checks after code changes, not three deployments or application background workers. Hosted results are distinct from local results.

V8 data from the actual production server, browser and controlled request-coordinator tests is merged per compiled script before being remapped through emitted source maps to every executable fixture TS/TSX file. Per-file statements/lines/branches must reach95%; unimported modules fail. Type-only modules are identified from their syntax, not an unchanging filename exclusion. Source-map contents must match the tested source. The only currently unexercised route branch is its defensive unexpected-infrastructure catch; accepted payloads/provider modes cannot trigger it under the fixed compiler/runtime contract. It remains measured and inside the same threshold.

This proves package installation, Node server execution and browser isolation. It does not prove a real database/provider, authentication, serverless deployment limits, Edge execution, graphical editing or recovery after process loss. A Next request is not a durable workflow host. See [the slice index](cursor_plans/fbp-slices/INDEX.md) for the separate acceptance and future authoring phases.

## Live graph and event inspector

Run `npm run demo:next`, open the printed URL and follow **Inspect graphs and events** (or visit `/inspector`). Select account-flow, idle-definition or account-events. The SVG shows directed wiring and distinguishes defined, declared and active relationships with solid/dashed/dotted strokes. Keyboard-focus a graphic entity and press Enter/Space, or use the equivalent text buttons, to inspect component versions, ports, contract/schema descriptors and attribution. Full names remain in titles, details and the relationship table; SVG labels are shortened to fit cards. The graph's backend run state comes from the real inspection snapshot. The original flow page still echoes actual backend payload-validation verdicts.

Relationships update automatically without a refresh button. The local event demonstration removes a once subscriber, unsubscribes the ordinary subscriber, disposes the publisher, registers a new subscriber and emits again. It includes deliberately hostile-looking names to demonstrate safe text rendering; no label is HTML or executable code. Graph definitions remain present while idle. A disappeared selection shows the selection prompt rather than stale entity details.

GET `/api/inspection` owns one small real scope, completed runtime run and dispatcher for the connection. It subscribes to dispatcher topology changes and run completion, sends an initial safe snapshot, then sends coalesced current snapshots. Each frame has an increasing sequence; the queue holds at most one frame plus one latest pending frame. Disconnect/cancel or a60-second demo lease clears observers, timers and source registrations and cancels the owned run. Metadata-only lifecycle markers support cleanup proofs. There is no route-global session/run map. This demonstration restarts its local inventory on reconnection; applications must supply their own live source ownership and access control when adapting it.

The browser uses one native EventSource, with a1500ms server-specified retry interval. Interruption marks the retained display stale; automatic reconnection resets the connection sequence and receives a fresh authoritative snapshot. Old/disposed callbacks and older/duplicate frames cannot replace current state. Malformed inspection data closes the connection and displays an explicit error. Selection is local to the latest inventory, so switching sources does not start competing HTTP requests. The browser-safe shared model admits metadata; it does not evaluate application payload schemas.

Acceptance uses a server-only short-lease mode to prove real stream closure and reconnect without depending on browser offline emulation. Native tests also cover late callbacks, invalid frames, slow-reader coalescing, pre-abort/cancel/lease cleanup and observer failures. A source-map regression test preserves authored empty functions while rejecting the attribution of unmapped generated Webpack CSS stubs to a preceding closing brace. Disposable Next build workers flush V8 execution data before signal exit; both POSIX signals are tested. Coverage is checkpointed before full navigations so Chromium retains earlier same-URL interactions. Raw V8 ranges are merged before source remapping to reconcile partial switch executions across processes. Coverage gates and the never-imported-file negative control remain unchanged.

The UI is read-only. Drag/drop editing, durable graph revisions, readable code export and persistent execution are separate roadmap features. SSE hosting requires a Node deployment that supports streaming requests; a production integration must define authentication, source registration, proxy limits and appropriate lifetimes.
