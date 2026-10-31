# S18A — Watch a meaningful flow execute

Readiness: user-authorized execution,2026-10-31. Branch: `codex/fbp-18a-live-execution-inspector`. Previous: [S18](18-graphical-inspector-plan.md), merged PR #28 at e38ff9c55e5d9b3dfa48debbff69dc47aaf6ce8b. Next: [S19](19-adoption-acceptance-plan.md), unstarted.

The user approved useful node cards, an actual account lookup/summary demonstration, real packet movement/identity/timing/payload inspection and the proposed localhost:54545 manual demo address. This is one execution-inspector feature, not permission for an editor, persistence, arbitrary code execution or another scheduler. [EX1](../fbp-execution-inspection-contract.md) freezes its producer/transport/lifetime boundaries. Existing [SP1](shared-execution.md), identity and timeout contracts remain applicable.

## Tasks and boundaries

- S18A.A: save EX1, insertion/order and C66–C73 proof ownership; establish behavioral reds against meaningful scaffold/current APIs. Reuse S18 producer/runtime/Next proof and exact predecessor merge.
- S18A.B: optional bounded runtime channel trace, immutable browser-safe model and sampling/notification/clear API. Factor the already-tested bounded change notifier into an observation module for dispatcher/trace use. Trace failures cannot alter admission, ordering, duplicate protection, timing policy or effects.
- S18A.C: semantic sample-account components and descriptions/contracts, actual asynchronous lookup/summary with correlated packets; transport trace separately from the unchanged safe inspection scope. SVG/card/timeline/payload controls consume actual events. Manual demo uses localhost:54545 with explicit --port override; tests keep ephemeral loopback ports.
- S18A.D: core/types/package and production Next HTTP/browser/asset/coverage gates, identity/privacy/lifecycle/overflow tests, visual QA, README/examples/architecture/journal; commit/push/PR under existing user authorization. Stop for review; no S19 execution or merge inferred.

Allowed: src/runtime.ts, runtime/ports.ts, runtime/trace.ts, src/channel.ts, src/model/execution-trace.ts and root/model type/export wiring; src/observation/changes.ts plus dispatcher notifier import/move; owning core/type tests; fixtures/next-consumer/app/** and lib/inspection-*.ts plus focused execution components; scripts/next/**, scripts/test-next.mjs and test/next/**; relevant docs/index/manifest/README/examples documentation. No dependency additions expected. Preserve unrelated files, legacy compatibility, one runtime/compiler and S18 hostile-label/cleanup proofs.

Final gates: npm run check; npm run coverage; npm run test:next; guidance integrity and diff checks. All changed executable library/fixture files remain in their existing per-file95% statement/line/branch denominator, including unimported files. Use real channel mutation and server/browser proof, not invented counts or cosmetic particles. Keep large cohesive tests readable and split by production boundary when necessary.

### S18A.A — freeze contract and red proofs

EX1 and C66–C73 above; baseline/current APIs and actual predecessor merge required. Save actual assertion failures rather than missing-module setup failures.

### S18A.B — instrument the sole runtime

Implement EX1 channel provenance, bounded trace/observers/capture and typed browser-safe admission. Preserve all prior runtime/channel/identity proofs.

### S18A.C — deliver the usable viewer and demo

Compose real nodes, SSE and SVG/timeline/details; retain scope ownership and hostile-label proofs. Apply the approved manual address without changing test isolation.

### S18A.D — verify and submit for review

Run the listed gates, reconcile per-file coverage/meaningful conditions, review human-readable structure, update evidence and publish one feature branch. Do not execute S19.
