# NodeDispatcher → usable FBP foundation

Contract version: 2  
Plan revision: r1, 2026-10-28  
Shared solution contract: SC-FBP-1 (sections 3–6 of this document)  
Status: ready-for-review; proposed behavior, not implementation approval  
Released tasks: none. T0–T9 are proposed for approval in dependency order.  
Tracking identity: `fbp-foundation` (local planning identifier, not a Jira ticket).

## 1. Outcome and stages

Make this repository an installable, documented library for building reusable asynchronous processes connected through named ports and bounded FIFO channels. A developer should be able to build a graph, stream several inputs through it, branch and join results, observe progress, and reliably finish or cancel it without using global event names as the execution protocol.

First useful checkpoint: M3 supports real streaming pipelines. Recommended first application adoption: M5, after branching, keyed joins, cancellation and diagnostics pass integrated acceptance. M6 makes installation and maintenance dependable. This is an in-process FBP foundation with an explicitly restricted acyclic graph model, not a claim of complete classical FBP support.

| Milestone | Tasks | Observable result |
| --- | --- | --- |
| M0 — current runtime and reproducible baseline | T0 | Latest stable Node installed for this project; version recorded; old failures distinguished from migration failures. |
| M1 — maintainable dispatcher and package skeleton | T1, T2 | Offline tests run on that Node; isolated dispatchers work; legacy import still works. |
| M2 — packets, ports and bounded channels | T3, T4 | Validated graph; real FIFO backpressure, close and abort semantics. |
| M3 — runnable streaming network | T5 | Reusable processes execute independently; a multi-packet pipeline drains and finishes. |
| M4 — reusable composition | T6 | Explicit broadcast, merge, map/filter and bounded keyed join. |
| M5 — lifecycle and operational confidence | T7, T8 | Timeout, cancellation, safe inspection, integration and stress proofs. |
| M6 — application consumption | T9 | Clean local install, runnable cookbook, package contract and CI. |

No source implementation, dependency installation, branch changes or publication is part of this planning run.

## 2. Provenance and current baseline

Inspected 2026-10-28 in `/Users/william.brinkert/Desktop/projects/node-eventDispatcher`, branch `master`, HEAD `cff28c9bc9c1cb3dd943b8ef7cede56a178ffe8a`. Initial dirty state: untracked `.DS_Store`; preserve it. No installed node_modules observed. Local `node --version`: `v24.13.0`; it is not the proposed target.

Sources read: README.md, docs/guide.md, package.json, .gitignore, and every JS module under server/src. Also read sibling FBP-Presentation/readme.md, NodeFunction.js, src/NodeFunction.js, src/main.js, src/eventDispatcher.js and lib/OneExample.js. That repository is design evidence only; no changes there are proposed.

Workflow: `/Users/william.brinkert/.agents/skills/batch-plan/SKILL.md`, its live references/workflow.md, and `/Users/william.brinkert/agent-flows/references/execution-contract.md` in full. No applicable AGENTS.md found at inspected repository/ancestor locations. CLAUDE.md, docs/AGENT_FILES.md, docs/architecture/README.md, docs/DEVELOPMENT_GUIDELINES.md, .cursor/rules, feedback history and baseline index are absent. Realberry-specific policies are not imported into this independent library. No ticket was supplied; no Jira integration or remote ticket check is needed for these user-originated requirements.

Observed baseline: `npm test` exits 1 with `Error: no test specified`. This is a deliberately failing placeholder, not evidence of a behavioral regression. `npm run main` invokes scratch code and a public HTTP endpoint; it is not an automated test and was not run. No lint/type/build/coverage gate exists. No expensive baseline capture performed; T0 owns a durable receipt and targeted characterization.

### Source-grounded findings

| Source/symbol | Observation | Consequence |
| --- | --- | --- |
| server/src/eventDispatcher.js, module singleton | Subscription and logger state shared through require cache. | Add instance factory; networks must not share global state. |
| emit + once + off | Iterates and splices the same subscriber array; removes once after callback. | Skipped adjacent callbacks and recursive once reentry are reachable. |
| unsubscribeAll catch | References eventLogs and sid outside their scope. | Missing-event cleanup can itself throw. |
| subscriber getters | Return live subscription arrays. | External mutation can corrupt internals. |
| event logger | Captures payloads and function source; no retention bound. | Do not reuse as the network diagnostics model. |
| package.json | main.js entry does not exist; test is placeholder; dependencies request, shortid, fs shim, cli-color. | Repair entry; replace old runtime dependencies and lockfile deliberately. |
| www.js/wwwPromise.js | Both use request; POST method points to function variable; event results lack request correlation. | Move to explicit example adapters using fetch; no generic HTTP-event protocol in core. |
| fileLoader.js | Rejects without returning, then continues on error. | Fix return paths if retained in scanner example. |
| eventNodeMap.js | String scanning for .on/.emit, with top-level execution/logging. | Preserve as explicitly limited legacy example; graph inspection uses actual graph structure. |
| FBP-Presentation NodeFunction | Useful node/link sketch; per-node mutable last-input/output; no queues, port protocol or run isolation. | Borrow concept, not implementation. |
| Presentation dispatcher vs this dispatcher | emit(name, {context}, ...args) vs emit(name, data, context). | No drop-in migration promise for the sibling prototype. |

### Runtime requirement — mandatory

The user explicitly requires the latest Node version, not merely an upgrade to an older supported LTS. Official release index checked during planning lists **Node v26.13.0**, released 2026-10-28, with bundled **npm 11.20.0**; download page also identifies it as LTS.

Sources: [official release index](https://nodejs.org/dist/index.json), [downloads](https://nodejs.org/en/download), [release policy](https://nodejs.org/en/about/previous-releases). T0 must recheck the official index when execution starts and choose the highest stable release available then, excluding nightly/RC/alpha. Record the exact version and npm version in the journal; a newly available stable release is the already-authorized selection rule, not a reason to silently stay on 24 or 26.13.0. Do not switch a user's global Node default.

Node baseline is a deliberate major compatibility change. Pin the selected exact version in .nvmrc and .node-version; package engines.node is `>=SELECTED_VERSION <NEXT_MAJOR.0.0` with actual numeric values substituted by T0/T1, and packageManager is `npm@EXACT_VERSION`. CI consumes .node-version, checks npm identity and uses npm ci. No promise to support earlier Node majors. Before eventual publication, recheck latest stable and rerun affected checks if the target changes.

Technical references: [Node test runner](https://nodejs.org/api/test.html), [Node streams/backpressure](https://nodejs.org/api/stream.html), [c8 all-files coverage](https://github.com/bcoe/c8#checking-for-full-source-coverage-using---all), [Morrison's FBP description](https://jpaulm.github.io/fbp/index.html). References inform the proposal; no interoperability certification is claimed.

## 3. Solution contract SC-FBP-1: scope and decisions

### Requirements

- R1: Latest stable Node, reproducible npm installation, local checks and CI agree.
- R2: Preserve documented legacy dispatcher calling convention while fixing identified correctness bugs and adding isolated instances.
- R3: Processes use named ports; connections are declared externally; graph definition is immutable once compiled.
- R4: Bounded FIFO channels propagate backpressure without dropping packets or hiding unbounded pending sends.
- R5: Packet data and component state are isolated across network runs; no cross-run global subscriptions.
- R6: Support asynchronous process lifetimes, multiple packets, fan-out, fan-in and keyed collation.
- R7: Explicit drain, abort, timeout and error semantics; all runtime-owned waits settle.
- R8: Bounded diagnostics and concrete integration/performance evidence.
- R9: Package can be installed into a separate app; documented migration and runnable examples.

### Invariants

- I1: No process executes for an invalid graph; compile has no component side effects.
- I2: Each accepted channel send is delivered once to its one reader in FIFO order in a successful run. This is not durable or external exactly-once execution.
- I3: A full channel waits; no packet overwrite or silent drop. Close drains accepted data; abort discards undelivered data explicitly.
- I4: Component state is constructed per node per run. Components do not know downstream node identities.
- I5: First fatal failure wins terminal state; subsequent failures are bounded diagnostics. Never report success after failure/cancellation.
- I6: No automatic retry of component work, HTTP calls or whole runs. Earlier external effects cannot be rolled back by this runtime.
- I7: Observability never owns scheduling or packet delivery, and does not include payloads/function source by default.

### Chosen architecture

Keep CommonJS JS source for straightforward migration and direct Node execution. Add JSDoc/checkJs and a checked index.d.ts public surface; no transpilation or parallel ESM implementation. An ESM consumer smoke test uses default import of the CJS package. Development-only tools: TypeScript, @types/node matching the selected Node major, ESLint with @eslint/js, c8. Resolve compatible current stable tool releases during T1 and pin exact resolved versions in package.json/lockfile; runtime core has zero third-party dependencies.

Use an async process API over owned channel objects. A component runs once per network run and loops over an input stream, rather than recreating a node for each packet. Default one process per node; no scheduler-level parallel reentry into the same node. Independent nodes are concurrent asynchronous tasks on Node's event loop, not separate CPU threads. CPU-heavy handlers must yield or remain out of scope.

Use an explicit FIFO channel implementation with a small contract and tests. Node streams are not a second scheduler; stream adapters can be a later extension. Separate EventDispatcher as a synchronous utility/compatibility surface, not the transport for core packets.

Initial graph model: finite acyclic networks, including long-lived streams until ingress closes. Cycles/self-loops are rejected. This restriction avoids pretending that cycle bootstrap, feedback termination and deadlock detection are already solved. General feedback graphs, bracket packets, dynamic topology, nested subgraphs, worker threads, distributed delivery, durable obligations, replay, retries, visual editor, browser bundle, plugins from untrusted code and Realberry adapters are excluded. Each requires a later plan with its own semantics. Generic components may still have several inputs/outputs.

## 4. Public boundaries and exact proposed API

Names below are contractual; internal algorithms can differ without changing observable behavior. Public implementation in src/index.js; public declarations in index.d.ts. Internal files are not exported except the legacy shim described below.

```ts
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Packet = Readonly<{ value: Json; key?: string }>;
type Endpoint = Readonly<{ node: string; port: string }>;
type PortSpec = Readonly<{ tag: string }>;
type Component = Readonly<{
  in: Readonly<Record<string, PortSpec>>;
  out: Readonly<Record<string, PortSpec>>;
  create(): (ctx: ProcessContext) => Promise<void>;
}>;
type ProcessContext = Readonly<{
  inputs: Readonly<Record<string, AsyncIterable<Packet>>>;
  send(port: string, packet: Packet): Promise<void>;
  signal: AbortSignal;
}>;
type GraphSpec = Readonly<{
  version: 1;
  nodes: readonly { id: string; component: string }[];
  edges: readonly { from: Endpoint; to: Endpoint; capacity?: number }[];
  inputs: Readonly<Record<string, Endpoint>>;
  outputs: Readonly<Record<string, Endpoint>>;
}>;
type CompileResult =
  | { ok: true; graph: CompiledGraph }
  | { ok: false; issues: readonly { code: string; path: string }[] };
type Terminal =
  | { status: 'completed' }
  | { status: 'cancelled'; code: 'CANCELLED' }
  | { status: 'failed'; code: string; nodeId?: string };
type Snapshot = Readonly<{
  runId: string;
  status: 'running' | 'draining' | 'completed' | 'cancelled' | 'failed';
  nodes: readonly { id: string; status: 'running'|'completed'|'failed'|'cancelled' }[];
  channels: readonly { id: string; queued: number; capacity: number;
    pendingSend: boolean; sent: number; received: number; discarded: number }[];
  diagnostics: readonly { sequence: number; code: string; nodeId?: string }[];
}>;
type NetworkRun = {
  runId: string;
  outputs: Readonly<Record<string, AsyncIterable<Packet>>>;
  send(input: string, packet: Packet): Promise<void>;
  closeInput(input: string): void;
  finish(): Promise<Terminal>;
  cancel(): void;
  done: Promise<Terminal>;
  snapshot(): Snapshot;
};
packet(value: Json, options?: { key?: string }): Packet;
compileGraph(spec: unknown, registry: Readonly<Record<string, Component>>): CompileResult;
startNetwork(graph: CompiledGraph, options?: {
  signal?: AbortSignal; timeoutMs?: number; diagnosticLimit?: number;
}): NetworkRun;
defineComponent(spec: Component): Component;
map(fn: (value: Json) => Json | Promise<Json>, tag?: string): Component;
filter(fn: (value: Json) => boolean | Promise<boolean>, tag?: string): Component;
broadcast(outputs: readonly string[], tag?: string): Component;
merge(inputs: readonly string[], tag?: string): Component;
joinByKey(inputs: readonly string[], options?: { maxKeys?: number }): Component;
```

All identifiers/tags are nonempty strings up to 128 characters; use Maps or own-property-safe maps, including names such as __proto__. Unexpected fields in GraphSpec rejected. Component definitions/registry are trusted application code, not graph-supplied functions, paths or eval strings. Tag `json` is a wildcard; all other tags must match exactly at an edge. Tags are compatibility labels, not runtime schemas. Components own application-specific value validation. PortSpec has no default/optional/batch ambiguity in this revision.

**Packet boundary:** payload is JSON data only: finite numbers, strings, booleans, null, dense arrays and plain objects with data properties; reject undefined, NaN/infinity, sparse arrays, accessors, symbol properties, cycles and class/function instances. Max nesting 64, max UTF-8 JSON payload size 1 MiB; key absent or nonempty string up to 128 chars. packet() deep-copies and deep-freezes. Every public send revalidates/copies so hand-built objects cannot bypass the contract. Validation failure rejects that send with FbpError.code `INVALID_PACKET`, does not enqueue, and leaves the run running. Data is one value: arrays are never expanded into positional arguments. map/filter preserve key; join requires key. No general ownership-transfer API, Buffers or mutable object sharing in r1.

**Errors:** FbpError extends Error and exposes code plus optional nodeId; original cause remains local and is not serialized by snapshot. Invalid factory/config/start options throw `INVALID_ARGUMENT`; invalid graph is a CompileResult with issues, not a thrown component failure. Components throwing synchronously, rejecting promises, invalid internal sends and early input abandonment fail the run. Application failures that should travel as data must be explicitly encoded by the component in JSON; no implicit error output port.

**Compilation:** validate shape, version, duplicate IDs, registry existence, endpoints, tags, capacity, connectivity and acyclicity. Default capacity 16, legal integers 1–256, max 1,000 nodes and 4,096 channels including boundary channels. Every declared input port has exactly one source (edge or exposed ingress), every output exactly one target (edge or exposed egress). Exposed boundary channels use capacity 16. No dangling ports, duplicate connections, implicit fan-out or multiple writers. Inputs/outputs may be empty for source/sink processes. At least one node is required. Issues use stable codes `INVALID_GRAPH`, `UNKNOWN_COMPONENT`, `UNKNOWN_PORT`, `DUPLICATE_ID`, `PORT_CARDINALITY`, `TAG_MISMATCH`, `INVALID_CAPACITY`, `GRAPH_LIMIT`, `CYCLE`; deterministic order by path then code. Compile snapshots the spec and registry definitions; later caller mutation cannot change a compiled graph. Factories are not invoked until start.

**Channel and stream contract:** one reader, one writer, FIFO; capacity counts queued packets, not one outstanding producer packet. At most one pending send and one pending receive per endpoint; overlapping calls reject the later call with `CONCURRENT_SEND`/`CONCURRENT_READ`. A successful send means accepted by channel, not downstream work completed. Full buffer parks one send; a receive frees one slot and admits it. close() stops new sends (`CHANNEL_CLOSED`), allows the already pending send to be admitted and drains it before EOF; EOF is iterator done, never null payload. abort() rejects pending operations, discards queue and makes future operations reject `RUN_TERMINATED`. Iterator return before EOF during a live run is `INPUT_ABANDONED` (external consumer abandoning an egress is also fatal). These endpoint errors from the caller's invalid overlapping operations do not themselves kill a run unless they escape a component. No detached internal promises with unhandled rejections.

## 5. Runtime, composition and recovery semantics

### Runtime owner: T5, tightened and proven by T7/T8

startNetwork allocates fresh queues, state, AbortController and randomUUID runId, then schedules each create() and returned process in a microtask. create() or process errors map to `COMPONENT_FAILED` with nodeId. Handles exist before any factory can execute. Pre-aborted signal starts no factory and returns an immediately cancelled run. Factories and definitions cannot be mutated by runtime.

run starts `running`; finish() sets `draining`, closes every ingress (including admission of any pending send), and returns the same done promise. closeInput closes one ingress idempotently. done resolves, never rejects, with exactly one Terminal. With no exposed ingress, natural process completion can complete the run. With ingress, successful completion requires all ingress closed, all processes returned, and every egress drained to EOF. External output consumers must run concurrently with sending/finish; not consuming an exposed output intentionally exerts backpressure. There is no hidden unbounded result accumulator.

When a process returns, runtime checks it consumed EOF on every input; otherwise fail `INPUT_ABANDONED`. It then closes all owned outputs. Sends must be awaited: returning with an outstanding send is `UNAWAITED_SEND`. Input iterators are single-consumer. A process may read multiple input ports concurrently with one outstanding read each. map/filter execute one handler at a time, preserving per-input order. No per-node concurrency option in this release.

cancel() is idempotent; first terminal transition wins. It closes run admission, aborts the internal signal, discards queued data and settles owned endpoint waits immediately. Terminal cancelled unless a failure already won. timeoutMs is absent (no deadline) or a positive safe integer; deadline starts at startNetwork and yields failed/TIMEOUT. Parent abort yields cancelled/CANCELLED. Fatal component failure yields failed/COMPONENT_FAILED; internal contract violations preserve their specific code. Failed node is failed, completed nodes stay completed, remaining nodes cancelled. Ties use first callback executed, not a promised deterministic winner between simultaneous external events.

done on failure/cancel need not wait for uncooperative user promises; detach their completion with rejection handlers, disable their context sends, ignore late success. JavaScript cannot forcibly interrupt a synchronous infinite loop or undo an external side effect. Cooperative handlers must use ctx.signal. After successful terminal state, repeated finish/cancel do not change it; snapshot remains readable; send rejects RUN_TERMINATED. dispose is unnecessary: terminal cleanup owns all runtime timers/listeners/waits.

### Built-in composition owner: T6

- map/filter use ports `in`/`out` with tag default json, preserve packet key, fail on handler throw/rejection; filter false drops intentionally and increments no transport discard metric (it consumed a packet normally).
- broadcast has one `in` and named outputs supplied in stable array order; at least two distinct names. For each packet, await delivery to each output in supplied order before reading another input. Slowest branch applies backpressure. A branch may receive before another fails; fan-out is not atomic. No rollback or retry. All branches get isolated copies of the same value/key.
- merge has named inputs (at least two) and `out`; waits on one read per open input. Emit whichever input becomes ready, ties by declared input order, then refill that input's read. Preserve each input's FIFO; no global arrival-order promise and no busy polling. Close output only when all inputs EOF. Retained ready values are bounded by input count plus channel capacities.
- joinByKey has named inputs (at least two) and `out`, tag json on all ports. Required key matches across one packet per input. Retain at most maxKeys distinct keys (default 128, integer 1–4096). For each key emit one packet `{ key, value: { [inputName]: inputValue } }` when complete; output key preserved, ordering follows completion. Duplicate input/key before emission fails DUPLICATE_KEY. Reuse of a key after emission is a new group, not global deduplication; callers needing unique one-shot correlations own that policy. If a new key would exceed maxKeys fail JOIN_CAPACITY before retaining it; do not wait forever for a key hidden behind the blocked input. When all inputs EOF and pending groups remain fail JOIN_INCOMPLETE, emitting no partial groups. No automatic time expiry; network timeout/cancellation bounds an indefinitely missing branch. Use same merge-ready policy to read inputs; no positional zipping of unrelated packets.

### Failure/crash trace and effect ownership

| Trigger/order | Observable outcome | Forbidden effect / recovery |
| --- | --- | --- |
| Invalid graph → start never called | Compile issues; factory call count 0 | No queue/process/HTTP creation. |
| Full queue → producer awaits → consumer receives | Pending send admits once, FIFO preserved | No drop, spin or unbounded promise queue. |
| Close while send pending → drain | Pending accepted send then EOF | No new send admission after close. |
| Component throws after earlier branch emitted | Failed terminal; existing consumed data remains consumed | No invented rollback or automatic rerun. |
| Cancel/timeout during blocked send/read | Terminal + waits settle; queues discarded counted | No output from late user promise. |
| HTTP call succeeds, later component fails | Failed run; prior external action may remain | Caller owns reconciliation; core never retries it. |
| OS/process crash | All runtime state lost | No recovery/durability claim; restart is a new run. |
| Output consumer exits early | Failed INPUT_ABANDONED | Do not report drained success. |

No database, authorization model, commit boundary, lease, persisted checkpoint or workflow wake is introduced. Components run trusted application code. Graph identity/port provenance is checked before effects. Durable recovery is deliberately a separate architecture, not an unimplemented promise hidden behind an adapter interface.

## 6. Legacy boundary, diagnostics and sibling disposition

Dispatcher export: `createDispatcher(options?: {logLimit?: number})` plus `eventDispatcher` singleton; legacy `server/src/eventDispatcher.js` becomes a shim exporting these from src/dispatcher.js. Retain emit(name, data, context), array-to-positional expansion, registration order, synchronous callbacks, no-listener no-op and callback throw propagation stopping dispatch. on/once/off still return undefined; unsubscribeAll returns true when event existed, false otherwise. Event names nonempty strings; invalid names/nonfunctions throw TypeError before state change. off(name, originalFn) removes the first matching registration, including once. Duplicates are distinct registrations. Registered listeners are snapshotted per emit: add/remove during a callback affects later emits, not this snapshot. Remove a once registration before invoking it; recursive emit cannot invoke it again. Adjacent once listeners each run once. Repeated emit recursively may invoke ordinary listeners again, by design. Async listener return values are ignored: document synchronous-only contract, direct async work to FBP.

Getter arrays/objects are copies; eventLog retains metadata entries only (action, timestamp, event, callbackName when relevant), max logLimit default 1000, legal 0–10000. logger starts off; toggles retained. Dropped oldest entries; no function source, raw payload/context or exposed mutable log state. This is an explicit logging/introspection compatibility change requiring migration notes. No compatibility with the sibling presentation emit signature is claimed.

Network diagnostics: snapshot() returns detached immutable data in the exact shape in section 4, ordered by graph node/channel order. Retain most recent diagnosticLimit events (default 100, legal 0–1000); monotonically increasing sequence. Record codes RUN_STARTED, INPUT_CLOSED, PROCESS_COMPLETED and terminal code; do not emit an event per packet. Channel counters count accepted sends, receives, and abort discards; queued never exceeds capacity. IDs are stable within a run (`edge:INDEX`, `input:NAME`, `output:NAME`). No callback observer or streaming event queue in r1. Applications can poll snapshots; no built-in polling timer. Inspect graph structure directly, not source-scanned events. No secrets/payload/function text in default diagnostics.

| Boundary provenance / sibling | Disposition and proof |
| --- | --- |
| Graph node IDs → registry definitions → port endpoints | Compile verifies same resolved node/port/tag, C08–C10; no loader-scope assumptions. |
| Public send → ingress owned by this run | Unknown input rejects UNKNOWN_PORT, C12; no cross-run handle/queue reuse, C13. |
| Legacy examples/guide | T2/T9 update to this repository's preserved calling convention, C01–C05/C29. |
| www/wwwPromise | T9 replace request implementation with fetch examples, local test server only; error/HTTP status explicit, no request dependency. |
| fileLoader/eventNodeMap | T9 move to examples/legacy; fix rejection fallthrough; label scanner heuristic, C30. |
| FBP-Presentation | No edits; document incompatible emit signature; port components replace copied class state. |
| Realberry/2919 | Excluded; no imported domain/null/DB policies. |

Boundary parity verdict: proposed mappings settled; current legacy incompatibility is evidenced above. Runtime integration tests are planned, not existing proof. DB/actor ownership parity N/A: no domain persistence or actor boundary.

## 7. Authoritative condition ledger

All rows are planned/unexecuted unless marked observed. Test filename + quoted title is the planned assertion pointer. Extend each file's tables rather than adding redundant suites. U = unit; I = real in-process integration; P = package/child-process smoke. Controlled deferred promises and test-local clocks replace arbitrary sleeps.

| ID | Requirement | Setup → order → exact assertion and forbidden effect | Level / owner / planned test |
| --- | --- | --- | --- |
| C00 | R1 | Clean copy on selected Node/npm → npm ci → exact pins match, package import succeeds; no older runtime fallback. Current npm test exit 1 observed. | P / T0,T1 / test/package.test.js `runtime matches pins` |
| C01 | R2 | Two once listeners + ordinary listener → emit twice → counts 1,1,2; recursive once emits → once count remains 1. | U / T2 / test/dispatcher.test.js `once removal before invocation` |
| C02 | R2 | A removes B/adds C while emitting → first emits A,B; next A,C; no skipped neighbor. | U / T2 / same `snapshot membership` |
| C03 | R2 | name absent → unsubscribeAll twice → false,false without throw; off once by original function → zero calls. | U / T2 / same `idempotent cleanup` |
| C04 | R2 | emit x,[2,3],ctx → callback gets 2,3 and this=ctx; thrown sentinel stops next listener; unknown event no-op. | U / T2 / same `legacy arguments and throw` |
| C05 | R2,I7 | Instances A/B same event → only A called; mutate getters/log copies → internals unchanged; 3 logged actions limit2 → length2, no payload/source. | U / T2 / same `isolated bounded inspection` |
| C06 | R4,I3 | Capacity1: send A accepted, B pending → receive A → B accepted → close → B → EOF; max queued=1, counts sent2 received2. | U / T3 / test/channel.test.js `backpressure and close drain` |
| C07 | R4,R7 | Full capacity1, one parked send → second concurrent send rejects CONCURRENT_SEND; abort → parked/read reject RUN_TERMINATED, discard1; no retained waiters. Separate concurrent read case rejects CONCURRENT_READ. | U / T3 / same `overlap and abort` |
| C08 | R3,I1 | Graph bad ID/port/component/tag/capacity/extra field/cycle/cardinality table → exact section4 code; create count0. | U / T4 / test/graph.test.js `reject graph before effects` |
| C09 | R3 | Valid chain → compile → mutate original nodes/edges/registry → compiled endpoints/factory references unchanged. | U / T4 / same `compile snapshots definitions` |
| C10 | R3 | __proto__ node/port names and json wildcard → valid compile; number/string tag mismatch → TAG_MISMATCH. | U / T4 / same `own identity and tags` |
| C11 | R5 | packet({a:[1]},key=x) → mutate source → packet value still1 and deeply frozen; table invalid values/size/depth → INVALID_PACKET before enqueue. null valid; array [2,3] remains one payload. | U / T3 / test/packet.test.js `isolated JSON packet boundary` |
| C12 | R7 | run.send unknown ingress → UNKNOWN_PORT, no enqueue; malformed packet → INVALID_PACKET; then valid packet succeeds; close twice then send → CHANNEL_CLOSED. | I / T5 / test/runtime.test.js `ingress validation and close` |
| C13 | R5,I4 | Same compiled graph, two runs keys a/b → outputs remain a/b separately, component create count2; no shared mutable node state. | I / T5 / same `independent runs` |
| C14 | R3,R6 | Input packets 1,2,3 through map double→plus1; consume output concurrently → 3,5,7 in order; finish → completed and EOF. | I / T5 / same `streaming pipeline drains` |
| C15 | R7,I5 | Process sync throw and async reject table → failed COMPONENT_FAILED/nodeId; downstream stops; no automatic retry; create throw same outcome. | I / T5 / same `fail process exactly once` |
| C16 | R6,I3 | Broadcast to fast/blocked branches capacity1 → upstream stalls; drain slow → both get [1,2,3], values isolated; no implicit fanout permitted in compile. | I / T6 / test/components.test.js `broadcast backpressure` |
| C17 | R6 | Merge left[1,2],right[10,20] controlled readiness → per-input order preserved, finish only after both EOF; max one read each. | I / T6 / same `merge stream closure` |
| C18 | R6 | Join a:x=1,a:y=2,b:y=20,b:x=10 → y:{a:2,b:20},x:{a:1,b:10}; never pair x/y. | I / T6 / same `join by key not arrival` |
| C19 | R6,R7 | Duplicate a:x before b:x → failed DUPLICATE_KEY; maxKeys1 with a:x then a:y → JOIN_CAPACITY; incomplete x at all EOF → JOIN_INCOMPLETE; missing key → INVALID_PACKET. | I / T6 / same `join bounds and incomplete groups` |
| C20 | R6 | Completed x group then another complete x group → two outputs; filter evens on[1,2,3,4] →[2,4] with original keys. | I / T6 / same `key reuse and filter` |
| C21 | R7 | Pre-abort → cancelled/create count0; block read/send → cancel twice → cancelled once, waits settle, timer/listener baseline restored. | I / T7 / test/lifecycle.test.js `cancel releases owned resources` |
| C22 | R7,I5 | Network deadline while handler awaits deferred → failed TIMEOUT; resolve/reject deferred later → no sends, no unhandledRejection; completed run cannot later cancel/fail. | I / T7 / same `timeout and late completion` |
| C23 | R7 | Process returns before EOF, or external output iterator returns early → failed INPUT_ABANDONED; process returns with pending send → UNAWAITED_SEND. | I / T7 / same `abandoned work cannot complete` |
| C24 | R7 | One exposed egress capacity1 not consumed → progress stalls; consume then finish → completed; multiple finish calls same promise/result. | I / T7 / same `consumer participates in drain` |
| C25 | R8,I7 | diagnosticLimit2 → run lifecycle → <=2 retained, sequence rises, counters exact, no payload/source; mutate snapshot has no effect. | I / T7 / test/diagnostics.test.js `bounded immutable metadata` |
| C26 | R4,R8 | 100000 packets, edge cap2, controlled slow sink → exact count/sum, queued<=2, <=1 pending send per endpoint; abort variant clears waits. Heap samples reported, not flaky fixed-byte assertions. | I / T8 / test/stress.test.js `bounded sustained pipeline` |
| C27 | R6,R7 | Source→broadcast→async maps→join→sink with two interleaved keys → exact keyed totals and completed; rejecting branch → failed, no replay; sibling late result suppressed. | I / T8 / test/integration.test.js `whole network composition and failure` |
| C28 | R9 | npm pack into temp dir → isolated npm install → require package and ESM default import; execute public pipeline and legacy shim; no repository-relative accidental dependency. | P / T9 / test/package.test.js `consumer uses packed package` |
| C29 | R9 | All cookbook scripts in child processes offline → documented exact output; fetch adapter uses localhost 200/500/abort → explicit result/error, server closed. | P / T9 / test/examples.test.js `offline examples and HTTP boundary` |
| C30 | R9 | Legacy scanner missing directory/file → one rejected promise, no follow-on TypeError; import core → no scanning/logging/HTTP. | U,P / T9 / test/legacy-examples.test.js `scanner errors and side effect free import` |
| C31 | R1,R8 | Inject unused production module in disposable fixture → coverage all-files denominator includes 0%-covered module and gate fails. Restore fixture; unchanged checkout. | P / T1,T8 / test/tooling.test.js `coverage sees unexecuted production` |

## 8. Milestone dependencies and task contracts

Graph: T0→T1→T2; T1→T3→T4→T5→T6→T7→T8→T9. T2 must be accepted before T8. T5 owns the only production orchestrator; T7 extends that same implementation. Each executor reads SC-FBP-1 and this ledger; no duplicated sibling plans or implementation contracts.

Every task records diff boundary, concrete test assertion pointers, red/green receipts, baseline comparison, remaining conditions and journal status in docs/cursor_plans/fbp-foundation-execution.md. A task is not whole-system acceptance. For new interfaces, establish behavioral red after the minimal scaffold exists, not merely module-not-found red. Generic return-to-planning rule: stop dependent work if the frozen contract contradicts observed source/runtime or requires an excluded behavior; do not quietly choose different semantics.

### T0 — select latest Node and capture baseline (M0)

Purpose: R1/C00. Prerequisite: approval for this plan's execution scope; use a non-master branch when execution begins, preserving .DS_Store. Read current package/lock and section2. Allowed: project-local runtime installation/selection, .nvmrc, .node-version, baseline index/record and execution journal. No global default change or core source rewrite.

Recheck official release index, record exact latest stable plus npm. Use that project runtime to run `node --version`, `npm --version`, `npm test`; record baseline placeholder failure accurately. In an isolated copy of tracked sources, install existing dependencies without executing third-party install scripts for baseline inspection; do not claim that an install failure is a behavioral failure. Capture relevant dispatcher behavior with a temporary external characterization harness; no public HTTP. Record old dependency/lockfile identities, versions and gaps in docs/agent-baselines/records/fbp-pre-modernization-r1.md and index. No existing reusable baseline available.

Completion: runtime selection receipt, old/new runtime comparison, meaningful known behavior/failures and exact baseline scope. If latest runtime cannot be installed or existing install is blocked, record unavailable evidence and block T1 acceptance until target-runtime execution is possible. Do not replace the latest requirement with the available v24 binary.

### T1 — tooling and importable scaffold (M1)

Purpose: R1,R9/C00,C31. Prereq T0. Allowed: package.json/lock, .npmrc (engine-strict=true), .gitignore, eslint.config.js, jsconfig.json, tsconfig.types.json, scripts/check.js, scripts/coverage-thresholds.js, src/index.js scaffold, index.d.ts scaffold, test/tooling.test.js, test/package.test.js initial runtime case. Preserve old dispatcher behavior; T2 owns migration.

Set engines/packageManager from T0; fix main to src/index.js and types to index.d.ts; keep package name event-driven-design. Establish explicit exports for root and ./server/src/eventDispatcher.js. Node-native test/assert harness, test filenames only under test/. Pin compatible stable dev tool versions. Use checkJs noEmit over src and examples once present; declaration test consumer in test/types/ checked separately. ESLint no-unused-vars/no-undef/recommended rules for JS. scripts/check.js uses child_process.spawnSync to run `process.execPath --check` on tracked JS production/example files, no command interpolation. Runtime dependencies remain until T2/T9 remove their consumers; do not leave package import dependent on examples.

Install the exact scripts in section9. Coverage checker reads coverage/coverage-final.json and enforces per-file lines/statements/branches >=95%; do not substitute suite aggregate. Explicitly prove an unexecuted module appears via c8 --all in an isolated fixture (C31). Completion: clean install, runtime assertion and check commands executable on target Node, old baseline not misclassified as fixed behavior. Red: broken entry / wrong pin / omitted unexecuted module causes the named check to fail. T1 scaffolds do not claim feature completeness.

Bootstrap detail: check/lint configuration includes future directories but uses ESLint `--no-error-on-unmatched-pattern`; tests initially cover only delivered behavior, not skipped placeholders claiming future acceptance. T1 may create test/types/consumer.ts for the current exports and expand it in later exporting tasks. jsconfig/tsconfig include existing source/declaration consumers without requiring nonexistent modules. Each task's own check passes before dependent features exist.

### T2 — correct and isolate dispatcher (M1)

Purpose R2/I7/C01–C05. Prereq T1. Allowed src/dispatcher.js, src/index.js exports, index.d.ts dispatcher declarations, server/src/eventDispatcher.js shim, test/dispatcher.test.js; remove shortid runtime dependency and regenerate lock. Implement section6 factory, snapshot dispatch, reentrancy-safe once, cleanup and bounded logging. Keep synchronous exception/argument convention. Tests first reproduce once skip/reentry and unsubscribeAll scope defect. Completion: all C01–C05 assertions green, new instances don't communicate, legacy path imports. Do not copy FBP-Presentation's incompatible signature or migrate its source. No async emit method added.

### T3 — packet and channel primitives (M2)

Purpose R4,R5/C06,C07,C11. Prereq T1. Allowed src/errors.js, src/packet.js, src/channel.js, test/channel.test.js, test/packet.test.js, corresponding types/export. Implement exact section4 value restrictions, FIFO, endpoint exclusivity, close-vs-abort semantics and bounded pending waits. Internal channel factory is not public package export. Prove packet source mutation cannot propagate, null differs from EOF, queue capacity and one parked writer bound. Completion: behavioral reds then green for capacity1 drain/abort and invalid values; no scheduler or generic retry scope.

### T4 — graph definition and validation (M2)

Purpose R3/I1/C08–C10. Prereq T3. Allowed src/component.js, src/graph.js, graph/component types/export and test/graph.test.js. defineComponent validates ports/create and snapshots the definition. compile validates without executing factories; use deterministic issue list and own-property-safe identity maps. CompiledGraph opaque/branded; start rejects forged compiled handles INVALID_ARGUMENT. Test every code with otherwise-valid fixtures so an earlier shape rejection does not mask the intended port/tag/cycle check. Completion: C08–C10, no runtime creation during compile; graph count/endpoint/capacity bounds proven. Do not support cycles implicitly.

### T5 — one real network runtime (M3)

Purpose R3,R5–R7/I2,I4–I6/C12–C15. Prereq T4. Allowed src/runtime.js, src/index.js runtime exports, runtime declarations, test/runtime.test.js. Own allocation, factories, process scheduling, context send/read, ingress/egress and natural drain. Implement fatal-error cleanup here, not only after T7. Tests prove same graph reused twice, streaming 3/5/7 result, ingress errors, synchronous and asynchronous exceptions and zero retry. Completion: M3 pipeline through public root API, done semantics and channel closure connected to production runtime. No separate demo-only executor. Late cancellation hardening and additional proofs are T7, without changing frozen API.

### T6 — reusable component library (M4)

Purpose R6/C16–C20. Prereq T5. Allowed src/components/{map,filter,broadcast,merge,join-by-key}.js, src/components/index.js, root/type exports and test/components.test.js. Implement the exact signatures, ordering, key policy, bounds and EOF behaviors in section5. Tests first distinguish arrival order from correlation and duplicate/incomplete errors from successful joins. Completion: integrated use over real runtime channels (not mocked sends only), no implicit graph fanout, no unbounded completed-key history. No built-in HTTP/filesystem side effects or configurable node concurrency.

### T7 — terminal lifecycle and safe inspection (M5)

Purpose R7,R8/C21–C25. Prereq T6. Allowed src/runtime.js, src/diagnostics.js, src/channel.js cleanup hooks, declarations, test/lifecycle.test.js and test/diagnostics.test.js. Finish cancellation/deadline/resource/late completion proofs, reject abandoned inputs/outputs and unawaited sends; add snapshot implementation in frozen shape. Track timers/listeners through test hooks or injected test-local resource tracker, not broad process._getActiveHandles assertions. Completion: terminal-once truth table, zero runtime-owned pending waits/timers/listeners after terminal, no unhandled late rejections; no claim to terminate arbitrary user JS or roll back effects.

### T8 — integrated acceptance and sustained load (M5)

Purpose R1–R8/C26,C27 plus regression C00–C25,C31. Prereq T2,T7. Allowed test/integration.test.js, test/stress.test.js, benchmark/throughput.js, bounded bug fixes only in src modules whose ledger evidence fails; ledger/journal updates. If the fix changes observable SC-FBP-1 semantics, return to planning. Benchmark a 3-map chain and broadcast→two-map→join graph at capacities1/16, 100000 packets; record throughput, elapsed time, high-water occupancy and sampled heap on selected Node/hardware. No invented performance promise or gate based on noisy wall time. Gate on exact results, bounded occupancy/waits and clean termination. Repeat 100 start/finish/cancel cycles with resource counters returning to baseline. Code coverage per section9 plus every condition proof mandatory. Completion: success, reject, stalled-consumer, cancellation, late failure and branch-error traces through the real public orchestrator; classify all uncovered regions.

### T9 — package, adapters, migration and cookbook (M6)

Purpose R9/C28–C30. Prereq T8. Allowed README.md, docs/guide.md, docs/architecture/fbp-runtime.md, docs/migration.md, examples/**, benchmark docs, .github/workflows/ci.yml, package scripts/files/exports/types, test/package.test.js, test/examples.test.js, test/legacy-examples.test.js and test/types/consumer.ts. Move scratch server examples/scanner/loader into examples/legacy; retain only documented dispatcher shim at old import path. Update main demo script to offline examples/pipeline.js. Remove request, fs shim and cli-color after their example consumers are replaced; regenerate lock, runtime dependencies empty. HTTP example uses built-in fetch, checks response.ok, honors AbortSignal and demonstrates local test server; optional real URL is supplied explicitly by user. Do not ship function doc parsing or automatic module discovery.

Cookbook must include: 1) numbers→map→filter→sink; 2) two branch async enrichment→keyed join with interleaved keys; 3) externally fed continuous stream→close→drain; 4) slow-consumer/backpressure and timeout/cancel; 5) converting an ordinary async function into a process, with application error-as-data. Show consumers starting before producers to prevent egress deadlock; examples use only public API and print exact outputs checked by C29.

T9 also owns removal/relocation of server/src/{www,wwwPromise,fileLoader,eventNodeMap,example,test,tinytest}.js after moving retained examples and fixing their imports. Only server/src/eventDispatcher.js remains as the compatibility shim. Direct imports of scratch modules are intentionally not supported; document their moves. No consumer of a removed dependency may remain in shipped code.

Package files allowlist: src/, index.d.ts, server/src/eventDispatcher.js shim, README, docs/guide.md, docs/architecture/fbp-runtime.md, docs/migration.md, examples/, LICENSE. Add LICENSE from existing ISC metadata without inventing ownership beyond package author. Exclude plans, feedback, .DS_Store, tests, reports and secrets from archive. C28 packs into temporary directory, installs archive in isolated consumer and runs pipeline and imports; ESM uses default import. CI target uses pinned Node/npm, npm ci, check, test, coverage, stress and package smoke on Linux/macOS/Windows; examples use portable paths. Workflow local creation is within execution scope; triggering/pushing is publication and separately authorized. Completion: package dry-run manifest inspected, public consumer/type tests pass, migration explicitly lists intentional changes. Do not publish to npm or rename package automatically.

## 9. Integrated verification, baseline and release boundary

### Exact command map (T1 creates these; not claimed available today)

```json
{
  "test": "node --test test/*.test.js",
  "test:stress": "node --test test/stress.test.js",
  "test:package": "node --test test/package.test.js",
  "lint": "eslint --no-error-on-unmatched-pattern src server/src/eventDispatcher.js examples test scripts benchmark",
  "typecheck": "tsc -p jsconfig.json --noEmit && tsc -p tsconfig.types.json --noEmit",
  "check": "node scripts/check.js && npm run lint && npm run typecheck",
  "coverage": "c8 --all --include='src/**/*.js' --include='server/src/eventDispatcher.js' --reporter=json --reporter=text --reporter=html node --test test/*.test.js && node scripts/coverage-thresholds.js",
  "main": "node examples/pipeline.js"
}
```

For Windows portability T1 should express c8 options in `.c8rc.json` and use `c8 node --test test/*.test.js && node scripts/coverage-thresholds.js` for the coverage script: same frozen scope/options, no shell single-quote dependence. `.c8rc.json` is therefore an allowed T1 file; the portable config form is the chosen installed version. Tests' wildcard must be accepted by the selected Node test runner on every CI OS, otherwise use a cross-platform Node test launcher in scripts/ preserving exact file set. Equivalent mechanics, not different scope.

Do not run these proposed scripts before T1 then label missing tools a product failure. T0 records baseline; T1 proves command wiring and the instrumentation denominator. No build/transpile gate: package is direct JS; syntax, checkJs, declarations and install smoke serve that boundary. No UI/Figma/accessibility/e2e browser or DB tests: no UI or database is introduced. HTTP adapter proof is local integration, not a public-site availability test.

Acceptance sequence on the pinned latest stable runtime: `npm ci`, `npm run check`, `npm test`, `npm run coverage`, `npm run test:stress`, `npm run test:package`, `npm pack --dry-run`. package test performs actual isolated pack/install; dry-run is a separate manifest review. Record actual exit statuses individually; never let a later successful command mask an earlier failure. Test suite includes stress by filename, so additional stress invocation is only for its explicit milestone/performance receipt, not mandatory repeated checking after nothing changes.

Coverage: c8 --all includes all src JS plus the retained shim, even never imported files. Whole-file scope is intentionally more conservative than changed-line scope. Per-file statements, lines and branches each >=95%, and every meaningful reachable ledger condition must have an exact assertion. Coverage exclusions limited to tests/examples/benchmarks (not core runtime); example behavior separately proved by child process tests. Reconcile every uncovered region; any exception identifies exact location, reason and proof. No target relaxation to accommodate an omitted failure path. Test success and coverage acceptance reported separately. Historical scanner code not promoted into core to inflate denominator.

During execution compare against T0 baseline record; placeholder test failure is known, not a waived current gate. New gates have no old executable equivalent and must pass independently. Baseline captures refer to a tracked isolated copy, never a temporarily reset/stashed user checkout. New target Node is part of applicability identity. On each milestone update journal: task/condition status, candidate revision and dirty scope, commands, expected/observed red/green and evidence output paths. All output receipts must remain available at handoff; no fabricated test counts.

Release means locally usable and reviewable, not published. Before external publication recheck current stable Node, audit the resolved production dependency tree (expected empty), inspect archive, validate CI/hook outcomes and record implementation/behavior/quality/publication statuses independently. Implementation approval does not authorize commit, push, npm publish or external messages.

## 10. Readiness review and executor walkthrough

| Gate | Verdict for proposed plan | Content evidence / affected tasks |
| --- | --- | --- |
| G1 interfaces settled | PASS | Sections4–6 freeze signatures, JSON/EOF, graph tags, issue/error codes, legacy API and terminal shapes; T2–T7. |
| G2 ownership/graph | PASS | Section8 DAG; T5 sole orchestrator, T6 combinators, T7 lifecycle/inspection, T8 integration; no parent/child circular dependency. |
| G3 executable conditions | PASS | C00–C31 give valid fixtures, order, exact assertion, forbidden effects, test paths and task owners. No claim tests already exist. |
| G4 commitment/recovery | PASS within in-process scope | Sections3/5 explicitly exclude durable recovery; no retries; abort/discard/late promise and external partial-effects trace specified. |
| G5 bounded tasks | PASS | T0–T9 name files, prerequisites, semantics, preservation, reds, completion and return-to-planning rule. |
| G6 verification | PASS as an execution proposal | Actual existing npm test failure recorded; T0 baseline task; T1 exact future command wiring and C31 all-files proof; section9 numeric per-file thresholds. Target Node install/tools not falsely marked verified. |
| G7 whole-flow acceptance | PASS | T8/C27 uses public runtime across branch/join success and failure; T9/C28 clean consumer; section5 failure/crash trace. |

Counterexample check per task: T0 cannot choose an old LTS (latest-stable rule); T1 cannot omit unused files from coverage (C31); T2 cannot use live listener mutation (C02); T3 cannot drop on full or treat null as EOF (C06/C11); T4 cannot run factories or infer ports (C08/C09); T5 cannot spawn a new node per packet or share runs (C13/C14); T6 cannot zip keys or cache them forever (C18/C20); T7 cannot await a noncooperative promise indefinitely after cancel (C22); T8 cannot substitute mocked channels for integrated proof (C27); T9 cannot rely on source-tree paths/public HTTP or claim sibling-signature compatibility (C28–C30/section6). Equivalent implementation algorithms are allowed; these observable choices are not.

Success walkthrough: packet 2 enters public ingress → validated/copied → bounded channel → component reads Packet → map returns 4 preserving key → send awaited → sink consumes 4 → ingress closes → processes read EOF/return → outputs close/drain → done completed. T3 owns transport proof, T5 owns production handoffs, T8 owns composed acceptance.

Rejection walkthrough: graph references absent node → compile issues UNKNOWN_PORT/path → factory count0, no start. Runtime input contains undefined → send INVALID_PACKET, no admission → valid follow-up still succeeds. Component failure after a previous successful output → fail once, abort pending work, late send forbidden, prior consumed output/external effect not undone. Distinct outcomes avoid conflating caller validation, compile rejection and fatal process failure.

Risk tradeoffs: JSON-only packets limit binary/custom-object use; acyclic graphs limit feedback algorithms; serial process handlers favor predictability over CPU parallelism; bounded keyed join fails explicitly under excessive skew rather than consuming unlimited memory; explicit egress consumption can intentionally stall a graph. These are proposed product decisions for this foundation, not inferred historical requirements. If review chooses different behavior, revise SC-FBP-1 before executing affected tasks.

No unresolved consequential choice is delegated to an executor. Missing target-runtime/dependency-tool execution is the explicit T0/T1 prerequisite, not evidence of a completed modernization. Status ready-for-review means this proposed plan can be approved, not that code is implemented or verified.
