# Architecture documentation

## Current state

The numbered roadmap is merged through S51. Core provides a typed JSON/DAG graph compiler and in-memory streaming runtime, independent synchronous dispatchers, and public node and graph tests. The Next fixture exercises live packet and event inspection, bounded payload capture and causal explanations.

| Boundary | Delivered responsibility |
| --- | --- |
| [Core runtime](fbp-runtime.md) | Contracts, immutable packet lineage, FIFO channels, streaming execution, retry policies and tests |
| [Next.js and editor](../nextjs.md) | Live inspection, causal diagnostics, visual authoring and controlled graph tests |
| [Graph artifacts](../artifact-storage.md) | SQLite drafts, immutable graph revisions, portable bundles, readable TypeScript and version-pinned subflows |
| [Optional durable host](../runbooks/operate-durable-host.md) | PostgreSQL transactions, worker claims, retained joins and waits, reconciled provider outcomes, progress, retention and restore |

See [system boundaries](system-boundaries.md), the [decision register](decision-register.md), the [extension merge index](../cursor_plans/fbp-extensions/INDEX.md) and the [roadmap beyond S51](roadmap.md).

## Authority and maintenance

User instruction defines scope; accepted decisions and the approved feature contract settle behavior. Proposed plans are reviewable design, not implementation approval. For execution order SP1 supersedes old broad T task groupings. The [identity contract](../cursor_plans/fbp-identity-contract.md) distinguishes packet, job, run and correlation identities.

After a feature merges, update only relevant current-state facts and decision status with its evidence link. Keep detailed historical plans/receipts in their existing locations; do not copy all55 conditions into an architecture overview. If an accepted ADR changes a shared interface, amend affected plans/consumers and proof owners together using [the runbook](../runbooks/change-contract.md).

## Delivery history

The following entries retain the sequence at delivery time; later slices named as future in an earlier entry are delivered as described above.

S05 defines [typed contracts, reusable components and safe catalogs](contracts-and-components.md). Graph execution remains a later slice.

S06 adds [graph validation and compilation](graphs.md): JSON wiring becomes an immutable server handle or deterministic issues before factories execute. Streaming execution remains S08.

S07 adds [typed graph construction](graph-builder.md), emitting the same GraphSpec for S06 compilation. S08 still owns execution.

S08 adds [streaming execution](runtime.md): per-run processes/channels, real packet flow, bounded duplicate protection, baseline cancellation and safe backend verdicts. Deadlines remain S09.

S09 adds [deadlines and lifecycle verification](lifecycle.md), preserving the same streaming runtime and bounded backend verdicts.

S09A adds [node-operation deadlines and explicit retries](node-operations.md). S09B adds [ordinary function nodes](function-nodes.md) with automatic operation scoping before S10.

S10 adds [stream components](stream-components.md): serial map/filter callbacks, explicit bounded broadcast and readiness-ordered merge. Keyed result collation remains S11.

S11 adds [keyed joins](keyed-joins.md): bounded job/key collation into strict typed products, with non-reusable completed groups.

S12 adds [scoped inspection and Mermaid export](inspection.md): explicit live/idle graph inventory, run association and current dispatcher relationships, with detached browser-safe metadata.

S13 adds [node-authoring recipes and templates](../node-authoring.md), reusing S09B rather than replacing the function adapter or runtime.

S14 adds [public testing helpers](../node-authoring.md#test-one-node-or-a-complete-flow): typed one-node tests and dynamic compiled-graph tests on the same runtime, with bounded collection and cleanup.

S17 adds [the packaged Next consumer](../nextjs.md): a fixed Node route, browser-safe metadata, backend verdict attribution, current-request suppression and production HTTP/browser/asset proof. S18 adds the read-only graphical inspector, automatic topology notifications and owned live delivery; see the same guide.

S18A adds [optional live packet inspection](execution-inspection.md): actual channel events, bounded opt-in capture, semantic node cards and the meaningful sample account workflow. Default scope snapshots and execution policy remain unchanged.

S18B adds an application-level [live Pokémon graph and HTTP stress harness](../nextjs.md#s18b-live-pokémon-http-graph). It uses the same compiler/runtime, keyed joins and EX1 trace; no core API or durable execution is added. Public traffic is explicit and cached; stress stays on an owned loopback provider.
