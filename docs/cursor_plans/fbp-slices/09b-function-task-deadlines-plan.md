# S09B — Automatically time ordinary function-node work

Contract version:2. Revision:r2,2026-10-30. Status:ready-for-review, execution waits for actual S09A merge. Shared contract:[NT1-r2](../fbp-node-timeout-contract.md). Branch:codex/fbp-09b-function-task-deadlines. Previous:[S09A](09a-node-task-deadlines-plan.md). Next:S10. Start only from actual S09A merge; no parallel or stacked sibling implementation by default.

Story: a human/agent writes one typed handler, and each packet automatically receives the configured node-operation deadline and scoped cancellation signal. Runtime policy is implemented by S09A, never duplicated in this adapter.

Provenance/current source/baseline: NT1-r2; S13's function adapter is currently only proposed. This slice moves its minimal production helper and essential type/behavior tests forward, while S13 still owns human/agent cookbook, templates, dependency examples and final C32/C35/C36/C50/C58 aggregate acceptance. User requested node/function deadline integration before combinators. Timing/retry direction is accepted; actual S09A merge remains required. S09B source implementation has not started.

### S09B.A — Establish exact authoring contract and red proofs

Prerequisites: accepted NT1 and S09A merge/evidence. Read delivered ProcessContext.task, packet/derivePacket, contracts/components, existing generated declaration fixtures and S13 plan. Allowed: test/function-task.test.js, test/types/function-node.ts, packed export consumers, minimal src/function.ts scaffold, local journal and task handoff docs.

Required: exact NT1 defineFunction/FunctionContext signature preserving literal in/out keys, JSON payload typing, scoped signal/attempt/attemptId plus frozen PacketMetadata at ctx.packet only. Wrong numeric handler return must fail tsc; valid number handler passes. Runtime fixture uses real compiled/built graph and NODE_TIMEOUT from actual task policy. Establish semantic red once scaffold exists, not a missing import. No additional onTimeout hook, magic error port or retry option.

Completion: NT11–14 planned fixtures reach intended guards, type failures named, predecessor adapter availability verified. Stop if S09A differs from NT1 rather than inventing another task wrapper.

### S09B.B — Deliver a thin function adapter

Prerequisite:A. Allowed: src/function.ts/private function helpers, src/index.ts; necessary public generated declaration/type/package tests. No new scheduler, ALS owner, timers, channel, representation, builder or graph semantics.

Required: defineComponent wrapper reads packets serially; invokes handler exactly once inside ctx.task; forwards scoped signal and immutable metadata without value to FunctionContext; after successful settlement, validate output and derive one child with same job/key and immediate parent, then await send before next input. Catching business responses inside the handler returns ordinary declared data. Uncaught local expiry fails NODE_TIMEOUT/nodeId; global deadline remains TIMEOUT; handler throw fails COMPONENT_FAILED; invalid output fails OUTPUT_CONTRACT before downstream effects. No late response revives processing, no promise queue or handler reentry.

Proof: NT11/12/14 with controlled handlers, fake injected service recording exact calls/signals, real two-node output boundary and concurrency barriers. Preserve S08 identity and S09 cleanup assertions; helper-only tests do not establish integration. Completion: all outcomes through production runtime with0 forbidden effects. Stop if handling expiry requires implicit retry or emitting undeclared packets.

### S09B.C — Accept packaged function deadlines and hand off S10/S13

Prerequisite:B. Allowed: bounded B fixes, NT13 packed/declaration consumer proof, runnable feature guide/example, journal and ordered status receipts. Prove installed CJS/ESM handlers double2→4 with correct metadata, actual Node timer produces NODE_TIMEOUT for a stalled5ms handler inside a100ms flow, and JS output bypass fails the real contract guard. Prove wrong function return type against generated declarations. Assert expected stdout so unresolved promises cannot look like successful child-process exits.

Commands:npm run check; node --test test/function-task.test.js; npm run coverage. Same toolchain/cache/coverage/baseline policy as S09A; changed production files≥95% statements/lines/branches and100% meaningful conditions, no exclusions. No new dependencies expected. No Next/browser/provider/DB/Figma claim. Keep ordinary files near200 lines or less with plain handler recipe/JSDoc.

Handoff: S10 map/filter callbacks use the same ctx.task mechanism; transport combinators do not time idle/backpressure as handler work. S13 consumes this adapter for full cookbook/templates and aggregate requirements; it must not reimplement defineFunction. Update master/SP1/manifest/index producer/consumer ownership once, preserving historical plans. Commit/push/review only as authorized; stop at this branch, do not auto-merge/start S10.

Readiness: actual S09A merge is the remaining execution prerequisite. NT1 timing/retry choices are settled; G1/G7 have concrete proposed interfaces and integration acceptance; G2/G3/G4/G5/G6 have concrete proposed signatures, one owner, executable NT11–14 fixtures, no replay/recovery promise and actual build/type/package commands. No implementation, test or coverage success claimed by planning.

R2 amendment: implement/preserve NT1 R11 retry policy and NT15–17 in the same operation owner. Conditions NT01–10/NT15–17 belong to S09A; S09B delegates all retry/deadline behavior.
