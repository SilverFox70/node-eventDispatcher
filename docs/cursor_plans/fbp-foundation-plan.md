# NodeDispatcher → typed, installable FBP foundation

Contract version: 2  
Plan revision: r6, 2026-10-29  
Shared solution contract: SC-FBP-4 + proposed IC1-r2 identity amendment / SP1-r2
Status: S00 design complete for review; IC1 acceptance pending; S04–S19 remain blocked-on-decision  
Authorized execution: S00.A–C design and review submission only (2026-10-29). No later feature or merge authorized.  
Tracking identity: fbp-foundation, a local identifier rather than a Jira ticket.

Revision history: [r3](fbp-foundation-plan.r3.md) is preserved verbatim. r4 makes node-graph and event/subscription visualization an explicit base-framework requirement, including a public inspection/export API and a graphical sample.  [r2](fbp-foundation-plan.r2.md) is preserved verbatim. r3 adds explicit rich-packet, feedback-cycle and agent-application extension goals, with bounded present-day architecture proofs. Earlier revisions are historical. [r1](fbp-foundation-plan.r1.md) is preserved verbatim. r2 replaced r1's latest-stable policy with latest LTS, JS-first source with TypeScript, tag-only ports with runtime contracts, and adds a public authoring/testing SDK plus Next.js installation proof. r1/r2 are historical and must not be used as alternative execution contracts. This history records planning-only updates; S00 design execution was subsequently authorized on2026-10-29.

**Execution starts at [the ordered slice index](fbp-slices/INDEX.md), not the legacy T task list.** [r5](fbp-foundation-plan.r5.md) preserves the pre-S00 proposal; [r4](fbp-foundation-plan.r4.md) preserves the previously published master. [IC1-r2](fbp-identity-contract.md) now freezes one concrete proposed packet/job/lineage/key/lookup contract for human review. SP1-r2 partitions ownership/order; the master C00–C65 ledger is authoritative for proof. S00 design is complete, not merged/accepted; S04–S19 remain blocked until the identity amendment is accepted. S01–S03 remain independently reviewable and no later slice has started.

## 1. Outcome, recommendation and integrated milestones

Build an installable framework for reusable asynchronous processes connected through named ports and bounded FIFO channels. Make ordinary nodes easy to write as functions in TypeScript or JavaScript, while advanced streaming nodes have explicit lifecycle control. The same contracts should support type checking, runtime validation, documentation, node fixtures and a future visual graph editor.

**Recommendation: use TypeScript from the first new module.** This is a small legacy prototype without a working test suite; delaying typed port APIs would cause avoidable public-interface migration. Ship built JavaScript and generated declarations, so users and agents can still author JavaScript nodes. Layer the convenience APIs and visual tools on this foundation, rather than bolting type safety onto a completed untyped runtime. TypeScript does not validate incoming JSON; runtime schemas are a separate required boundary.

**Development quality direction (user,2026-10-29):** follow [human-reasonable code and structure](../agent-rules/readability-and-structure.md) throughout these slices. Aim for cohesive ordinary source files around a couple of hundred lines or less, ideally a screen-sized unit of behavior; use meaningful file/folder boundaries, deliberate shared/library functions and plain code. JSDoc explains useful API contracts and non-obvious rationale, not every line. Size is a strong design/review guideline with reasoned exceptions, not a hard cap or permission for artificial fragmentation. Public facade filenames in this plan do not require monolithic implementations; SP1/individual slice allowlists permit bounded private modules.

| Stage | Tasks | Integrated result |
| --- | --- | --- |
| M0 — supported runtime | T0 | Latest LTS Node and matching npm pinned; historical failure recorded. |
| M1 — typed library skeleton | T1,T2 | Reproducible ESM/CJS builds; corrected isolated dispatcher. |
| M2 — transport and contracts | T3,T4 | Immutable packets, bounded channels, typed ports and serializable graph/catalog. |
| M3 — useful FBP runtime | T5,T6 | Streams, async handlers, explicit branching/merging/keyed joins. |
| M4 — reliable lifecycle and developer SDK | T7,T8 | Cancellation, bounded diagnostics, function-node helper and public test harness. |
| M5 — installable application library | T9,T10 | Integrated/load proof, packed consumer, cookbook and node-authoring recipe. |
| M6 — Next.js companion proof | T11 | Package installed into Next.js; server executes graph, client graphically displays safe graph and event/subscription relationships. |
| M7 — release readiness | T12 | All boundaries composed and verified; no npm publication implied. |

A drag-and-drop graph editor, browser execution, persistent graph storage and hosted execution remain later projects. This plan delivers the browser-safe model and a graphical read-only inspection example so their integration boundary is real.

## 2. Provenance, baseline and latest-LTS requirement

Inspected repository: /Users/william.brinkert/Desktop/projects/node-eventDispatcher, branch master, HEAD cff28c9bc9c1cb3dd943b8ef7cede56a178ffe8a. Local Node observed in r1: v24.13.0. No installed dependencies. Original dirty file .DS_Store is preserved; additional local files are planning/feedback artifacts. r1 read every server/src module, README, guide, package/lock metadata, and the sibling FBP-Presentation node/dispatcher examples. These are source observations, not verified production behavior.

Workflow: shared batch-plan live workflow and execution-contract v2. Repository/ancestor AGENTS.md and standard canonical architecture/development guides were absent at r1 preflight; no Realberry policies are imported. Existing feedback is the r1 planning log, now read; its runtime selection is superseded by the user's latest-LTS clarification. No Jira ticket supplied or required. Prior Next.js site/repository has not been inspected; this plan proves a fresh compatibility fixture, not compatibility with any specific site's versions or deployment.

Observed baseline: npm test exits 1, printing “Error: no test specified”; not a behavioral test. No lint/types/build/coverage baseline exists. Scratch HTTP demos were not executed. T0 captures a durable baseline receipt without installing old dependencies into or resetting the active checkout.

### Current source evidence

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

### Mandatory runtime policy, revised by user

Select the latest **LTS** Node line and its latest released patch at execution time; exclude Current/non-LTS, alpha, RC and nightly releases. Planning lookup on 2026-10-28 reports v26.13.0 LTS, with npm11.20.0 in the official release index. Recheck rather than assuming that version remains latest. Pin exact Node in .nvmrc/.node-version and npm in packageManager; CI reads the same pin. package engines.node supports that selected major from the selected patch up to the next major. Do not switch the user's global runtime default. Before publication recheck latest LTS, update pins and rerun invalidated proofs; do not silently adopt a newer Current major.

Sources inspected: [Node downloads](https://nodejs.org/en/download), [official release index](https://nodejs.org/dist/index.json), [TypeScript generics](https://www.typescriptlang.org/docs/handbook/2/generics.html), [TypeScript type erasure](https://www.typescriptlang.org/docs/handbook/2/basic-types.html), [Zod](https://zod.dev/), [Zod JSON Schema export](https://zod.dev/json-schema), [Zod library schema traversal](https://zod.dev/packages/core), [Next server/client boundaries](https://nextjs.org/docs/app/getting-started/server-and-client-components), [Next Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route), [c8 all-files coverage](https://github.com/bcoe/c8#checking-for-full-source-coverage-using---all). External behavior was checked in official/maintainer sources; implementation tools/versions have not been installed or tested.

## 3. Requirements, invariants and exclusions — SC-FBP-4

R1 latest LTS/reproducible builds; R2 legacy dispatcher calling compatibility and correctness; R3 externally defined graphs/named ports; R4 bounded FIFO backpressure; R5 per-run state/packet isolation; R6 streams/fan-out/fan-in/keyed join; R7 drain/cancel/timeout/failure semantics; R8 bounded diagnostics and load evidence; R9 clean package installation/cookbook; **R10 typed and runtime-validated port contracts; R11 human/agent-friendly node authoring; R12 public node/graph testing; R13 Next server runtime/client model separation; R14 keep packet representation and topology policies separable so richer data and controlled feedback can be added without replacing transport/process execution; R15 expose all explicitly registered graph, event and subscription relationships through a renderer-independent inspection/export interface; R16 preserve separate job/packet/run/parent identity with explicit correlation and lookup boundaries (IC1 proposal).**

I1 invalid graph executes no process; I2 successful channel delivery is once/FIFO to its single reader (not durable/external exactly-once); I3 close drains, abort explicitly discards; I4 fresh process context/queues per run; I5 first fatal transition wins; I6 no automatic node/provider/run retry or implied rollback; I7 diagnostics are bounded metadata, not packet transport; I8 no executable handlers/dependencies/secrets in graph/catalog JSON or client imports; I9 tests use production validation/runtime, not a second interpreter.

Use finite acyclic graph topology, including indefinitely fed streams until ingress closes. Reject cycles/self-loops. Exclude feedback-cycle semantics, bracket packets, topology mutation, nested graphs, CPU worker scheduling, persistence/durable obligations/replay, remote execution, arbitrary uploaded code/eval, a general visual editor, browser runtime and Realberry-specific adapters. Node/Next runtime is trusted server code. A future editor changes GraphSpec; it does not ship arbitrary JavaScript to execute. JSON-only public admission and acyclic topology are initial execution profiles, not permanent limits on the framework. Section13 records future expansion and the current seams required by R14.

## 4. Package and TypeScript architecture

Retain package name event-driven-design until separately renamed. One TS source tree with strict, noUncheckedIndexedAccess and exactOptionalPropertyTypes. Emit executable JS plus declarations/source maps using TypeScript compiler into dist/esm and dist/cjs. Shared tsconfig.base.json; ESM config uses module ES2022/moduleResolution bundler; CJS config uses module Node16/moduleResolution Node16; both target ES2022, use explicit .js relative specifiers, and prohibit import.meta/top-level await. scripts/build.mjs cleans only generated dist, runs both compilers, writes dist/esm/package.json type=module and dist/cjs/package.json type=commonjs. Root stays commonjs to keep legacy .js files loadable during migration. No handwritten parallel declaration API.

Conditional exports for `.`, `./model`, `./testing`: import/types→dist/esm/<entry>.js/.d.ts and require/types→dist/cjs/<entry>.js/.d.ts. Order types before default within each condition. main/types fallback points at CJS. `./server/src/eventDispatcher.js` resolves to retained CJS shim loading dist/cjs/dispatcher.js; direct file import also works after build. Consumer tests cover import and require types/runtime separately. A compiled handle belongs to the import-format instance that created it; mixing an ESM-created opaque handle into CJS start is rejected INVALID_ARGUMENT, not silently accepted.

- Root export: Node runtime, component/contracts helpers, graph compiler and dispatcher. No React/Next dependency.
- /model: browser-safe JSON types, catalog/graph validation and descriptor helpers; no node:* imports, filesystem, handlers, runtime or test modules. JSON schema descriptors, not Zod objects, cross to client.
- /testing: Node-only test harness; depends on root's real compile/start implementations. No dependency on node:test/Vitest/Jest, assertions remain the consumer's choice.

Runtime dependency proposal: Zod4, exact compatible patch pinned at T1; replaces r1's zero-dependency goal with one deliberate schema dependency. Development dependencies: TypeScript, matching @types/node, ESLint/@eslint/js/typescript-eslint, c8; exact compatible stable versions locked. Next/React/Playwright are fixture/dev-only, never core peers/runtime dependencies. Source TS is published for mapped debugging; application consumers load dist and need no transpilePackages configuration. Pin Next/React compatible stable releases and fixture lock at T11; no claim of support for every historical Next release.

## 5. Contracts, descriptors, authoring and graph boundaries

### One schema definition, two forms of enforcement

Use `contract<T extends Json>(id: string, schema: z.ZodType<T,T>): Contract<T>`. Contract<T>, Packet<T> and transport generics themselves are unconstrained by Json; only the initially supported factory/admission profile constrains values. Every initial contract descriptor includes representationId=json@1, reserved by the framework. Unsupported representation IDs are refused as UNSUPPORTED_REPRESENTATION before execution; there is no public custom-codec registration API in this release. id includes a revision, e.g. `invoice@1`. It returns an opaque immutable contract with runtime validator and exported canonical JSON Schema. Contract is invariant in T to avoid unsound writable-port substitution. TypeScript inference comes from schema; users do not maintain a separate interface and schema with the same meaning.

Supported schema subset: JSON primitive literals/enums, finite numbers with numeric constraints, strings with length/format constraints, dense arrays with bounds, strict objects with optional members, nullable and unions of those. Objects reject extra keys; no stripping. Reject coercion, default injection, transforms, custom/async refinements, lazy/recursive schemas and non-JSON schemas. Reject unsupported definitions at contract creation as UNSUPPORTED_SCHEMA; do not silently export a broader descriptor. T4 enumerates supported Zod kinds/checks from the installed Zod4 documented zod/v4/core schema/check traversal API and tests rejection of every excluded category; if that cannot be done without private internals, return to planning to narrow/replace the schema adapter. Global JSON size/depth policy still applies before schema validation. No parsing is allowed to change a packet's value.

Contracts of the same ID in one catalog/registry must have identical canonical JSON Schema, else CONTRACT_ID_CONFLICT before any process executes. Graph edge compatibility is conservative: identical representationId, contract ID and canonical schema; a destination's built-in `json@1` accepts any JSON contract, but json source→narrow destination is CONTRACT_MISMATCH. Do not claim general schema-subtyping proof. Use an explicit validated adapter node to change shapes. Reserved json@1 is provided only by exported jsonContract, with built-in JSON-policy validation and descriptor schema {}; callers cannot redefine that reserved ID. Runtime still validates every emitted value and every ingress against destination schema before admission; compatibility labels never bypass validation.

Payload schema mismatch from public run.send rejects INPUT_CONTRACT before enqueue and leaves run running. Wrong internal output fails OUTPUT_CONTRACT with nodeId, no bad delivery; unexpected consumer mismatch fails INPUT_CONTRACT. Errors include port and safe schema path/code in local error details, never rejected raw values in snapshots. TS negative tests catch unknown port/mismatched payloads; runtime tests bypass TS deliberately with valid JSON to prove actual enforcement.

Descriptor authority clarification: describeRegistry validates declared examples against real contracts before export. /model validates Catalog structure/allowed JSON-schema descriptors and graph topology/contract consistency; it does not execute application validators or promise arbitrary JSON Schema payload evaluation in the browser. Browser examples are explicitly authored, public fixtures, never sampled live user data. The application author owns their publication suitability. JSON-schema export uses draft2020-12, throws on unrepresentable schemas, and never uses a fallback-to-any conversion. Supported string formats initially limited to UUID and ISO date-time; all other format checks rejected until explicitly added with parity fixtures. Canonical JSON sorts object keys, preserves array order, excludes nonsemantic description/example annotations from equality, and retains all assertion keywords. Zod's documented core def.type/check discriminants provide the allowlist traversal; unknown schema/check kind is a refusal, not silently supported. Schema semantic definitions are immutable by author contract; no application may mutate validator internals after registration.

### Core signatures (IC1-r2 proposal supersedes the earlier key-only envelope)

```ts
type Json = null | boolean | number | string | Json[] | {[key:string]:Json};
type PacketMetadata = Readonly<{
  version: 1; packetId: string; jobId: string;
  parentPacketIds: readonly string[]; key?: string;
}>;
type Packet<T = Json> = Readonly<PacketMetadata & { value: T }>;
type FunctionContext = Readonly<{ signal: AbortSignal; packet: PacketMetadata }>;
type ContractBase = Readonly<{id:string;representationId:string;schema:Json}>;
type PortMap = Readonly<Record<string,ContractBase>>;
// Contract<T> extends ContractBase; Port maps retain their concrete Contract<T> members.
type Values<P> = {[K in keyof P]: P[K] extends Contract<infer T> ? T : never};
type ProcessContext<I extends PortMap,O extends PortMap> = Readonly<{
  inputs: {[K in keyof I]: AsyncIterable<Packet<Values<I>[K]>>};
  send<K extends keyof O>(port:K, packet:Packet<Values<O>[K]>):Promise<void>;
  signal:AbortSignal;
}>;
defineComponent<I extends PortMap,O extends PortMap>(spec:{
  id:string;version:number;title:string;description:string;
  in:I;out:O;
  create(): (ctx:ProcessContext<I,O>)=>Promise<void>;
}):Component<I,O>;
defineFunction<I,O>(spec:{
  id:string;version:number;title:string;description:string;
  input:Contract<I>;output:Contract<O>;
  handler(value:Readonly<I>,ctx:FunctionContext):O|Promise<O>;
}):Component<{in:Contract<I>},{out:Contract<O>}>;
packet<T extends Json>(value:T,options?:{jobId?:string;key?:string}):Packet<T>;
derivePacket<T extends Json>(value:T,parents:readonly Packet[],options?:{key?:string}):Packet<T>;
compileGraph(spec:unknown,registry:Registry):CompileResult;
startNetwork(graph:CompiledGraph,options?:{
  signal?:AbortSignal;timeoutMs?:number;diagnosticLimit?:number;
}):NetworkRun;
```

Canonical identity allocation, validation, error precedence and propagation are in [IC1-r2](fbp-identity-contract.md). Runtime implementation remains blocked on its acceptance; no agent may invent ctx.key or a key-only envelope from historical snippets.

The notation above omits helper constraints for readability; T4 must preserve exact literal port keys/schema-inferred JSON payloads in generated declarations. Concrete acceptance: context.send('missing',...) fails tsc, context.send('out',packet('wrong')) fails for numeric out, and a numeric handler returning a string fails at definition (T8 function helper proof). No any in exported authoring/graph contracts; erased internals use unknown and narrow it. If typed APIs cannot satisfy these fixtures, T4 is incomplete, not permitted to widen them.

`createGraph()` exposes typed `add(id,component)` returning a typed node handle, `connect(from,fromPort,to,toPort)`, `exposeInput(name,node,port)`, `exposeOutput(name,node,port)`, and `toSpec():GraphSpec`. Only own builder handles accepted. connect requires existing literal ports and compatible payload types (use NoInfer/invariant handles to prevent inferring a misleading union); runtime contract-ID compatibility can conservatively reject two TS-compatible shapes. Structural GraphSpec and compileGraph remain authoritative for JSON/visual graphs. Builder is construction sugar, not another executor. No promise of static typing for arbitrary runtime JSON graph.

GraphSpec is JSON with version1; nodes {id,component}, edges {from:{node,port},to:{node,port},capacity?}, exposed inputs/outputs maps. Registry keys are `componentId@version` and must match definitions; node component is this exact versioned key. No code strings, module paths, dependency objects or serialized functions. Catalog contains only descriptor version1, component id/version/title/description, in/out maps {representationId,contractId,schema}, and optional descriptions/examples that pass their contracts and contain no secrets. Registry supplies executable code only on server. `describeRegistry(registry):Catalog`; `validateGraph(spec:unknown,catalog:Catalog):ValidationResult` exported from /model validates structure/connectivity/contracts, returning {ok:true} or {ok:false,issues:[{code,path}]}. compileGraph owns converting valid spec + registry into an opaque runnable handle and uses the same validator. Known names such as __proto__ use own-property-safe maps.

Capacities default16, integer1–256; max1000 nodes/4096 channels including exposed boundary channels (fixed16). Exactly one source per input and target per output; no dangling ports, implicit broadcast or multiple writers. Inputs/outputs can be empty for sources/sinks. Reject extra graph fields, invalid version, missing components/ports, duplicate IDs, incompatible contracts, over-limit graph and cycles before factories execute. Deterministic issue order by path then code: INVALID_GRAPH, UNKNOWN_COMPONENT, UNKNOWN_PORT, DUPLICATE_ID, PORT_CARDINALITY, CONTRACT_MISMATCH, CONTRACT_ID_CONFLICT, INVALID_CAPACITY, GRAPH_LIMIT, CYCLE. Opaque compiled graph cannot be forged. Compile snapshots definitions/spec and does not run create().

### Human and agent authoring contract

Default recipe is one directory per component: contract.ts, node.ts, node.test.ts, README.md and JSON examples. A pure function node processes one packet at a time and preserves key automatically; handler never names downstream nodes. Advanced multi-input/stream processes opt into defineComponent. Function API wraps the same runtime, awaits handler, validates output and awaits send before reading again. No decorators, class inheritance, code strings or mandatory visual editor.

Dependencies use ordinary application factories, e.g. makeLookupNode({lookup}) returns defineFunction(...) capturing an immutable injected service interface. Tests provide a fake lookup and assert exact calls. No framework service locator or global registry mutation. Library creates fresh contexts/queues; it cannot clone arbitrary mutable closure state. Stateless handlers and immutable captured dependencies are required for defineFunction; run-local mutable state belongs inside defineComponent.create(). Pass AbortSignal to I/O; throw is fatal, business failure-as-data must be explicitly schema-defined. No retry hidden in a node wrapper.

T8 writes docs/node-authoring.md and templates/node/ recipe consumable by humans/agents: purpose, schemas, inputs/outputs, dependency interfaces, side effects, ordering, key policy, cancellation, failure semantics, fixtures, exact test/build commands and constraints. A checked example shows a developer or agent modifying a handler within this contract and receiving type/test feedback. No automatic LLM call, agent runtime or accepting generated code without review is part of the framework.

## 6. Transport, execution, lifecycle and composition

JSON packet value: finite numbers/strings/booleans/null, dense arrays/plain data-property objects; reject undefined/nonfinite numbers/accessors/symbols/classes/functions/cycles/sparse arrays. Max nesting64 and UTF-8 JSON size1MiB; key absent or nonempty string <=128. Copy/deep-freeze; public send revalidates so handwritten Packet cannot bypass isolation. Invalid packet rejects INVALID_PACKET before enqueue; arrays remain one value; EOF is iterator completion, not null. Packet and contract validation are distinct tests. IC1 adds version1 packet/job/parent metadata, root/derived factories, exact ID validation,256-parent bound and copy-without-ID-rewriting admission. No result lookup or persistent/global dedup store is added; IC1-r2 requires bounded per-run execution records.

Channels: single reader/writer, FIFO, capacity counts queued packets plus at most one additional parked send. At most one pending send/read at endpoint; overlap rejects later call CONCURRENT_SEND/CONCURRENT_READ. Accepted send means queued/admitted, not downstream effect completed. close prevents new calls with CHANNEL_CLOSED but allows already parked send to admit before final EOF. abort discards queued packets, rejects waits/future ops RUN_TERMINATED. No unbounded pending promise queue. Returning input/output iterator early while live fails INPUT_ABANDONED; internal processes must await all sends (UNAWAITED_SEND if they return with a pending send). Caller misuse rejection does not kill run unless it escapes a process.

Runtime: fresh queues/controller/runId per start; defer create/process microtask until handles exist. Pre-aborted signal yields cancelled with zero factory calls. Factory/synchronous/asynchronous process throw maps COMPONENT_FAILED/nodeId; specific internal contract errors retain their code. Process return must follow EOF on all inputs, then runtime closes outputs. No concurrent reentry of one process; async nodes independently progress on Node's event loop, not CPU threads.

Run shape: runId, outputs map AsyncIterable<Packet>, send(name,packet):Promise<void>, closeInput(name):void, finish():Promise<Terminal>, cancel():void, done:Promise<Terminal>, snapshot():Snapshot. Unknown ingress rejects UNKNOWN_PORT; closeInput unknown throws UNKNOWN_PORT. Repeated closeInput idempotent. finish closes all ingress and returns same done promise. Completed requires all ingress closed, processes returned and exposed egress drained to EOF; consumers must run concurrently to avoid deliberate backpressure. No hidden result collector in production run API. No ingress/source-only graphs can complete naturally after their processes/outputs drain.

Terminal is {status:'completed'} | {status:'cancelled',code:'CANCELLED'} | {status:'failed',code:string,nodeId?:string}. done resolves once, never rejects. First terminal transition wins; later failures only bounded diagnostics. Parent signal/cancel yields cancelled; positive safe-integer timeoutMs yields failed/TIMEOUT after deadline (absent=no timeout). Failure/cancel discards queues, settles runtime-owned waits, clears timers/listeners immediately. Do not await uncooperative user promises before terminal; attach rejection handlers, ignore their late result, disable their sends. Cannot stop an infinite sync loop or undo prior external effects. No retry, durable checkpoint or restart recovery. Repeated finish/cancel never changes terminal; send after terminal rejects RUN_TERMINATED.

Snapshot is immutable detached metadata: runId, status(running/draining/terminal), nodes[{id,status}], channels[{id,queued,capacity,pendingSend,sent,received,discarded}], diagnostics[{sequence,code,nodeId?}]. Node states running/completed/failed/cancelled. Channel IDs edge:INDEX/input:NAME/output:NAME. Order follows graph order; retention default100/allowed0–1000; monotonically increasing sequence, bounded recent events only, no per-packet log, values, function source or service objects. Codes RUN_STARTED, INPUT_CLOSED, PROCESS_COMPLETED and terminal code. No polling timer/callback observer in runtime; application owns any polling and data access.

Combinators use explicit Contract arguments: map(inputContract,outputContract,fn), filter(contract,predicate), broadcast(contract,names), merge(contract,names), joinByKey(inputContracts,{outputId,maxKeys?,completedGroupLimit?}). Map/filter in/out; preserve job/key; serial await. map derives a child, filter true forwards its original envelope and false emits nothing. Function helper derives a child and exposes metadata only at ctx.packet. Broadcast >=2 distinct outputs, distinct derived child IDs with one input parent per branch, stable declared order, await every branch before next input; slowest branch backpressures, partial delivery possible on failure, no rollback. Merge >=2 inputs one out, forwarding existing envelope identities; one outstanding read/input, emit ready first, ties declaration order; preserve each input FIFO and EOF only when all closed. No global order promise.

joinByKey requires key and2–256 named inputs; one packet/input/(jobId,key). When all inputs present, derive one child with common jobId/key, value{inputName:inputValue}, and immediate parent IDs in input declaration order; output contract is strict-object schema composed from input contracts and identified by required outputId. maxKeys counts distinct(jobId,key) tuples, default128/integer1–4096. Duplicate input/tuple before group emits → DUPLICATE_KEY; reuse after completed group fails JOIN_GROUP_COMPLETED; retain bounded completed markers without live-run eviction (IC1-r2). New key above limit→JOIN_CAPACITY before retaining it; all EOF with groups pending→JOIN_INCOMPLETE, no partial group. Missing key→INVALID_PACKET. Read readiness same as merge. Completion order defines output order; no unbounded history or default group timer. Network timeout/cancel handles indefinitely missing branch. Schema IDs must be unique/consistent across different join shapes.

Failure trace: compile rejection→zero effects; invalid public input→zero admission/run remains usable; full queue→park then exactly one admission on receive; close pending→drain before EOF; process/provider failure after earlier output→failed/no rollback/no replay; cancel→owned waits settled/late output suppressed; OS crash→in-memory state lost. T9 owns whole-network proofs; external operation reconciliation and deployment lifetime remain caller-owned.

## 7. Public test SDK and Next.js boundary

### Framework architecture tests versus consumer tests

Framework tests cover real channel/process/compiler/lifecycle contracts, schema/type boundaries, generated package exports, browser import isolation and sustained boundedness. Consumer tests cover node business behavior, contract refusals, dependencies/side-effect cardinality, cancellation, key propagation and graph-level composed outcomes. Neither suite substitutes for the other. A graph tested with fake services is not proof of a real provider/database; application integration tests own those boundaries.

Public /testing API:

```ts
type TestResult = {
  terminal:Terminal;
  outputs:Readonly<Record<string,readonly Packet[]>>;
  snapshot:Snapshot;
};
runGraph(graph:CompiledGraph, options:{
  inputs:Readonly<Record<string,readonly Packet[]>>;
  timeoutMs?:number;maxOutputPackets?:number;signal?:AbortSignal;
}):Promise<TestResult>;
runNode(component:Component, options:{
  inputs:Readonly<Record<string,readonly Packet[]>>;
  timeoutMs?:number;maxOutputPackets?:number;signal?:AbortSignal;
}):Promise<TestResult>;
```

Generic overloads preserve exact node port/payload types; runGraph remains erased for dynamic graph inputs. runNode builds a real one-node graph with all ports exposed, compiles and delegates runGraph. Graph/node validity failure or unknown input names throws before start; invalid packet input yields harness rejection with same code after cancelling/settling run. No missing input array means wait forever: omitted declared input means empty stream, closed immediately. Input arrays limited to100000 total packets. timeout default1000ms, positive safe-integer override; collectors start before feeders, drain each egress concurrently; maxOutputPackets default1024, integer1–100000 across all outputs, exceed→cancel and reject TEST_OUTPUT_LIMIT, no truncated-success result. Outputs partial on actual component failure are returned with failed terminal, never asserted successful by harness. Cancellation result returned normally; cleanup in finally releases owned resources on every throw/terminal. End-user uses assert/Vitest/Jest directly on result; helpers do not swallow failures or simulate a competing scheduler. Ordering across ingress streams intentionally unspecified; race-sensitive framework tests use controlled deferred producers with raw startNetwork.

T8 cookbook includes pure node, injected lookup fake, multi-output advanced process, invalid output, cancelled I/O and full fork/join fixtures, including JS author using runtime contracts and TS author receiving compile-time feedback. Fixture expectations are explicit arrays/objects, never computed with the production handler as oracle. Compile-negative tests use @ts-expect-error and fail on unused directive. Keyed interleaving, early close and no unintended effect cases are mandatory. Optional property-based tests can be a later extension; no generator dependency required now.

### Next.js installation and visual-model proof

T11 owns fixtures/next-consumer as a separate dev-only Next App Router app installing the actual packed tarball. Core never imports next/react/server-only. App's registry module imports server-only, Route Handler declares runtime='nodejs'; Client Component imports only /model and type-only descriptors. Passing serialized Catalog/GraphSpec to client never passes live Component, CompiledGraph, validators or dependency closures. Executable code stays in the registry on server. Browser may validate graph structure/catalog compatibility; server must repeat validation using its authoritative registry, not trust a submitted catalog.

Scope: fixed demo graph `double@1`, request POST /api/demo {value:2} → HTTP200 {status:'completed',value:4}. Route accepts one finite-number JSON field, rejects malformed/extra/wrong-type input HTTP400 {code:'INVALID_INPUT'} with handler effect count0. Uses runNode helper for bounded in-request demo with 1000ms deadline and explicit request signal; timeout→504 {code:'TIMEOUT'}, unexpected node failure→500 {code:'FLOW_FAILED'}, no raw errors/stack/secret. Demo is local fixture, not a public arbitrary-graph execution service. Client's run control aborts obsolete requests; UI displays only current result and loading/error states. Registry has a test canary string in server-only dependency; inspect client build assets to prove absence, not just source imports.

Read-only inspector: list node titles/versions, named ports/contract IDs and connections, with accessible text representation. Selecting a node shows public schema and safe fixture example, never executable function source or runtime payload logs. A read-only SVG node/edge diagram is required, with the list/connection table as an accessible equivalent. It includes explicitly registered node graphs and dispatcher relationships using section14 inspection data. Drag/drop editing remains excluded; graph layout is a presentation concern, not a runtime dependency. Unknown descriptors/invalid graph show validation errors and disable demo run. Browser and server share one descriptor model. This is an integration sample, not a promised reusable React editor package. Future visual canvas can consume these same models under a separate plan.

No module-global run Map, background work started and forgotten by a route, or cross-request snapshot session. A Next/serverless request is not a durable process host; flows that must survive disconnect/redeploy require an independent worker/persistence architecture later. No Edge runtime support in this plan. No auth/multi-tenant production API is implied by the fixed local fixture; application integration owns access to its own registry/data. Package installation support is proved independently of any site's deployment runtime limits.

## 8. Legacy boundary and sibling dispositions

Dispatcher export: `createDispatcher(options?: {logLimit?: number})` plus `eventDispatcher` singleton; legacy `server/src/eventDispatcher.js` becomes a CommonJS shim exporting these from dist/cjs/dispatcher.js. Retain emit(name, data, context), array-to-positional expansion, registration order, synchronous callbacks, no-listener no-op and callback throw propagation stopping dispatch. on/once/off still return undefined; unsubscribeAll returns true when event existed, false otherwise. Event names nonempty strings; invalid names/nonfunctions throw TypeError before state change. off(name, originalFn) removes the first matching registration, including once. Duplicates are distinct registrations. Registered listeners are snapshotted per emit: add/remove during a callback affects later emits, not this snapshot. Remove a once registration before invoking it; recursive emit cannot invoke it again. Adjacent once listeners each run once. Repeated emit recursively may invoke ordinary listeners again, by design. Async listener return values are ignored: document synchronous-only contract, direct async work to FBP.

Getter arrays/objects are copies; eventLog retains metadata entries only (action, timestamp, event, callbackName when relevant), max logLimit default 1000, legal 0–10000. logger starts off; toggles retained. Dropped oldest entries; no function source, raw payload/context or exposed mutable log state. This is an explicit logging/introspection compatibility change requiring migration notes. No compatibility with the sibling presentation emit signature is claimed.

No edits to FBP-Presentation; its incompatible emit signature is documented, not copied. Old HTTP/scanner examples become explicitly legacy examples; HTTP tests use localhost. Realberry domain/DB workflows remain excluded. Component registry identity→schema identity→graph endpoint checks are owned by T4/C08–C10,C32–C34; no effects before validation. Runtime ingress identity and run isolation are T5/C12–C13. Browser catalog authority→server registry revalidation is T11/C43. Existing actor/DB parity is N/A because framework has no actor/DB boundary; Next sample is fixed local demo only.

## 9. Authoritative condition ledger

C00–C31 carry forward observed source gaps and planned proofs with revised owners below. All feature assertions are planned, not passing evidence. Test files can remain Node test JavaScript importing compiled JS; type fixtures use TS. Relative src .js paths in old findings refer to historical sources, not new TS implementation targets.

| ID | Requirement | Setup → order → exact assertion and forbidden effect | Level / owner / planned test |
| --- | --- | --- | --- |
| C00 | R1 | Clean copy on selected LTS Node/npm → npm ci → exact pins match, package import succeeds; no older runtime fallback. Current npm test exit 1 observed. | P / T0,T1 / test/package.test.js `runtime matches pins` |
| C01 | R2 | Two once listeners + ordinary listener → emit twice → counts 1,1,2; recursive once emits → once count remains 1. | U / T2 / test/dispatcher.test.js `once removal before invocation` |
| C02 | R2 | A removes B/adds C while emitting → first emits A,B; next A,C; no skipped neighbor. | U / T2 / same `snapshot membership` |
| C03 | R2 | name absent → unsubscribeAll twice → false,false without throw; off once by original function → zero calls. | U / T2 / same `idempotent cleanup` |
| C04 | R2 | emit x,[2,3],ctx → callback gets 2,3 and this=ctx; thrown sentinel stops next listener; unknown event no-op. | U / T2 / same `legacy arguments and throw` |
| C05 | R2,I7 | Instances A/B same event → only A called; mutate getters/log copies → internals unchanged; 3 logged actions limit2 → length2, no payload/source. | U / T2 / same `isolated bounded inspection` |
| C06 | R4,I3 | Capacity1: send A accepted, B pending → receive A → B accepted → close → B → EOF; max queued=1, counts sent2 received2. | U / T3 / test/channel.test.js `backpressure and close drain` |
| C07 | R4,R7 | Full capacity1, one parked send → second concurrent send rejects CONCURRENT_SEND; abort → parked/read reject RUN_TERMINATED, discard1; no retained waiters. Separate concurrent read case rejects CONCURRENT_READ. | U / T3 / same `overlap and abort` |
| C08 | R3,I1 | Graph bad ID/port/component/contract/capacity/extra field/cycle/cardinality table → exact section5 code; create count0. | U / T4 / test/graph.test.js `reject graph before effects` |
| C09 | R3 | Valid chain → compile → mutate original nodes/edges/registry → compiled endpoints/factory references unchanged. | U / T4 / same `compile snapshots definitions` |
| C10 | R3 | __proto__ node/port names and json target wildcard → valid compile; number/string contract mismatch → CONTRACT_MISMATCH. | U / T4 / same `own identity and contracts` |
| C11 | R5 | packet({a:[1]},key=x) → mutate source → packet value still1 and deeply frozen; table invalid values/size/depth → INVALID_PACKET before enqueue. null valid; array [2,3] remains one payload. | U / T3 / test/packet.test.js `isolated JSON packet boundary` |
| C12 | R7 | run.send unknown ingress → UNKNOWN_PORT, no enqueue; malformed packet → INVALID_PACKET; then valid packet succeeds; close twice then send → CHANNEL_CLOSED. | I / T5 / test/runtime.test.js `ingress validation and close` |
| C13 | R5,I4 | Same compiled graph, two runs keys a/b → outputs remain a/b separately, component create count2; no shared mutable node state. | I / T5 / same `independent runs` |
| C14 | R3,R6 | Input packets 1,2,3 through two raw process components double→plus1 (built-in map not required yet); consume output concurrently → 3,5,7 in order; finish → completed and EOF. | I / T5 / same `streaming pipeline drains` |
| C15 | R7,I5 | Process sync throw and async reject table → failed COMPONENT_FAILED/nodeId; downstream stops; no automatic retry; create throw same outcome. | I / T5 / same `fail process exactly once` |
| C16 | R6,I3 | Broadcast to fast/blocked branches capacity1 → upstream stalls; drain slow → both get [1,2,3], values isolated; no implicit fanout permitted in compile. | I / T6 / test/components.test.js `broadcast backpressure` |
| C17 | R6 | Merge left[1,2],right[10,20] controlled readiness → per-input order preserved, finish only after both EOF; max one read each. | I / T6 / same `merge stream closure` |
| C18 | R6 | Join a:x=1,a:y=2,b:y=20,b:x=10 → y:{a:2,b:20},x:{a:1,b:10}; never pair x/y. | I / T6 / same `join by key not arrival` |
| C19 | R6,R7 | Duplicate a:x before b:x → failed DUPLICATE_KEY; maxKeys1 with a:x then a:y → JOIN_CAPACITY; incomplete x at all EOF → JOIN_INCOMPLETE; missing key → INVALID_PACKET. | I / T6 / same `join bounds and incomplete groups` |
| C20 | R6 | Completed x group then fresh input for x → JOIN_GROUP_COMPLETED, only one output; filter evens on[1,2,3,4] →[2,4] with original keys. | I / T6 / same `key reuse and filter` |
| C21 | R7 | Pre-abort → cancelled/create count0; block read/send → cancel twice → cancelled once, waits settle, timer/listener baseline restored. | I / T7 / test/lifecycle.test.js `cancel releases owned resources` |
| C22 | R7,I5 | Network deadline while handler awaits deferred → failed TIMEOUT; resolve/reject deferred later → no sends, no unhandledRejection; completed run cannot later cancel/fail. | I / T7 / same `timeout and late completion` |
| C23 | R7 | Process returns before EOF, or external output iterator returns early → failed INPUT_ABANDONED; process returns with pending send → UNAWAITED_SEND. | I / T7 / same `abandoned work cannot complete` |
| C24 | R7 | One exposed egress fixedcapacity16 with packet17 parked, not consumed → progress stalls; consume then finish → completed; multiple finish calls same promise/result. | I / T7 / same `consumer participates in drain` |
| C25 | R8,I7 | diagnosticLimit2 → run lifecycle → <=2 retained, sequence rises, counters exact, no payload/source; mutate snapshot has no effect. | I / T7 / test/diagnostics.test.js `bounded immutable metadata` |
| C26 | R4,R8 | 100000 packets, edge cap2, controlled slow sink → exact count/sum, queued<=2, <=1 pending send per endpoint; abort variant clears waits. Heap samples reported, not flaky fixed-byte assertions. | I / T9 / test/stress.test.js `bounded sustained pipeline` |
| C27 | R6,R7 | Source→broadcast→async maps→join→sink with two interleaved keys → exact keyed totals and completed; rejecting branch → failed, no replay; sibling late result suppressed. | I / T9 / test/integration.test.js `whole network composition and failure` |
| C28 | R9 | npm pack into temp dir → isolated npm install → require package and ESM named/namespace import; execute public pipeline and legacy shim; no repository-relative accidental dependency. | P / T10 / test/package.test.js `consumer uses packed package` |
| C29 | R9 | All cookbook scripts in child processes offline → documented exact output; fetch adapter uses localhost 200/500/abort → explicit result/error, server closed. | P / T10 / test/examples.test.js `offline examples and HTTP boundary` |
| C30 | R9 | Legacy scanner missing directory/file → one rejected promise, no follow-on TypeError; import core → no scanning/logging/HTTP. | U,P / T10 / test/legacy-examples.test.js `scanner errors and side effect free import` |
| C31 | R1,R8 | Inject unused production module in disposable fixture → coverage all-files denominator includes 0%-covered module and gate fails. Restore fixture; unchanged checkout. | P / T1,T9 / test/tooling.test.js `coverage sees unexecuted production` |
| C32 | R10 | number contract → TS wrong payload/port/connect fixtures fail compilation; T8 adds wrong function-return fixture; equivalent legal fixture passes; no any widening. | Type / T4,T8 / test/types/contracts.ts `typed ports reject wrong values` |
| C33 | R10,I1 | Contract same ID/different schema → CONTRACT_ID_CONFLICT before create; string source→number target → CONTRACT_MISMATCH; unsupported transform/coercion/default/custom refinement → UNSUPPORTED_SCHEMA. | U / T4 / test/contracts.test.js `one contract meaning` |
| C34 | R10 | Public ingress number receives valid JSON string → INPUT_CONTRACT/no admission; valid number then succeeds; internal process sends string against number schema → failed OUTPUT_CONTRACT/no downstream effect. | I / T4,T5 / test/contract-runtime.test.js `runtime validates both sides` |
| C35 | R11 | defineFunction double input2/key x → output4/key x, one call; async handler controlled promise → no next packet until resolved; thrown handler → failure/no retry. | I / T8 / test/authoring.test.js `function wrapper uses runtime` |
| C36 | R11,I4 | makeLookupNode(fake) receives x → exact fake call x/signal once; two runs have fresh process contexts; advanced create-local count begins0 in each; shared mutable closures explicitly unsupported. | I / T8 / same `dependencies and local state` |
| C37 | R12,I9 | runNode numeric double inputs[2,3] → completed outputs[4,6] with keys; omitted input→closed empty output; invalid input rejects same INPUT_CONTRACT and no owned resources remain. | I / T8 / test/testing-sdk.test.js `node harness real validation` |
| C38 | R12 | runGraph fork/join emits two keyed results → exact values; branch throws after first → failed plus prior collected output, never completed; dependencies assert no unintended calls. | I / T8 / same `graph harness preserves failure` |
| C39 | R12,R4 | Output limit1 with node producing2 → reject TEST_OUTPUT_LIMIT, cancel/cleanup; unresolved cooperative handler deadline→failed TIMEOUT; late rejection handled, no waiters/timers remain. | I / T8 / same `harness bounded on every exit` |
| C40 | R9,R10 | Clean packed install from JS require, ESM import and TS consumers both module modes → same node results/types; no source transpilation needed; cross-format handle rejected INVALID_ARGUMENT. | P,Type / T10 / test/package.test.js `built distributions usable` |
| C41 | R13,I8 | Browser bundle importing /model → validation works and no node:* module, runtime handler or test harness in import graph; metadata serialize/parse→same validation result. | P / T11 / test/next/consumer.test.js `browser model isolated` |
| C42 | R13 | Packed fixture next build/start → POST {value:2}→200 completed4; wrong-type/extra input→400 INVALID_INPUT, handler count0; timed fake→504 TIMEOUT; throw→500 FLOW_FAILED. | I / T11 / same `Next server executes fixed flow` |
| C43 | R13,I8 | Client catalog tampered to accept string→server repeats authoritative numeric contract check, rejects400; client assets lack server-only canary/handler source; live CompiledGraph never serialized. | I,P / T11 / same `catalog not execution authority` |
| C44 | R13 | Browser inspector shows node title/version/ports/contracts/connections; select node reveals schema; invalid descriptor shows error/run disabled; keyboard reaches controls and current request wins after obsolete request abort. | Browser / T11 / fixtures/next-consumer/e2e/inspector.spec.ts |
| C45 | R11,R12 | Copy documented TS node recipe into isolated consumer, add fake dependency test → build/test pass; change return4→string → named type failure, bypass TS→named runtime/test failure; JS recipe also passes validation. | P,Type / T10 / test/author-recipe.test.js `consumer recipe gives useful feedback` |
| C46 | R10,R13 | Catalog metadata/examples validation table: unsupported schema rejects before execution, example mismatch rejects, serialized descriptors contain no function/dependency; browser/server graph issues identical. | U,I / T4,T11 / test/model.test.js `catalog parity` |
| C47 | R1–R16 | Built/packed artifact → framework checks + public harness + Next fixture + UI proof → same SC-FBP-4 revision, no source path alias, latest LTS pins consistent; each failure dimension separately reported. | I,P / T12 / acceptance journal and section11 commands |

| C48 | R14 | Internal generic channel carries a test-local frozen packet whose value is a custom class → reader receives same prototype/value; channel does not serialize/enumerate/freeze payload itself. Public packet/send of that object still rejects INVALID_PACKET. | U / T3 / test/channel.test.js `transport independent of representation` |
| C49 | R14,I1 | A→B→A valid endpoints/contracts → compile rejects CYCLE before factory; ordinary DAG starts consumer process before source releases its first packet, proving execution is independent stream processes rather than a topological batch. | U,I / T4,T5 / test/graph.test.js and test/runtime.test.js `topology policy separated from execution` |
| C50 | R11,R14,I8 | Public catalog and author recipe name versioned contract/representation IDs and declared effects/required dependencies; serialize→no executable capability grants. Unknown component/version/representation proposal→compile refusal, zero effects. | U,P / T4,T8,T10 / test/model.test.js and test/author-recipe.test.js `agent recipe cannot bypass registry` |
| C51 | R15 | Dispatcher on/once owner A + declared publisher B → inspect has exact event/publisher/subscriber edges; emit removes once before callback inspection, off removes ordinary subscription, dispose publisher removes declaration; legacy calls have unassigned owner, no invented publisher. | U / T2 / test/dispatcher.test.js `subscription topology stays current` |
| C52 | R15,I7 | Scope registers two graphs/runs and dispatcher → snapshot includes exactly these sources/relationships; duplicate source rejects, wrong graph/run association rejects RUN_GRAPH_MISMATCH, removal stops exposure; unrelated scope isolated; no handler invocation/payload/source in JSON. | I / T7 / test/inspection.test.js `explicit scoped inventory` |
| C53 | R15,I8 | Labels contain quotes, newlines, HTML and Mermaid syntax → JSON roundtrip stable; toMermaid uses synthetic IDs and escaped labels, produces no active HTML/directives; recorded IDs deterministic; no executable source leaked. | U / T4 / test/model.test.js `safe diagram export` |
| C54 | R15 | Next inspector selects between two registered graphs and dispatcher → SVG node/edge counts and labels match scope snapshot; relationship changes update the open view automatically without manual refresh; interruption is visible and reconnect resynchronizes from an authoritative snapshot; keyboard/text equivalent identifies same relationship; static declaration distinct from active subscription. | Browser,I / T11 / fixtures/next-consumer/e2e/inspector.spec.ts `graphs and event relationships visualized` |
| C55 | R16,R5 | packet(2,{jobId:'job-42',key:'person-a@r7'}) → fresh UUIDv4 packetId, supplied job/key,parents[]/version1; omitted job generates separate UUIDv4; invalid explicit options→INVALID_ARGUMENT, malformed raw metadata→INVALID_PACKET/no enqueue. | U / S04 / test/packet.test.js `root identity and raw envelope validation` — planned |
| C56 | R16 | derive from valid same-job parents preserves common job/key and ordered immediate parent IDs with fresh child; duplicate IDs→INVALID_LINEAGE, different jobs→JOB_MISMATCH, conflicting inherited keys→CORRELATION_MISMATCH; explicit key rekeys, no child on refusal. | U / S04 / test/packet.test.js `bounded derivation and refusal precedence` — planned |
| C57 | R16,I2 | Same valid packet delivered twice to one node/run → DUPLICATE_PACKET and one invocation, including concurrent/in-flight/failed cases; distinct nodes may receive it; execution ledger exhaustion→EXECUTION_CAPACITY before additional work; admission copies/freeze without rewriting IDs; invalid raw envelope enqueues0 and valid follow-up works. | I / S08 / test/runtime.test.js `identity-preserving admission with bounded duplicate protection` — planned |
| C58 | R16,R11 | map/function input P(job-42,keyx) returns changed value → child ID!=P,parents[P],same job/key; filter true forwards P unchanged and false emits0; helper reads ctx.packet with no ctx.key alias. | I,Type / S10 + S13 final / test/authoring.test.js and test/components.test.js `transform identity contract` — planned |
| C59 | R16,R6 | Broadcast P to a/b → distinct child IDs with parents[P],same job/key, isolated values; fail/cancel on second branch retains first delivery, no automatic resend. | I / S10 / test/components.test.js `broadcast branch identity` — planned |
| C60 | R16,R6 | Ready input packets from two merge ports → same original IDs/parent lists at out; each port FIFO preserved, no child ID allocated solely for routing. | I / S10 / test/components.test.js `merge forwards identity` — planned |
| C61 | R16,R6 | a(job-42,x)=1,b(job-43,x)=10 then a(job-43,x)=2,b(job-42,x)=20 → separated jobs with values{a:2,b:10}/{a:1,b:20},fresh outputs and parent IDs in[a,b]order regardless arrival. With only first two and EOF→JOIN_INCOMPLETE/0joined. | I / S11 / test/components.test.js `job-scoped join and lineage` — planned |
| C62 | R16,R6 | a(job-42,person-a@r6),b(job-42,person-a@r7)→EOF JOIN_INCOMPLETE/0joined; duplicate same input/tuple before completion→DUPLICATE_KEY; reused completed tuple→JOIN_GROUP_COMPLETED/zero extra output; completed marker exhaustion→JOIN_HISTORY_CAPACITY before final member/output; no live-run ledger eviction; maxKeys1 counts different jobs;257 inputs→INVALID_ARGUMENT, no truncated parents. | I / S11 / test/components.test.js `correlation versions reuse and lineage bounds` — planned |
| C63 | R16,R5 | Admit same root into R1/R2 → distinct runIds, unchanged root identities, independent process state and fresh derived child IDs per run; runId absent from packet. No durable/retry/lookup claim. | I / S08 / test/runtime.test.js `job identity distinct from run identity` — planned |
| C64 | R16,R12 | runNode/runGraph return real root/derived metadata and failure partial outputs under existing collector limit; no ID rewriting/dedup by helper, no base getResult registry; limit overflow still TEST_OUTPUT_LIMIT/cleanup. | I,Type / S14 / test/testing-sdk.test.js `identity-transparent bounded helpers` — planned |
| C65 | R16,I7,I8 | Run/inspection snapshots after repeated packets contain only bounded declared metadata/counters, no packet/value/parent-history registry or callbacks; requesting a public payload-history lookup is not part of exports. | I,Type / S12 / test/inspection.test.js `identity is not payload retention` — planned |

## 10. Legacy work groups — superseded by SP1 branch slicing

T0→T1; T1→T2 and T3; T3→T4→T5→T6→T7→T8; T2+T8→T9→T10→T11→T12. T4 owns contracts/model/compiler/builder; T5 sole production orchestrator; T8 convenience authoring and testing SDK call that orchestrator; T11 sole Next fixture owner. Each task reads SC-FBP-4 and applicable ledger rows. No agent delegation is requested or assumed.

Common completion receipt: allowed-path diff, exact assertions/test pointers, meaningful red→green evidence, quality/baseline comparison, condition status and limitations recorded in docs/cursor_plans/fbp-foundation-execution.md. New-interface module-not-found may bootstrap, but is not sufficient behavioral red. Tests expose the wrong behavior once interface exists. Extend existing tables/cases for distinct gaps. Keep user dirty files; execute off master. Return to planning for false prerequisite, missing schema behavior, widened types, excluded feature need or inability to prove the assigned boundary. Equivalent internal mechanics are allowed; changed public semantics require revision.

### T0 — latest LTS selection and historical baseline (M0)

Refs R1/C00; prerequisite execution authorization. Read section2 and old package/dispatcher. Allowed .nvmrc/.node-version, project-local runtime selection, baseline/journal artifacts. Select latest official LTS patch and bundled npm, record versions/release provenance. In isolated tracked-source copy capture npm test placeholder exit1 plus targeted dispatcher characterization on selected runtime; old dependencies installed without third-party install scripts for inspection. No public HTTP, global Node change or active-tree reset/stash. Save docs/agent-baselines/records/fbp-pre-modernization-r2.md and INDEX.md with command, code/tool/lock identity and limitations. Verify no substituted Current/old local runtime. Block dependent acceptance if target runtime unavailable; baseline setup failure is not behavioral proof.

### T1 — strict TypeScript builds and install skeleton (M1)

Refs R1,R9,R10/C00,C31. Prereq T0. Allowed package/lock, runtime pins, .npmrc engine-strict, .gitignore, tsconfig*.json, eslint.config.mjs, scripts/build.mjs, scripts/coverage-thresholds.mjs, .c8rc.json, src/{index,model/index,testing/index}.ts scaffolds, test/tooling.test.js and initial type/package fixtures. Implement section4 build/conditional export layout, generated declarations and exact section11 scripts. Keep root CJS during migration. Pin selected runtime/npm and compatible stable dev tools/Zod4; no app framework runtime dependency. No handwritten declaration fork. lint includes TS with typescript-eslint. Tests remain JS using node:test, importing built modules; exported consumer type fixtures compiled separately with NodeNext/Bundler/CommonJS resolution fixtures.

C31 must prove source-mapped all-files coverage includes an unexecuted new src TS module at0%, including the legacy shim once delivered; no missing module disguised by source-map exclusions. Build emits both JS formats and source maps; preserve meaningful source coverage denominator. Completion: build/import/type/lint scripts work with only delivered scaffold, no fake skipped future tests; wrong pin and wrong declaration fixture fail named checks. Missing directories are lint-tolerated, not silently omitted existing files. Old runtime consumers migrated by later owners.

### T2 — isolated correct dispatcher (M1)

Refs R2,R15/I7/C01–C05,C51. Prereq T1. Allowed src/dispatcher.ts, src/index.ts exports, retained server/src/eventDispatcher.js shim, dispatcher tests and package/lock to remove shortid. Implement section8 compatibility contract: snapshot callbacks, remove once before invoke, cleanup absent event, copied getters and bounded metadata logger. Prove legacy argument/context, sync throw behavior and independent instances. Keep shim CommonJS loading built CJS dispatcher. No copying sibling emit signature, async emitter or graph transport. Add inspect(), optional owner metadata on on/once, and explicit declarePublisher() as specified in section14; preserve two-argument calls and return values. Inspection metadata must not invoke callbacks or capture function source. Completion: meaningful defects red then green; old import path works after build; no raw payload/source logging.

### T3 — packet/channel primitives (M2)

Refs R4,R5,R14/C06,C07,C11,C48. Prereq T1. Allowed src/{packet,channel,errors}.ts, root exports and tests. Exact section6 JSON restrictions, bounded FIFO, single parked send/read, close/drain/abort, isolated packets and null vs EOF. Internal queue not public export. Completion: capacity1/abort/overlap/value-boundary assertions red→green, no hidden unbounded producer array. No scheduler/retry/correlation policy. Keep channel generic in payload; it transports already admitted packets and contains no JSON stringify/schema/clone logic. JSON policy stays in packet/contract admission functions; C48 proves this seam without enabling rich public packets.

### T4 — contracts, graph model/compiler and typed builder (M2)

Refs R3,R10/R13 model boundary/I1,I8/C08–C10,C32 (port/builder cases),C33,C46,C49,C50,C53. Prereq T3. Allowed src/{contracts,component,graph,builder}.ts, src/model/**, root exports, type/schema/model/graph tests. Implement section5 exact schema subset, canonical ID consistency, runtime validators, generated safe descriptors and compile-before-effects validation. Preserve generic/literal keys through declarations; no any-based escape. /model implements shared descriptor validation without importing Node runtime or registry handlers. typed builder rejects foreign handles/ports and tsc mismatches; JSON path remains runtime validated. Output/input contract plumbing handed to T5 with C34 fixtures specified now. If schema introspection cannot reject transformations/private behavior reliably, stop at that decision gate instead of exporting misleading schemas. Completion: legal fixtures green, explicit wrong type/port/schema/ID/side-effect tests fail as intended; both browser and server validator use one model implementation. Cycle refusal belongs to graph-profile validation; runtime must not require topological batch execution. Record JSON representation ID in descriptors and reject unsupported IDs before factories.

### T5 — real typed network runtime (M3)

Refs R5–R7,R10/C12–C15,C34,C49. Prereq T4. Allowed src/runtime.ts, root exports and runtime/contract-runtime tests. Own fresh process/channel/context creation, ingress/egress, runtime schema validation, failure/cancel base handling and drain. Public input schema refusal stays usable; invalid internal output fails before bad downstream effect. No second interpreter, per-packet process recreation or shared network globals. Completion: 3/5/7 pipeline, two independent runs, factory/sync/async errors/no retry and contract-bypass tests through public package entry. T7 adds lifecycle hardening/proofs to this same orchestrator.

### T6 — typed composition (M3)

Refs R6,R10/C16–C20. Prereq T5. Allowed src/components/**, root exports and components tests/type fixtures. Implement contract-aware map/filter/broadcast/merge/joinByKey exactly as section6, including composed join output schema/outputId and partial fanout policy. Prove real-runtime bounded branch backpressure, keyed interleaving, incomplete/duplicate/capacity/key reuse. No schema-subtyping solver, automatic fanout or retry. Completion: concrete multi-packet outcomes and type fixtures, not only mocked contexts.

### T7 — terminal lifecycle and diagnostics (M4)

Refs R7,R8,R15/C21–C25,C52. Prereq T6. Allowed src/{runtime,diagnostics,channel,inspection}.ts, root exports, model inspection types and lifecycle/diagnostic/inspection tests. First-terminal semantics, pre-abort, timeout, iterator abandonment, unawaited send, late user promise handling and exact immutable bounded snapshot. Completion: controlled wait/cancel/error receipts, owned timers/listeners/waits return to baseline. No waiting forever for arbitrary user handler after cancel or forced-interrupt claim. Completed nodes remain completed when peers fail; late successes cannot change result.

### T8 — function authoring and public test SDK (M4)

Refs R11,R12/I9/C35–C39 plus C32 function-return type case and C50 author recipe. Prereq T7. Allowed src/function.ts, src/testing/**, root/testing exports, docs/node-authoring.md, templates/node/** and authoring/testing SDK/type tests. defineFunction wraps the same process/send contract; public runNode/runGraph validate via production compiler/runtime. Implement feeder/collector/deadline/output bounds and cleanup of every failure path. Template includes immutable dependency factory, contract fixtures and stateless-vs-create-local distinction. Use fake I/O with exact cardinality and AbortSignal assertions. Completion: both user-friendly API and raw advanced API tested; wrong output, timeout and collector overflow surfaced without swallowed failure/retained waiters. Framework architecture tests still use direct channel/runtime controls for precise interleavings; SDK does not replace them.

### T9 — framework integration and sustained bounded load (M5)

Refs R1–R12/C26,C27 plus C00–C39. Prereq T2,T8. Allowed test/integration.test.js, test/stress.test.js, benchmark/**, bounded fixes to failing src symbols and journal. Benchmark100000 packets through3 maps and broadcast→two maps→join, capacities1/16; exact sums/counts/keys, occupancy<=capacity, one pending send/read per endpoint. Report throughput and sampled heap with hardware/runtime, not flaky timing thresholds. Repeat100 start/finish/cancel cycles, resource counters back to baseline. Whole-network success/rejection/failure/late branch/cancel traces use actual exports. Code/test changes may fix evidenced implementation faults, not silently amend SC-FBP-4. Completion: condition proofs plus per-file coverage reconciled; no mocked-only integration claim.

### T10 — clean package, author recipes and cookbook (M5)

Refs R9,R11,R12,R14/C28–C30,C40,C45,C50. Prereq T9. Allowed README/guide/migration/runtime/node-author docs, templates, examples/**, server/src legacy example removal/relocation, package files/lock, .github/workflows/ci.yml and package/examples/recipe/type tests. Keep only dispatcher shim at old path; move retained scanner/loader to examples/legacy, fix reject fallthrough and label heuristic. Remove request/fs-shim/cli-color consumers/dependencies; Zod remains intentional production dependency. fetch example uses localhost, response.ok, signal and explicit errors. No import-triggered scanning/network/logging.

Pack allowlist: dist/, src/ for source-map debugging, shim, LICENSE, public runtime/guide/migration/authoring docs, examples/, templates/. Exclude plans/feedback/.DS_Store/private env/test/build artifacts other than dist. Install tarball into clean JS and TS consumers; prove import/require/declarations, standalone function recipe, graph harness and all offline cookbooks. No repo path aliases or automatic TypeScript transpilation in consuming Next site. Add ISC license matching existing author metadata. CI on pinned latest LTS, Linux/macOS/Windows for core build/tests; Next fixture proof T11 on Linux. Completion: actual archive/manifest and public consumer evidence; no npm publish/push/commit.

### T11 — Next.js consumer and read-only inspector (M6)

Refs R13,R15/I8/C41–C44,C46,C53,C54. Prereq T10. Allowed fixtures/next-consumer/** (own package/lock/tsconfig), scripts/test-next.mjs, test/next/consumer.test.js, docs/nextjs.md and CI integration. Pin current stable Next/compatible React/Playwright dev dependencies during task and record exact matrix. Fixture installs packed framework; no alias to src. Implement fixed numeric POST route, server-only registry, client-safe metadata/inspector and request abort/state behavior in section7. Use production next build/start, localhost HTTP and Playwright keyboard/selection/error fixtures; inspect client assets for canary and node:* imports. Repeat authoritative server validation even if client catalog claims broader contract. Request tests never accept arbitrary submitted JS or arbitrary graph execution.

Completion: packed package works in Next production build, HTTP statuses/body/effect cardinality exact, client import graph clean, inspector has readable port/connection text and accessible controls, no module-global run/session Map. Template sample docs explicitly limit request lifetime; long-lived durable hosting excluded. No pretense that this proves user's existing site's versions or authentication. If package needs transpilePackages/Node polyfills in browser, return to packaging contract rather than hide integration failure with site-specific workaround.

### T12 — final integrated readiness and handoff (M7)

Refs R1–R15/C47–C54. Prereq T11. Allowed acceptance tests/journal and narrow fixes to evidenced package/fixture integration defects; no new product features. Compare candidate/dirty scope to baseline identities, verify latest LTS pin, run section11 gates on one recorded build/pack revision and reuse applicable earlier outputs. Reject stale fixture tarball or documentation from r1. Trace consumer recipe→typed/runtime contract→graph→server execution→safe client metadata, plus schema/cancel/failure refusal cases. Completion: separate implementation, behavioral proof, quality/coverage and publication statuses; all unresolved gaps listed. Does not create/publish npm package or authorize external messages.

## 11. Executable verification proposal and baseline policy

Existing command confirmed only npm test placeholder exit1. T1 must create and verify the following scripts; not claimed runnable before implementation:

```json
{
  "build": "node scripts/build.mjs",
  "typecheck": "tsc -p tsconfig.check.json --noEmit && tsc -p test/types/tsconfig.json --noEmit",
  "lint": "eslint --no-error-on-unmatched-pattern src server/src/eventDispatcher.js examples test scripts benchmark",
  "check": "npm run build && npm run typecheck && npm run lint",
  "test": "npm run build && node --test test/*.test.js",
  "test:stress": "node --test test/stress.test.js",
  "test:package": "node --test test/package.test.js test/author-recipe.test.js",
  "coverage": "npm run build && c8 node --test test/*.test.js && node scripts/coverage-thresholds.mjs",
  "test:next": "node scripts/test-next.mjs",
  "main": "node examples/pipeline.cjs"
}
```

Tests always import built files. Default test/*.test.js tests are offline and do not launch Next. Next HTTP assertions live at test/next/consumer.test.js, browser assertions in fixture e2e/. scripts/test-next.mjs builds/packs root, installs fixture from that exact tarball, runs fixture typecheck and production build/start, invokes HTTP assertions and Playwright, and finally closes its owned server on every exit. No environment-gated skip counts as integration proof. T11 installs and verifies the fixture scripts/selectors. Source-scoped checks avoid rerunning expensive full fixture until relevant boundaries change.

Build layout from section4 is authoritative. TS tests for public types consume generated declarations, not source path aliases; source check uses strict noEmit. Generated declarations have no executable coverage denominator. `.c8rc.json`: all=true, src includes src plus shim, extension [.ts,.js], source-map remapping enabled, include src/**/*.ts plus built JS paths and shim so remapped TS is retained, exclude tests/fixtures/examples/benchmarks/declarations, reporters json/text/html. T1 C31 must verify never-imported TS counts as0% and no double-counted source/generated files remain in final coverage map. T1 locks proven config and records it; if c8 cannot meet that denominator, block coverage acceptance and amend tooling rather than silently omit files. Per-file lines/statements/branches each>=95% for all new/changed production TS, /model, /testing and shim; ledger must prove100% of meaningful reachable changed conditions. Inspect uncovered regions with exact source-map locations, evidence exceptions individually, never invent test fixtures or relax metrics to inflate coverage. Zod/Next vendor code excluded, framework schema wrapper included.

Core acceptance: npm ci; npm run check; npm test; npm run coverage; npm run test:package; npm pack --dry-run. Stress suite already in default tests, repeat only for milestone load receipt or invalidated evidence. Next acceptance: npm run test:next (fixture install, typecheck, next build, production HTTP, browser tests); it includes only local mock services, no external provider effects. npm audit --omit=dev checks resolved production dependencies before publication; classify actual findings rather than bypass hooks. Per-command exit receipts; no subsequent success masking earlier failure. Before a later user-authorized release, ensure generated archives/CI version pins match candidate.

Baseline: T0 captures known placeholder/characterization debt; new build/type/lint/coverage have no existing equivalent and must independently pass. Original v24 observation is not the target. Keep immutable records/index and journal command/revision/dirty-scope/tool/lock identity, expected/actual behavioral red/green and local output paths. Missing install/network/tool evidence is unavailable, not passed; failed checks report failed. TS wrong-port fixtures use a meaningful @ts-expect-error check, not missing modules. Helpers don't substitute for actual channel concurrency/integration. Next fixture is new UI: keyboard/accessible names/error/loading/current-result assertions apply; no supplied Figma or production visual-design fidelity requirement. No database tests because no persistence introduced.

Publication remains not-requested. This plan authorizes no commits/push/npm publish/reviewer messages. Planning writes only this revision/archive and feedback. Implementation readiness is a proposed decision, not a claim that source or tests exist.

## 12. Historical r4 readiness review — r5 release status is in SP1

| Gate | Proposal verdict | Concrete content evidence |
| --- | --- | --- |
| G1 interfaces | PASS | §§4–7: exact module split, schema subset, contract IDs, typed failure fixtures, packet/runtime/harness/HTTP shapes. |
| G2 ownership | PASS | §10 DAG; T4 contract/model, T5 sole runtime, T8 wrappers, T11 consumer; no circular stage dependency. |
| G3 conditions | PASS | C00–C54 concrete fixture/order/assertion/test/owner; C32–C54 cover new user scope, extension seams and visualization, types not confused with runtime validation. |
| G4 effects/recovery | PASS within explicit scope | §§6–7 drain/cancel/late effects, no retry/rollback/durability, bounded request test, no process-global runs. |
| G5 bounded tasks | PASS | T0–T12 files, prerequisites, behavior, red/proof, completion and shared return-to-planning triggers. |
| G6 verification | PASS as proposal | §11 exact future command/build paths, T0 baseline, T1 C31 denominator proof; tool installation and Next execution not falsely marked done. |
| G7 composition | PASS | T9 integrated framework, T10 packed consumers, T11 actual Next/client boundary, T12 shared-candidate closure. |

Two-executor check: T0 must choose LTS not Current; T1 generated declarations not handwritten JS-first types; T2 preserves this repo's emit signature; T3 cannot drop full queue or confuse null/EOF; T4 cannot equate TS labels with runtime enforcement or trust mismatched same-ID schema; T5 cannot share per-run queues or admit bad output; T6 cannot zip unrelated keys; T7 cannot wait forever for an uncooperative promise after cancel; T8 cannot silently truncate output or implement a fake executor; T9 cannot replace real channel integration with mocks; T10 cannot rely on repo source imports; T11 cannot serialize registry/handlers or depend on an immortal Next process; T12 cannot combine stale tarball/UI and new source evidence. Equivalent code organization that preserves these choices is allowed.

Success trace: authored schema→inferred TS handler→descriptor export→typed or JSON graph validation→server registry compile→input contract/packet validation→bounded process→output validation→keyed graph result→harness drains→Next JSON response; client consumes only model/result. Named owners T4→T5→T8/T9→T10→T11/T12. Rejection trace: bad port/schema graph→no factory; TS wrong return→build fails; bypass TS wrong return→OUTPUT_CONTRACT/no downstream effect; bad request→400/no handler; slow branch→backpressure; timeout→settle/suppress late send; provider earlier effect remains caller-owned. Browser canary proves non-leakage, not just type-only intent.

Reviewable product decisions: TypeScript now; Zod runtime contract dependency; latest LTS; initially acyclic topology and JSON public admission with explicit expansion seams; Node execution with browser-safe model; fixed local Next inspector demo, future editor separate; production-runtime public test harness. These are proposed choices, not historical requirements or implied implementation approval. No user answer is needed to finish the plan. If review changes these choices, revise SC-FBP-4 before the affected implementation task starts. Section13 future features remain unapproved horizon work, with only R14 seams included now. T4 has an explicit verification stop if installed schema traversal cannot honor the chosen subset; T0/T1/T11 likewise must prove target tools/runtime/Next rather than assume availability.

## 13. Expansion horizon: richer packets, controlled feedback and agent-built applications

This section records architectural direction, not approval to implement these future profiles. No stub codec registry, pretend cycle-support flag or agent orchestration engine is required now. R14/C48–C50 preserve concrete seams in the initial implementation; the later semantics below require dedicated proposals and executable proofs before activation.

### Rich values: distinguish runtime data from transport representation

Future goals include binary data/typed arrays, dates, maps/sets, domain value objects and selected custom class instances. A runtime contract's payload type must not be permanently limited to Json. The packet envelope, ports and channels therefore remain generic; initial packet factory, schema adapter and public send enforce the JSON profile. The graph definition/catalog stays serializable metadata even when a future in-process packet contains a rich value. Runtime packet values never need to be embedded in GraphSpec.

Current seam: keep JSON validation, clone/freeze, size accounting and schema export at packet/contract admission boundaries, outside the generic FIFO/scheduling machinery. Representation ID participates in compatibility. Do not scatter JSON.stringify or Object.freeze assumptions through channel/runtime code. A type parameter or unchecked cast does not activate support for a value; unsupported public packets still fail clearly in the first release.

Future profile decisions must settle each of these independently:

- Validation: nominal class/type identity versus structural validation, including validators in separately loaded module copies.
- Ownership: immutable value, explicit copy, exclusive transfer or deliberate reference sharing. Freezing an object is not a promise that its internal resources or referenced storage cannot change.
- Cloning: preserve prototype/invariants through an approved domain copier, or reject. Do not pretend JSON roundtrip or a generic clone preserves arbitrary custom behavior.
- Boundaries: values valid in one process may not cross workers, browsers, remote transports or persistent stores. Require explicit versioned encoding/decoding when crossing those boundaries; validate decoded output before delivery.
- Limits/resources: byte accounting for buffers versus opaque objects; stream/file/GPU/database handles need explicit lifecycle/disposal and cannot be treated as ordinary replayable data.
- Inspection: metadata and safe redacted previews, never arbitrary getter/method invocation or implicit serialization of custom objects for UI/logging.

Suggested later sequence: typed binary/byte packets with explicit copy/transfer rules; well-defined domain value adapters; custom in-process instances with explicit ownership rules; separately versioned worker/remote/persistence codecs. These are distinct deliverables, not a single `allowAnything` option. Acceptance must include fan-out isolation, mutation after send, failed decode, oversized data, resource cleanup and unavailable-codec refusal. The JSON profile remains backward compatible.

### Controlled cyclic graphs: feedback is an execution protocol

A feedback edge alone does not specify a safe loop. Future support should start with explicitly bounded iterative subgraphs, such as refine→evaluate→accept-or-feedback, rather than allowing every arbitrary cycle. Initial compiler refuses all cycles; the runtime already starts independent stream processes and does not execute the graph as a one-shot topological batch.

A later loop contract must define bootstrap/seed tokens, explicit feedback connections and buffer ownership, iteration/correlation identity, maximum rounds/time/resource budget, convergence/exit rule, and what happens when exit and budget collide. Distinguish computational iteration from retrying a failed external effect: feedback never grants automatic replay of a non-idempotent call.

Termination cannot reuse “wait for every input EOF” unchanged inside a closed feedback region: a dedicated loop owner must decide when to stop feeding, drain or discard, close loop channels and release state. A policy must address all participants blocked on empty/full buffers; a timer alone is not proof of deadlock freedom. Cancellation, nested invocation, interleaved correlation keys and final-versus-intermediate outputs need observable contracts. Graph/catalog versioning must let old validators reject unsupported loop profiles before effects.

First investigation fixture: seed value0, increment and assess, accept3; record3 iterations and one final result. Complementary fixtures: never converges→explicit iteration-limit outcome; no bootstrap→compile refusal; tiny buffers→documented progress or explicit deadlock refusal; cancellation→all waits released; side-effecting node cannot be silently replayed. These are proposed future acceptance scenarios, not tests delivered by T0–T12. Do not expose a permissive cycles=true option now.

### Optional durable execution add-on

User roadmap direction (2026-10-29): selected graphs should eventually use a database/persistent-store-backed host to checkpoint progress and resume from persisted evidence after supported failures. Most graphs remain in-memory with no persistence dependency. The canonical future scope, recovery assumptions, uncertain external effects and milestone proofs are recorded in [F01 — optional durable execution](../architecture/roadmap.md). This adds no implementation slice, durable flag or store protocol to S00–S19; it is not a promise that every failure or external effect is automatically recoverable.

### Agent-built applications: graph artifacts as executable application designs

The long-term opportunity is for humans and agents to work with a shared, inspectable application artifact: versioned components/contracts, explicit data dependencies, composable subgraphs, bounded effects and a testable graph. An agent could discover suitable nodes, draft a graph, validate it, generate fixtures, run it with fake services, inspect failures and propose a reviewed revision. Those are architecture goals, not claims of autonomous correctness.

The present foundation contributes stable component/version IDs, schemas, examples, exact dependency interfaces, serializable graph/catalog, public compile/test APIs and safe diagnostics. Author recipes describe effects and required dependencies as developer-readable metadata; metadata describes a capability but does not grant it. Compiler still accepts only trusted registered components and supported representations. No natural-language instruction, schema description or generated graph can add a provider credential or execute an unregistered module.

Later plans can add machine-readable effect/capability manifests with enforcement, bounded subgraph composition, graph diff/version/migration tooling, graph-level reusable contract tests, simulation/sandbox hosts, execution traces with controlled retention, explicit deployment targets and resource budgets. Agent-assisted generation can sit above those APIs without embedding an LLM/provider dependency in the core runtime. Introduce enforcement before claiming a capability manifest constrains execution.

A useful future workflow is: discover catalog → propose typed graph and expected outcomes → structural/contract validation → fixture/simulation run → inspect graph diff/effects/budgets → authorize applicable external effects → execute in the selected host → inspect outcomes. Publication, credentials, untrusted code execution and durable operation ownership remain explicit boundaries. Local trusted pure computations need not inherit an unnecessary approval ceremony.

Extension acceptance principle: every new power must have a declared contract, a bounded execution/lifecycle model and a test strategy. The aim is broader composition and better inspectability while keeping human and agent authors working against the same guarantees. Rich packets, loops, durable execution and agent capabilities are related possibilities, but none implies the others are already solved.

## 14. Base-system graphical inspection — required now

**R15 is current scope, not only a future editor aspiration.** Preserve and improve the original event-map idea: the installed framework exposes graph wiring and event subscription topology through structured data and a diagram-export utility. The Next sample demonstrates a real read-only graphic. This supplements section7 and supersedes its earlier table-only interpretation. It does not require a particular editor/canvas library in the runtime.

### Relationship coverage and provenance

Show graphs, node instances, named input/output ports and connections; for registered runs overlay existing status/queue counters. Show each registered dispatcher, event, active subscriber registration and explicitly declared publisher. Use separate relationship kinds `connects`, `publishes`, `subscribes`; publisher edges have provenance `declared`, subscription edges `active`, graph edges `defined`. This prevents a source declaration from being mistaken for observed execution or proof of delivery. Multiple graphs/dispatchers coexist in one view without merging coincidentally equal local names.

“All” means all graphs/dispatchers explicitly registered in an inspection scope, including graphs without a running instance. No hidden global catalog, source-code execution, AST inference of arbitrary dynamic emit calls, or automatic discovery of graphs held in unrelated application variables. Legacy callback names can be displayed, but absent owner attribution is visibly `unassigned`; never guess the originating module. Applications can register the complete inventory they want to expose. Original string-scanning eventNodeMap remains a historical heuristic, not the authoritative relationship source.

### Root inspection interfaces

```ts
type OwnerMetadata = {ownerId:string};
// Existing two-argument on/once remain valid and retain undefined return value.
dispatcher.on(event:string,callback:Function,metadata?:OwnerMetadata):void;
dispatcher.once(event:string,callback:Function,metadata?:OwnerMetadata):void;
dispatcher.declarePublisher(ownerId:string,event:string):()=>void;
dispatcher.inspect():DispatcherTopology;
createInspectionScope():InspectionScope;
// scope methods:
scope.addGraph(sourceId:string,source:{
  spec:GraphSpec;catalog:Catalog;run?:NetworkRun;
}):()=>void;
scope.addDispatcher(sourceId:string,dispatcher:Dispatcher):()=>void;
scope.snapshot():InspectionSnapshot;
// browser-safe /model utility:
toMermaid(snapshot:InspectionSnapshot):string;
```

Public Function notation above means the same callable listener type as existing dispatcher declarations, not executable function serialization. inspect returns detached immutable metadata: version1, events[{name}], subscribers[{id,event,ownerId:null|string,callbackName,once}], publishers[{id,event,ownerId,provenance:'declared'}]. Subscriber IDs allocated monotonically per dispatcher registration; duplicates distinct. Publisher declaration IDs also monotonic and each disposer removes only its declaration. Order by registration sequence; events are union of currently declared publishers and active subscriptions, sorted by name. No history accumulated by emitting. Inspection remains independent of logger enabled state. Once removal is visible before its callback executes; explicit unsubscribe/cleanup updates current inspection. Repeated disposal harmless. Anonymous callbackName is `anonymous`, not inferred source. Ownership names use the existing nonempty128-character identifier rule; event-name behavior remains section8.

Scope validates/snapshots graph/catalog on registration using shared model validation; invalid source throws INVALID_GRAPH with zero registration. Optional run must be proven to come from that exact graph spec/catalog contract identity before association, otherwise RUN_GRAPH_MISMATCH; T5/T7 retain opaque compiled identity internally to support this assertion. Dispatcher shape validated before registration. sourceId nonempty<=128; duplicate within scope throws DUPLICATE_SOURCE; same ID in separate scope is valid. Graph source stores immutable definitions plus optional run handle only locally; no executable handle survives snapshot. Removal disposer is idempotent and releases scope references, never cancels an application-owned run or unsubscribes its application listeners. No module-global singleton scope. Inventory scales with explicit live registrations; no per-packet relationship recording. App owns unregistering sources when no longer needed.

InspectionSnapshot is immutable JSON: {version:1,sources:[{id,kind:'graph',spec,catalog,run:Snapshot|null}|{id,kind:'dispatcher',topology:DispatcherTopology}]}. Sources follow insertion order. Each scope.snapshot samples currently registered sources synchronously; it is a point-in-time view, not a durable audit or cross-process atomic snapshot. Every rendered/exported identifier is namespaced by source, entity kind and local ID. Repeated snapshot without changes yields same relationships; run IDs/counters may change only with actual execution. No payload values, validators, handler source, service objects, credentials or live callback references. Descriptions/examples remain explicitly public author data subject to section5 rules.

### Diagram utility and graphical sample

/model toMermaid emits a `flowchart LR` with one subgraph per source, node/port/event/owner/subscriber vertices and directed edges for the three relationship kinds. Assign deterministic synthetic IDs from source/entity order, never interpolate user identifiers as Mermaid code. Escape labels; remove active HTML/directive content and encode line breaks. Test hostile labels. Structured snapshot is authoritative; Mermaid text is a convenient export, not a second graph interpretation or layout contract. No dependency on Mermaid execution in runtime and no eval/HTML rendering of returned text.

T11 Next inspector renders read-only SVG directly from the same structured snapshot, using simple deterministic rows/columns, labeled shapes and arrowed connections; no elaborate automatic layout promise. Include source selector, relationship legend and node/port/event details. Every shown relationship has an accessible text equivalent; keyboard controls have names and visible selected state. Styles must distinguish defined/declared versus active relationships without relying solely on color. Initial rendering reads a server-provided safe snapshot; subsequent relationship changes update automatically without manual refresh. Fixture contains two graph definitions (one may have no run) and one dispatcher; subscribe/once/unsubscribe/publisher changes update both graphic and accessible text. Show interrupted/stale connection status, reconnect automatically and resynchronize from an authoritative snapshot; reject obsolete source generations and out-of-order updates. Bound pending updates and release owned resources on teardown. No unbounded cross-request run store is introduced to enable the demo. [S18 LV1](fbp-slices/18-graphical-inspector-plan.md#lv1--automatic-relationship-updates-user-direction-2026-10-31) supersedes the original explicit-refresh workflow and requires a producer/transport/lifetime design checkpoint before implementation; existing snapshot APIs do not already provide notifications.

T2 owns authoritative dispatcher topology; T4 owns browser-safe types/export with stub-free data fixtures; T7 owns root scope/graph-run identity association; T11 owns graphic integration; T12 accepts C51–C54. Scope/export additions are included in package /model/root type/coverage gates. Full graph editing, arbitrary source discovery and streaming multi-process observability remain future work, while the installed base already supplies the information and utility required to draw the known system.


## 15. Agent-executable branch partition SP1

[Start at INDEX.md](fbp-slices/INDEX.md); [machine-readable order](fbp-slices/manifest.json); [shared branch execution contract](fbp-slices/shared-execution.md). Twenty numbered feature/task plans S00–S19 each name one codex/fbp-NN-* branch, predecessor/base/next, recognizable story, exact files/symbols, internal task IDs, proof conditions, executable command scopes, exclusions and stop/handoff criteria.

Order is strict by default: previous slice must be accepted and merged into master before creating the next branch from updated master. A completed but unmerged branch is not a predecessor base. The T labels above group original work for traceability and no longer define execution size or independent branch ownership. S08 owns the sole runtime, S06 the compiler, S12 inspection, S14 public harness, S17 Next server boundary and S18 graphical UI; SP1 lists every handoff and final proof owner.

S00 is the explicit decision gate for packet/job/correlation/lineage identity and lookup expectations raised after r4. IC1-r2 and C55–C65 now specify the proposal; until human acceptance is recorded, S04–S19 remain blocked-on-decision; their saved scope and inherited contracts are planning proposals rather than permission to improvise metadata. S01–S03 can be reviewed independently of that choice; default ordering remains S00 first. No new identity semantics, result store, source implementation or baseline/test success is claimed by slicing.

Historical r5 partitioning was planning-only and left every branch not-started. The current S00 execution/submission authority and status are recorded in §16 and its journal. All merge SHAs remain null; no successor has started.


## 16. S00 identity amendment IC1-r2 — review pending

The exact envelope/factory/helper/join/lookup proposal is [IC1-r2](fbp-identity-contract.md). [Execution index](fbp-foundation-execution.md) links the actual work; [S00 execution receipt](fbp-slices/S00-execution.md) records the design walkthrough and documentation checks, not runtime implementation. S00.A–C design preparation is complete under the user’s2026-10-29 execution/submission request; user acceptance of the newly specified identity semantics remains pending. Existing C00–C54 stay preserved; C55–C65 add concrete identity proof obligations and downstream owners.

SP1-r2 and the affected slice r2 plans carry the same proposed types and propagation rules. No S04–S19 readiness gate is released merely by writing or submitting this proposal. S01 remains the next feature only after actual S00 review/merge.

## Backend evaluation display direction — 2026-10-30

User requested that the display echo actual backend/runtime validation. S05 supplies internal safe code/path issues from the authoritative validator. S08/S09 must carry appropriate node/port/graph-contract revision and lifecycle identity; S12/S17/S18 must expose/display bounded current results, use safe messages and suppress obsolete responses. Freeze report transport/lifetime before those owning tasks; the old minimal Snapshot does not already contain these fields. Raw rejected values, validator/service objects or credentials are not implicitly published. C34/C43/C44/C54 retain their owners and include applicable producer/consumer/UI assertions. No later implementation is authorized during S05.

### S08 backend-verdict protocol handoff — 2026-10-30

S08 freezes the bounded runtime validation report and per-run immutable definition association in [the runtime guide](../architecture/runtime.md) and [execution receipt](fbp-slices/S08-execution.md). RuntimeValidationError.validation and bounded diagnostic validation details carry actual S05 code/path verdicts, run/node/port/direction and component/contract version attribution without rejected values. runId binds the exact in-memory graph definition; future application transport still supplies durable graph-release/request identity and current-response UI policy. S09/S12/S17/S18 consume this protocol rather than invent a second payload evaluator or assume historical diagnostics describe current form state. No endpoint or rendered display is delivered by S08.

## NT1-r2 priority extension — 2026-10-30

User inserted S09A and S09B after S09 and before original S10. [NT1](fbp-node-timeout-contract.md) owns NT01–NT18 as an additive authoritative condition ledger, plus operation-policy producer/consumer signatures. Default retries remain0; explicitly configured1–5 retries repeat only scoped attempts, never packet delivery or process creation. Existing C00–C65/IC1 constraints remain, with retry behavior amended only by NT1's explicit opt-in. S13 retains cookbook/aggregate proof and reuses S09B's adapter.

S18 execution checkpoint (2026-10-31): [LV2](fbp-slices/18-graphical-inspector-plan.md#lv2--execution-design-checkpoint-2026-10-31) resolves the producer/consumer ownership required by C54’s automatic-update amendment. S18 adds a bounded, disposable dispatcher topology observer because S03/S12 only sampled state, then owns safe request-local SSE delivery and the read-only browser view. S12 scope remains a sampler; graph/run notifications are explicitly wired by the host, not discovered globally. S18’s producer tests and production browser/cleanup/reconnect proofs extend the original presentation-only allowance; no editor, payload history or durable session host is authorized.
