# Architecture documentation

## Current state versus destination

S00–S18B are merged. The package currently delivers a typed in-memory FBP runtime: contracts/components, immutable JSON packets, graph construction/compilation, bounded streams, cancellation/deadlines, explicit retries, branch/merge/keyed joins, testing helpers and installed CJS/ESM consumers. The Next fixture adds live graph/event inspection, optional bounded packet capture, node input/output dialogs, selectable output stages and controlled HTTP stress. [S19 adoption acceptance](../cursor_plans/fbp-slices/S19-execution.md) reconciles the candidate and proof; no npm release or deployment is inferred.

Visual graph editing/export tooling, per-node diagnostic policy, a durable host, rich public packet profiles and cyclic graphs remain future extensions. The existing graph builder emits portable JSON GraphSpec; this is not a visual authoring or TypeScript generation claim.

- [Dispatcher API and migration](dispatcher.md): instance ownership, synchronous delivery, bounded metadata logs and the legacy import.
- [System boundaries](system-boundaries.md): proposed module responsibilities and present source map.
- [Human-readable structure](../agent-rules/readability-and-structure.md): cohesive modules and legible responsibilities; strong size guideline with exceptions.
- [Decision register](decision-register.md): what came from the user, what is proposed and what remains unsettled.
- [Extension roadmap](roadmap.md): optional durable execution and other future profiles.
- [Decision records](decisions/README.md): status/lifecycle and template for later concrete architecture amendments.
- [Master plan](../cursor_plans/fbp-foundation-plan.md): requirement/invariant/condition specification.
- [Slice index](../cursor_plans/fbp-slices/INDEX.md): implementation sequencing and feature ownership.

## Authority and maintenance

User instruction defines scope; accepted decisions and the approved feature contract settle behavior. Proposed plans are reviewable design, not implementation approval. For execution order SP1 supersedes old broad T task groupings. For unresolved packet/job/lineage/lookup semantics S00 owns the amendment; do not infer a complete contract from the word key.

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
