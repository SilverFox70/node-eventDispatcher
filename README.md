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

The current runtime executes node graphs; these application examples still need their own domain nodes and integration tests. The optional PostgreSQL host can resume eligible persisted workflows after a process restart.

## Current progress

**The foundation and the current extension roadmap are merged through S51.** The core runs typed asynchronous graphs and supports live packet inspection, node tests and diagnostics. The optional editor saves and reopens drafts, locks tested revisions, and exports portable bundles or readable TypeScript. The optional PostgreSQL host adds worker recovery, waits, keyed joins, evidence-based provider reconciliation and a tested restore procedure.

Try the Next.js demo for live diagnostics, the Pokémon fan-out and join, and [product content review](docs/nextjs.md#product-content-review). The content demo includes a [comparison against plain TypeScript](docs/content-review-comparison.md). Try the [approval example](examples/durable/README.md) to pause and resume a durable run.

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

The [extension index](docs/cursor_plans/fbp-extensions/INDEX.md) records merged milestones. The core package is `event-driven-design`. The install instructions below use packages built from this checkout.

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

For the Next.js application at `http://localhost:54545`, run `npm run demo:next` (Ctrl+C to stop) or run `npm run test:next` with `FBP_POSTGRES_TEST_URL` set to a disposable PostgreSQL service for packaged HTTP/browser acceptance. See [the Next.js guide](https://github.com/SilverFox70/node-eventDispatcher/blob/master/docs/nextjs.md). Dependency/browser installation is setup; demo requests use local fakes.

Reusable node definitions can now declare typed per-instance configuration. The compiler validates each binding before any node starts, and the same configuration works with the isolated node test harness. See the [application guide](docs/guide.md#configure-each-node-instance).

The optional editor is available in the Next demo. Choose **Open the graph editor** from the demo home page, or visit `http://localhost:54545/editor`. Add Inventory Alert nodes, drag either card to move it, and connect its output to another Alert’s input. The node details offer keyboard movement and deletion. Undo restores removed nodes and wires. Use **Open saved draft** to persist edits locally. The practice and test samples use session-only drafts. Select a configured node to edit its settings, then choose **Validate draft** for backend feedback on settings and wiring. Open the separate sample draft from the test walkthrough, validate it, load fixture inputs, and choose **Run test** to see collated output and packet lineage. Choose **Load slow-branch input** and **Capture test payloads** to follow a job through the live view. Select **Join by key** before running to watch the units arrive while the label is still pending. Select any node to inspect its packets, or choose **Final outputs**. The view reconnects without reloading the draft. For a guided build from scratch, open **First-run walkthrough** and use its separate practice draft.

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

`check` builds core, editor, artifacts and durable, checks source and consumer declarations, and runs lint. Tests use local fixtures; `npm run main` runs the offline pipeline demo. The packed-consumer gate installs a real tarball in temporary projects and runs the template/examples there. To prepare a local installable artifact, build first and run `npm pack`, then install the resulting `.tgz` into the consuming project.

To inspect sustained-load behavior after building, run `node benchmark/throughput.cjs`. It verifies two graph shapes at capacities 1 and 16 and reports throughput, sampled heap and queue bounds. These are machine-specific observations, not performance guarantees. See [benchmark instructions](https://github.com/SilverFox70/node-eventDispatcher/blob/master/benchmark/README.md) for settings and focused reliability tests.

## Roadmap

| Merged stage | Outcome |
| --- | --- |
| S00–S19 | Typed in-memory graph runtime, contracts, event relationships, testing and Next.js adoption |
| S20–S24F | Correlated diagnostics, causal explanations, reviewed regression fixtures and revision comparison |
| S25–S31 | Visual authoring, test loads, live packet inspection and a first-run walkthrough |
| S32–S38 | SQLite drafts, immutable revisions, graph bundles, readable TypeScript and pinned subflows |
| S39–S51 | Optional PostgreSQL host, recovery and reconciliation, persisted progress, crash qualification and installed adoption |

The next candidate is a bounded Realberry IAW-2919 pilot. Compare one obligation with the existing workflow for safety, diagnosis and cost of change before deciding on adoption. IAW-3093 projection is a separate question. Longer-term directions include approved handler-source inspection, existing-application discovery and source transformation, richer payloads, controlled feedback graphs and agent-assisted authoring. See the [roadmap](docs/architecture/roadmap.md).

The [graph artifacts package](packages/artifacts/README.md) keeps graph semantics and layout fingerprints separate. The [graph adoption demo](examples/adoption/README.md) shows a tested export handoff. [Durable host operations](docs/runbooks/operate-durable-host.md) covers the separate task of recovering running jobs. External effects need an application or provider idempotency guarantee or authoritative reconciliation.

[Local npm workspace installs](docs/cursor_plans/fbp-extensions/local-workspace.md) support editable framework source via public package names alongside tarball installs. Build the libraries before the host, and restart the host when it needs to load rebuilt code.

## Where to go next

- [Install/use guide and cookbook](docs/guide.md)
- [Migration from legacy examples](docs/migration.md)
- [Runtime/package boundaries](docs/architecture/fbp-runtime.md)
- [Ordered feature slices and current progress](docs/cursor_plans/fbp-extensions/INDEX.md)
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
