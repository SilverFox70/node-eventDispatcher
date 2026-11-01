# Run the packaged framework inside Next.js

S17 supplies a small App Router application under fixtures/next-consumer. It installs an actual event-driven-design tarball, not checkout source aliases. The core library gains no Next, React, server-only or browser-test dependency. This fixture pins Next16.4.3, React/ReactDOM19.3.1 and Node26.13.0/npm11.20.0; it does not claim compatibility with every historical Next release.

From the repository root:

```sh
npm ci
npm run demo:next
```

The command builds/packs the library, copies the fixture into a unique temporary application, installs its locked dependencies, builds a production Next server and prints **http://localhost:54545**. Open that URL, submit a number and see the server result.2 becomes4. Ctrl+C stops the child server. This does not deploy anything or change your global Node/browser configuration. The first setup needs network access for dependencies; the app itself uses only local fakes.

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

Run `npm run demo:next`, open **http://localhost:54545** and follow **Inspect graphs and events** (or visit `/inspector`). Select account-flow, idle-definition or account-events. The SVG shows directed wiring and distinguishes defined, declared and active relationships with solid/dashed/dotted strokes. Keyboard-focus a graphic entity and press Enter/Space, or use the equivalent text buttons, to inspect component versions, ports, contract/schema descriptors and attribution. Full names remain in titles, details and the relationship table; SVG labels are shortened to fit cards. The graph's backend run state comes from the real inspection snapshot. The original flow page still echoes actual backend payload-validation verdicts.

Relationships update automatically without a refresh button. The local event demonstration removes a once subscriber, unsubscribes the ordinary subscriber, disposes the publisher, registers a new subscriber and emits again. It includes deliberately hostile-looking names to demonstrate safe text rendering; no label is HTML or executable code. Graph definitions remain present while idle. A disappeared selection shows the selection prompt rather than stale entity details.

GET `/api/inspection` owns one small real scope, a runtime run processing one sample packet, and a dispatcher for the connection. It subscribes to dispatcher topology changes and run completion, sends an initial safe snapshot, then sends coalesced current snapshots. Each frame has an increasing sequence; the queue holds at most one frame plus one latest pending frame. Disconnect/cancel or a60-second demo lease clears observers, timers and source registrations and cancels the owned run. Metadata-only lifecycle markers support cleanup proofs. There is no route-global session/run map. This demonstration restarts its local inventory on reconnection; applications must supply their own live source ownership and access control when adapting it.

The browser uses one native EventSource, with a1500ms server-specified retry interval. Interruption marks the retained display stale; automatic reconnection resets the connection sequence and receives a fresh authoritative snapshot. Old/disposed callbacks and older/duplicate frames cannot replace current state. Malformed inspection data closes the connection and displays an explicit error. Selection is local to the latest inventory, so switching sources does not start competing HTTP requests. The browser-safe shared model admits metadata; it does not evaluate application payload schemas.

Acceptance uses a server-only short-lease mode to prove real stream closure and reconnect without depending on browser offline emulation. Native tests also cover late callbacks, invalid frames, slow-reader coalescing, pre-abort/cancel/lease cleanup and observer failures. A source-map regression test preserves authored empty functions while rejecting the attribution of unmapped generated Webpack CSS stubs to a preceding closing brace. Disposable Next build workers flush V8 execution data before signal exit; both POSIX signals are tested. Coverage is checkpointed before full navigations so Chromium retains earlier same-URL interactions. Raw V8 ranges are merged before source remapping to reconcile partial switch executions across processes. Coverage gates and the never-imported-file negative control remain unchanged.

The UI is read-only. Drag/drop editing, durable graph revisions, readable code export and persistent execution are separate roadmap features. SSE hosting requires a Node deployment that supports streaming requests; a production integration must define authentication, source registration, proxy limits and appropriate lifetimes.

Coverage source-map alignment uses an in-memory generated padding column to neutralize the converter’s Babel-specific cross-file column-zero heuristic. Runtime assets and authored source mappings remain intact; a regression proves an unexecuted authored function stays uncovered and different-file locations stay distinct. The private invalid-definition startup test proves refusal before streaming, and a server-conditioned fixture test proves cancellation/disposal before run settlement.

## S18A: meaningful account execution

The inspector now runs accountId → sample lookup → summary with explicit versioned contracts. It looks up three invented records, awaits actual local service delays and derives same-job child packets; it is not a pass-through graph disguised as account loading. Node cards show purpose, component identity, port types, actual process state and channel counts. External ports explain what they feed or expose. Hostile labels remain in separate browser fixtures instead of the main example.

Packet markers and the selectable timeline use the runtime's real sent/received observations, full packet/job/run IDs, immediate lineage and elapsed time. They never resubmit data to simulate movement. The connected status is labeled Connection, separately from execution progress. Capture sample payloads is off by default; opting in starts a new local example and exposes only bounded public sample JSON. Restart or changing capture closes the previous stream and clears old results. Process/run state and counters remain authoritative; a received observation is not a business-success verdict. See [execution inspection](architecture/execution-inspection.md) for the optional base API and bounds.

Manual demos bind only localhost, with stable default port54545. An explicit override is supported:

```sh
npm run demo:next -- --port 54546
```

Invalid arguments fail before building. If the requested port is occupied, startup fails clearly; it never silently changes ports or terminates another application. Automated acceptance continues using ephemeral loopback ports, with separate localhost/bind/collision/cleanup proofs. This change does not configure your global host or network settings.

## S18B: live Pokémon HTTP graph

At /inspector, choose **Run live Pokémon example (capture public results)**. This is an explicit opt-in to public network calls and capture of their public results. Three fixed names fork into concurrent stats/species lookups and collate through the production keyed join. Result cards show both branches; the same inspector shows packets, lineage, state and counters. Disable capture to keep just metadata. Run account example again returns to the deterministic local demo.

Data comes from [PokéAPI v2](https://pokeapi.co/docs/v2), a free/no-key, read-only API. The server caches successful public fetches for one hour per its fair-use policy. A run performs at most six GET fetches (cache hits may avoid origin calls); it does not guarantee six new origin requests. Browser reconnects create fresh demo runs using the same cache. No artificial live-service latency or retries are added. Height is in decimetres and weight in hectograms. Attribution is also visible in the UI.

Each HTTP node has a5-second operation budget; the whole three-job graph has20 seconds. These are demo settings, not recommended production defaults. The adapter refuses redirects, validates upstream data and matching names, reads at most512 KiB per response and propagates cancellation. Upstream failure/invalid data is visible as a failed run, never replaced with invented success data. Public availability is not a CI requirement.

```sh
npm run stress:http
```

This deliberately runs the full production Next acceptance suite, including the owned HTTP stress harness and source-mapped coverage gates. The stress case runs32 networks/96 jobs with8 concurrent networks, making192 actual loopback HTTP calls. It asserts exact correlation, results, lineage, channel drain and no unintended retries; reports timings and observed HTTP concurrency to http-stress.json in the printed evidence directory. It also exercises503, invalid JSON/schema, oversized bodies, socket loss, held-request timeout and disconnect cancellation. Timing observations are machine-dependent, not SLAs or proof of maximum capacity.

The server-only FBP_POKEMON_BASE_URL override exists for the test harness and permits only an HTTP127.0.0.1 origin with root path. It is not accepted from URL/query/body data. Automated browser/network tests use this owned service; public APIs never receive the stress load. No root framework source, dependencies, persistence or global machine configuration is changed.
