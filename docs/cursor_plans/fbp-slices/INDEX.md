# FBP execution slices — start here

Partition: SP1-r2, 2026-10-28. Master: [r6](../fbp-foundation-plan.md), architecture SC-FBP-4. Read [shared execution contract](shared-execution.md) before a slice. [Machine-readable order/status](manifest.json) mirrors this index.

**Current work: review [S00 / IC1-r1](../fbp-identity-contract.md).** S00 design tasks are complete under the user's execution/submission request; see [receipt](S00-execution.md). The proposal is not yet accepted or merged. No later feature has started.

**Always execute in numeric order. Start a slice branch from updated master only after the previous slice is accepted and merged.** Branch-complete is not merged. Do not stack feature branches or start every slice concurrently. S00–S03 are ready-for-review proposals. S04–S19 are explicitly blocked-on-decision until S00's reviewed public identity contract is applied to affected plans; ordinary merge prerequisites still apply to all slices.

The choice to retain FIFO and use job/correlation/packet/lineage identity is compatible, but r4 did not freeze an exact metadata API or result-lookup lifetime. IC1-r1 now supplies one concrete proposal with downstream amendments, pending human acceptance. It does not implement a durable store. No current slice expands into rich public packet codecs, cycles, hosted agents or a drag/drop editor; the extension seams and graphical inspection remain included.

## Branch features and exact order

| Order | Slice / recognizable deliverable | Proposed branch | Readiness | Depends on merge |
| --- | --- | --- | --- | --- |
| 00 | [S00 — Freeze job, packet and lineage semantics](00-identity-contract-plan.md) | `codex/fbp-00-identity-contract` | ready-for-review | none |
| 01 | [S01 — Run and build on latest LTS with strict TypeScript](01-lts-typescript-build-plan.md) | `codex/fbp-01-lts-typescript-build` | ready-for-review | S00 |
| 02 | [S02 — Use isolated, correct dispatcher instances](02-dispatcher-core-plan.md) | `codex/fbp-02-dispatcher-core` | ready-for-review | S01 |
| 03 | [S03 — Inspect event publishers and active subscriptions](03-dispatcher-topology-plan.md) | `codex/fbp-03-dispatcher-topology` | ready-for-review | S02 |
| 04 | [S04 — Transport validated packets with bounded backpressure](04-packet-channels-plan.md) | `codex/fbp-04-packet-channels` | blocked-on-decision | S03 |
| 05 | [S05 — Define typed nodes with validated port contracts](05-port-contracts-plan.md) | `codex/fbp-05-port-contracts` | blocked-on-decision | S04 |
| 06 | [S06 — Validate and compile externally defined graphs](06-graph-compiler-plan.md) | `codex/fbp-06-graph-compiler` | blocked-on-decision | S05 |
| 07 | [S07 — Compose graphs with checked node and port handles](07-typed-graph-builder-plan.md) | `codex/fbp-07-typed-graph-builder` | blocked-on-decision | S06 |
| 08 | [S08 — Execute a real multi-packet streaming graph](08-stream-runtime-plan.md) | `codex/fbp-08-stream-runtime` | blocked-on-decision | S07 |
| 09 | [S09 — Finish, cancel and diagnose every owned wait safely](09-lifecycle-diagnostics-plan.md) | `codex/fbp-09-lifecycle-diagnostics` | blocked-on-decision | S08 |
| 10 | [S10 — Transform, branch and merge typed streams](10-stream-components-plan.md) | `codex/fbp-10-stream-components` | blocked-on-decision | S09 |
| 11 | [S11 — Collate asynchronous branch results by key](11-keyed-join-plan.md) | `codex/fbp-11-keyed-join` | blocked-on-decision | S10 |
| 12 | [S12 — Inspect all registered graphs and event relationships](12-inspection-export-plan.md) | `codex/fbp-12-inspection-export` | blocked-on-decision | S11 |
| 13 | [S13 — Write useful nodes as ordinary typed functions](13-function-authoring-plan.md) | `codex/fbp-13-function-authoring` | blocked-on-decision | S12 |
| 14 | [S14 — Test nodes and whole graphs with the real runtime](14-public-test-sdk-plan.md) | `codex/fbp-14-public-test-sdk` | blocked-on-decision | S13 |
| 15 | [S15 — Prove composed flows and sustained bounded execution](15-reliability-load-plan.md) | `codex/fbp-15-reliability-load` | blocked-on-decision | S14 |
| 16 | [S16 — Install the framework and author/test nodes outside the repo](16-package-cookbook-plan.md) | `codex/fbp-16-package-cookbook` | blocked-on-decision | S15 |
| 17 | [S17 — Run a packaged flow inside a Next.js application](17-next-server-consumer-plan.md) | `codex/fbp-17-next-server-consumer` | blocked-on-decision | S16 |
| 18 | [S18 — See graph wiring and event relationships in Next.js](18-graphical-inspector-plan.md) | `codex/fbp-18-graphical-inspector` | blocked-on-decision | S17 |
| 19 | [S19 — Accept the complete application/developer story](19-adoption-acceptance-plan.md) | `codex/fbp-19-adoption-acceptance` | blocked-on-decision | S18 |

## Milestone stories

- S01: latest-LTS typed package/build/test foundation.
- S02–S03: useful compatible dispatcher with inspectable event relationships.
- S04–S07: safe packet transport plus contract-first JSON and typed graph composition.
- S08–S11: a reliable streaming FBP engine with bounded branching and correlation joins.
- S12: graph/event relationship inventory and safe diagram export.
- S13–S14: human/agent-friendly function authoring and end-user node/graph tests.
- S15–S16: sustained-load proof and cleanly installable developer cookbook.
- S17–S18: packaged Next.js execution and actual graphical inspector, with browser/server isolation.
- S19: whole-system adoption acceptance against one candidate.

## How an agent resumes

1. Read this index/manifest and shared contract. Find first slice with no recorded merge; do not skip it just because another is easier.
2. Read that slice and its predecessor journal; verify actual master ancestry, approved revision/task set, dirty state and baseline applicability.
3. Execute only the slice's internal tasks, with tests first, exact boundaries and current identity contract; save SNN-execution.md after meaningful progress.
4. Hand back the feature and evidence. Commit/push/merge only when authorized. Record actual merge SHA, then advance the next-slice pointer in index/manifest.

Suggested execution request: “Execute SNN using its saved plan and SP1. Implement only this feature and its required verification, preserve unrelated work, and stop at a reviewable branch.” Add commit/PR/merge instructions explicitly when desired. No new chats/agents were launched by this plan.

## Completion record

S00: design complete, awaiting review/acceptance/merge. S01–S19: not-started. All merge SHAs: null. Authorized execution: S00.A–C design and PR submission only,2026-10-29. Planning/source anchor: master9cb666d. Current package's npm test is the historical exit1 placeholder; S01 establishes proper baseline and tooling. No new production test/coverage/build claim is made during slicing.

Use the master ledger for exact behavior and SP1's final-owner table for split proof handoffs; don't copy condition assertions into competing test matrices. C55–C65 now specify the identity proposal; dependent release still requires its acceptance and actual predecessor merge. Per-slice journals retain actual commands/red/green/current-candidate outputs. This index must never say “merged” without the actual default-branch commit evidence.
