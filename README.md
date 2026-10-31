# NodeDispatcher: a foundation for flow-based applications

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

## What exists in this revision

- Pinned Node LTS/npm, strict TypeScript, ESM/CommonJS builds and generated declarations.
- Independent synchronous event dispatchers, with an optional shared singleton and a legacy compatibility import.
- Immutable inspection metadata for active subscriptions, optional owners and explicitly declared publishers.
- Typed reusable component definitions, ordinary-function adapters, Zod-backed runtime contracts and safe catalog metadata.
- Immutable JSON packets with separate packet/job identities, immediate-parent lineage and optional correlation keys.
- Internal bounded FIFO channels with backpressure, close/drain and abort semantics, used by the streaming runtime.
- Typed graph construction and authoritative compilation, isolated streaming runs, bounded duplicate protection, cancellation, deadlines and safe diagnostics.
- Offline tests, packed-package consumer/type checks and source-mapped per-file coverage gates.

The [slice index](docs/cursor_plans/fbp-slices/INDEX.md) records review/merge status; a feature on a review branch is not automatically released. The package name remains `event-driven-design`. No new npm release is claimed here.

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

This demonstrates the dispatcher and packet factories, not a graph scheduler. Event delivery is synchronous; packet movement in the streaming graph runtime is asynchronous. See the [dispatcher API/migration guide](docs/architecture/dispatcher.md) and [identity contract](docs/cursor_plans/fbp-identity-contract.md).

## Build and verify

Use the exact project versions in `.nvmrc`, `.node-version` and `package.json`: Node **26.13.0 LTS**, npm **11.20.0**. A version manager can select them without changing your global default.

```sh
npm ci
npm run check
npm test
npm run coverage
```

`check` builds both distributions, checks source and consumer declarations, and runs lint. Tests use local fixtures; the legacy `npm run main` demo makes an external HTTP request and is not a verification command. To prepare a local installable artifact, build first and run `npm pack`, then install the resulting `.tgz` into the consuming project.

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

The initial graphical inspector is **read-only**. The interactive editor and code export are separate planned features built on the same graph model/compiler/runtime, rather than a second execution engine. Durable saved graph definitions are also distinct from checkpointing a running job.

Rich/custom payload types, controlled cyclic graphs and more capable agent-authored applications are extension goals. Initial public payloads are JSON-compatible and initial graph topology is acyclic. Most graphs should remain useful without a database.

The runtime refuses repeated delivery of the same packet to the same node within one run, using bounded protection records without live-run eviction. The channel alone does not enforce that policy. Crash-safe execution and exactly-once external side effects are not current guarantees; a durable host still needs application/provider idempotency or reconciliation where effects are uncertain.

## Where to go next

- [Ordered feature slices and current progress](docs/cursor_plans/fbp-slices/INDEX.md)
- [Contracts and component authoring](docs/architecture/contracts-and-components.md)
- [Architecture and implementation boundaries](docs/architecture/README.md)
- [Optional extensions: durability and visual graph authoring/export](docs/architecture/roadmap.md)
- [Development guide](docs/DEVELOPMENT_GUIDELINES.md)
- [Agent rules, skills and runbooks](docs/AGENT_FILES.md)
- [Full foundation plan](docs/cursor_plans/fbp-foundation-plan.md)

Historical examples remain under `server/src`; their source-scanning diagram utility is a prototype, not the authoritative graph model. The old dispatcher path delegates to the built implementation. The sibling FBP-Presentation repository is reference material, not this library's runtime.

License: ISC.

Graph validation/compilation is now available: see [the runnable S06 example](docs/architecture/graphs.md). Valid JSON wiring compiles without calling factories; invalid wiring returns deterministic issues. Streaming execution remains S08.

For typed graph construction, see [the S07 builder example](docs/architecture/graph-builder.md). It checks port names and payload types while producing the same portable graph definition.

Graphs can now process packets: [run the S08 streaming example](docs/architecture/runtime.md) to send1/2/3 through double→plus-one and receive3/5/7. Run instances have isolated state, bounded queues, duplicate protection and baseline cancellation.

S09 adds [run deadlines and verified cleanup/diagnostics](docs/architecture/lifecycle.md): set timeoutMs when starting a graph to bound stalled asynchronous work.

Node-operation deadlines and bounded opt-in retries are now available through [ctx.task and graph policy](docs/architecture/node-operations.md). Retries default to0; configured1–5 retries retain the original flow deadline and packet identity protections. The [S09B function adapter](docs/architecture/function-nodes.md) applies this automatically to ordinary typed handlers.
