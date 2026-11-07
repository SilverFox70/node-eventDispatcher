# NodeDispatcher: a foundation for flow-based applications

*every result can be explained, every node can be tested alone, and every change can be traced.*

NodeDispatcher aims to make asynchronous application behavior inspectable, explainable and testable by design. Typed nodes and explicit data flows provide the structure for understanding results, diagnosing failures and testing changes. The inspector shows observed execution and traces retained packet lineage and declared decision reasons. Reviewed runs can become offline regression tests. The same reviewed fixture can compare behavior across revisions. Evidence that was not captured cannot be reconstructed, and a graph cannot explain private reasoning inside arbitrary node code.

This project is rebuilding a small, historical JavaScript event dispatcher into a typed **flow-based programming (FBP) library** for Node.js. The aim is to make applications from reusable nodes with explicit input/output contracts, connected by bounded data streams.

The graph describes how work fits together. Each node remains an ordinary, understandable function or process that a human or coding agent can write and test. The library is intended to install alongside an application—including a Next.js site—rather than require an application to become a hosted workflow product.

## What earthly use is it?

Applications often need to split a request into several independent operations, wait for different results, combine them correctly and show progress. That coordination tends to become scattered callbacks, queues and state flags. A graph can make those relationships explicit and reusable.

Planned examples include:

- **Account setup:** validate a request, provision independent services, collate their results and update the UI as work finishes.
- **Data processing:** parse records, enrich them through asynchronous lookups, filter them and combine results without overwhelming a slow downstream service.
- **Background orchestration:** coordinate projections, notifications or integrations using application-supplied business identities and effect policies.
- **Game services:** organize asynchronous game/server events and background jobs. Deterministic frame/tick execution needs a separate future execution profile.

The current runtime executes node graphs; these application examples still need their own domain nodes and integration tests. Recovery after process loss remains a future optional extension.

## Current progress

**Foundation implemented and merged through S19.** S19/PR31 completed adoption acceptance. The framework runs typed asynchronous flows from an installed package, with a Next.js consumer, live packet inspection, node input/output dialogs and selectable output stages. The optional live PokéAPI demo and owned HTTP stress harness exercise real network I/O. S19 reconciled the complete developer story and its proof; no npm release or production deployment is claimed.

S21–S24 are merged, including [correlated diagnostics](docs/architecture/diagnostic-records.md), live capture controls and bounded export. S24A added [decision evidence](docs/architecture/decision-evidence.md). S24B adds [causal inspection](docs/architecture/causal-inspection.md) for joined outputs and intentionally dropped inputs. Try **Eligibility and parallel results** in the live diagnostics demo. S24C adds [offline regression fixture export](docs/node-authoring.md#turn-a-reviewed-run-into-a-regression-test) through the testing API. S24D adds [fixed-fixture revision comparison](docs/node-authoring.md#compare-two-revisions-on-one-reviewed-fixture). S24E adds a [product content review demo](docs/nextjs.md#product-content-review). S24F compares it against [plain TypeScript](docs/content-review-comparison.md).

You can now build and run real, typed, asynchronous pipelines locally. The inspector now visualizes registered graphs and event relationships; editing and optional durable execution remain on the roadmap below. You can now try the small Next.js example with `npm run demo:next`; it runs a production build at **http://localhost:54545**. Open **http://localhost:54545/diagnostics** for live capture controls, or follow **Inspect graphs and events** to watch packets and subscriptions change without refreshing. Choose **Run live Pokémon example** for public API responses; `npm run stress:http` exercises192 requests against our owned loopback service through the full production acceptance suite.

## What exists in this revision

- Pinned Node LTS/npm, strict TypeScript, ESM/CommonJS builds and generated declarations.
- Independent synchronous event dispatchers, with an optional shared singleton and a legacy compatibility import.
- Immutable inspection metadata for active subscriptions, optional owners and explicitly declared publishers, plus scoped graph/run inventory and safe Mermaid export.
- Typed reusable component definitions, ordinary-function adapters, Zod-backed runtime contracts, safe catalog metadata and a checked dependency-injection recipe.
- Immutable JSON packets with separate packet/job identities, immediate-parent lineage and optional correlation keys.
- Internal bounded FIFO channels with backpressure, close/drain and abort semantics, used by the streaming runtime.
- Typed graph construction and authoritative compilation, isolated streaming runs, bounded duplicate protection, cancellation, deadlines and safe diagnostics.
- Serial map/filter callbacks, explicit branching, bounded readiness-ordered merging and job/key result collation.
- Typed public node/graph test helpers, offline tests, packed-package consumer/type checks and source-mapped per-file coverage gates.
- Full-flow failure/cleanup proofs and reproducible 100,000-packet load measurements.

The [slice index](https://github.com/SilverFox70/node-eventDispatcher/blob/master/docs/cursor_plans/fbp-slices/INDEX.md) records review/merge status; a feature on a review branch is not automatically released. The package name remains `event-driven-design`. No new npm release is claimed here.

## Run a graph demo

From this directory with the project’s pinned Node/npm versions:

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

The first doubles1/2/3/4 and filters the results to6/8. The second splits one account request into independent asynchronous profile/settings operations, then brings their separate results into one stream. The third collates those branches into one typed result. The fourth prints a graph/event diagram inventory. The fifth demonstrates a service-injected JavaScript lookup with a local fake service. The sixth tests one node and a complete graph using the public testing helpers. The seventh demonstrates external feeding, backpressure and cancellation. All run offline. See [examples and expected output](examples/README.md).

For the Next.js application at `http://localhost:54545`, run `npm run demo:next` (Ctrl+C to stop) or `npm run test:next` for production HTTP/browser acceptance. See [the Next.js guide](https://github.com/SilverFox70/node-eventDispatcher/blob/master/docs/nextjs.md). Dependency/browser installation is setup; demo requests use local fakes.

Reusable node definitions can now declare typed per-instance configuration. The compiler validates each binding before any node starts, and the same configuration works with the isolated node test harness. See the [application guide](docs/guide.md#configure-each-node-instance).

The optional editor is available in the Next demo. Choose **Open the graph editor** from the demo home page, or visit `http://localhost:54545/editor`. Add Inventory Alert nodes, drag either card to move it, and connect its output to another Alert’s input. The node details offer keyboard movement and deletion. Undo restores removed nodes and wires. The draft lives on the current page. Select a configured node to edit its settings, then choose **Validate draft** for backend feedback on settings and wiring. Open the separate sample draft from the test walkthrough, validate it, load fixture inputs, and choose **Run test** to see collated output and packet lineage. Choose **Load slow-branch input** and **Capture test payloads** to follow a job through the live view. Select **Join by key** before running to watch the units arrive while the label is still pending. Select any node to inspect its packets, or choose **Final outputs**. The view reconnects without reloading the draft. For a guided build from scratch, open **First-run walkthrough** and use its separate practice draft.

## Try the current APIs

After building this checkout, or installing its locally packed tarball:

```js
const { createDispatcher, packet, derivePacket } = require('event-driven-design');

const events = createDispatcher();
events.once('ready', jobId => console.log(`Ready: ${jobId}`));

const request = packet({ accountId: 'account-123' }, {
  jobId: 'signup-456',
  key: 'account-123@v1'
});
const result = derivePacket({ validated: true }, [request]);

events.emit('ready', [result.jobId]);
```

This demonstrates the dispatcher and packet factories, not a graph scheduler. Event delivery is synchronous; packet movement in the streaming graph runtime is asynchronous. See the [dispatcher API/migration guide](https://github.com/SilverFox70/node-eventDispatcher/blob/master/docs/architecture/dispatcher.md) and [identity contract](https://github.com/SilverFox70/node-eventDispatcher/blob/master/docs/cursor_plans/fbp-identity-contract.md).

## Build and verify

Use the exact project versions in `.nvmrc`, `.node-version` and `package.json`: Node **26.13.0 LTS**, npm **11.20.0**. A version manager can select them without changing your global default.

```sh
npm ci
npm run check
npm test
npm run coverage
npm run test:package
```

`check` builds both distributions, checks source and consumer declarations, and runs lint. Tests use local fixtures; `npm run main` runs the offline pipeline demo. The packed-consumer gate installs a real tarball in temporary projects and runs the template/examples there. To prepare a local installable artifact, build first and run `npm pack`, then install the resulting `.tgz` into the consuming project.

To inspect sustained-load behavior after building, run `node benchmark/throughput.cjs`. It verifies two graph shapes at capacities 1 and 16 and reports throughput, sampled heap and queue bounds. These are machine-specific observations, not performance guarantees. See [benchmark instructions](https://github.com/SilverFox70/node-eventDispatcher/blob/master/benchmark/README.md) for settings and focused reliability tests.

## Roadmap

| Stage | Outcome |
| --- | --- |
| S00–S05: foundation and ports | Identity contracts, modern tooling, event dispatch/inspection, packets, bounded transport and typed node contracts |
| S06–S09: graph execution | Typed/runtime-validated node ports, one graph validator/compiler, typed graph construction and an isolated runtime with cancellation and lifecycle management |
| S09A–S09B: node operations | Per-operation deadlines, bounded opt-in retries and ordinary function nodes on the same runtime |
| S10–S15: useful flows and tests | Transform/branch/merge/join nodes, graph inspection, ordinary-function authoring, public node/graph test helpers and reliability/load proofs |
| S16–S19: adoption | Package/migration recipes, a real Next.js consumer, read-only graphical inspection and integrated acceptance |
| Visual authoring extension | Select/connect nodes, run test loads, durably save drafts and locked graph revisions, and export readable TypeScript plus portable graph artifacts for other projects |
| Optional durable execution extension | Persist eligible running workflows, retain outcomes and recover safely after failures using a separate durable host |

The optional [graph artifacts package](packages/artifacts/README.md) gives a document two fingerprints. Moving a node changes the layout fingerprint. Changing its configuration, wiring, or pinned implementation changes the semantic fingerprint. In the Next demo, choose **Open saved draft** to autosave locally and reopen the same graph and layout. Two tabs editing the same revision get a visible conflict if one saves first.

The initial graphical inspector is **read-only**. The interactive editor and code export are separate planned features built on the same graph model/compiler/runtime, rather than a second execution engine. Durable saved graph definitions are also distinct from checkpointing a running job.

Rich/custom payload types, controlled cyclic graphs and more capable agent-authored applications are extension goals. Initial public payloads are JSON-compatible and initial graph topology is acyclic. Most graphs should remain useful without a database.

The runtime refuses repeated delivery of the same packet to the same node within one run, using bounded protection records without live-run eviction. The channel alone does not enforce that policy. Crash-safe execution and exactly-once external side effects are not current guarantees; a durable host still needs application/provider idempotency or reconciliation where effects are uncertain.

The [proposed extension slices](docs/cursor_plans/fbp-extensions/INDEX.md) cover per-node diagnostics, Node-RED-inspired visual authoring, saved/exportable graphs and optional durable execution. They focus on explaining behavior, testing nodes independently and tracing changes; implementation remains gated by the recorded contract reviews. The revised order adds causal inspection, decision records, reviewed regression capture and revision comparison, followed by a useful application and a fair plain-TypeScript comparison before visual authoring.

The planned [local workspace option](docs/cursor_plans/fbp-extensions/local-workspace.md) will let an application repository contain editable Nodeflow source and consume it through public package exports, without publishing to npm. Application nodes and graphs can live directly in the project. Exact workspace build/watch tooling remains to be implemented and verified.

## Where to go next

- [Install/use guide and cookbook](docs/guide.md)
- [Migration from legacy examples](docs/migration.md)
- [Runtime/package boundaries](docs/architecture/fbp-runtime.md)
- [Ordered feature slices and current progress](https://github.com/SilverFox70/node-eventDispatcher/blob/master/docs/cursor_plans/fbp-slices/INDEX.md)
- [Node-authoring guide and checked template](https://github.com/SilverFox70/node-eventDispatcher/blob/master/docs/node-authoring.md)
- [Scoped inspection and diagram export](https://github.com/SilverFox70/node-eventDispatcher/blob/master/docs/architecture/inspection.md)
- [Keyed result collation](https://github.com/SilverFox70/node-eventDispatcher/blob/master/docs/architecture/keyed-joins.md)
- [Stream components, ordering and operation policies](https://github.com/SilverFox70/node-eventDispatcher/blob/master/docs/architecture/stream-components.md)
- [Ordinary function nodes](https://github.com/SilverFox70/node-eventDispatcher/blob/master/docs/architecture/function-nodes.md)
- [Streaming runtime and lifecycle](https://github.com/SilverFox70/node-eventDispatcher/blob/master/docs/architecture/runtime.md)
- [Contracts and component authoring](https://github.com/SilverFox70/node-eventDispatcher/blob/master/docs/architecture/contracts-and-components.md)
- [Architecture and implementation boundaries](https://github.com/SilverFox70/node-eventDispatcher/blob/master/docs/architecture/README.md)
- [Optional extensions: durability and visual graph authoring/export](https://github.com/SilverFox70/node-eventDispatcher/blob/master/docs/architecture/roadmap.md)
- [Development guide](https://github.com/SilverFox70/node-eventDispatcher/blob/master/docs/DEVELOPMENT_GUIDELINES.md)
- [Agent rules, skills and runbooks](https://github.com/SilverFox70/node-eventDispatcher/blob/master/docs/AGENT_FILES.md)
- [Full foundation plan](https://github.com/SilverFox70/node-eventDispatcher/blob/master/docs/cursor_plans/fbp-foundation-plan.md)

Retained historical utilities live under `examples/legacy`; their source scanner is a heuristic, not the authoritative graph model. Only the dispatcher compatibility shim remains under `server/src`. The old dispatcher path delegates to the built implementation. The sibling FBP-Presentation repository is reference material, not this library's runtime.

License: ISC.
