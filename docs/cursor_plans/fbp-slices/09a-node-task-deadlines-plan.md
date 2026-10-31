# S09A — Coordinate node-operation and whole-flow deadlines

Contract version:2. Revision:r2,2026-10-30. Status:approved-for-execution; user accepted active-operation timing/retry amendment and requested execution after S09 merge. Shared contract:[NT1-r2](../fbp-node-timeout-contract.md). User authorized planning and implementation subject to resolving the actual boundary/dependency. S09A execution is now authorized.

Story: an advanced stream node can time one service operation, catch a local timeout and route an explicit result, while the run budget remains the ceiling and late work loses runtime capabilities.

Branch:codex/fbp-09a-node-task-deadlines. Previous:S09. Next:[S09B](09b-function-task-deadlines-plan.md). Original S10–S19 retain IDs; no component combinators are implemented here. Source inspected:S09 branch33ae613/PR16 open; origin/master185f303. Dirty artifacts:.DS_Store/.feedback-log only before planning. Canonical source/guidance/baseline and exact interfaces/conditions are NT1; never infer task timing from the old stream-process factory.

### S09A.A — Freeze policy, order and failing integration proofs

Prerequisites: user timing-boundary answer recorded in NT1; actual S09 merge or explicit stacked-branch authorization. Read NT1 and delivered runtime/state/deadline/ports, component, model graph/shape, builder, package/type tests, SP1 and verification/readability rules.

Allowed: NT1/this plan and execution journal; master/SP1/index/manifest and adjacent S10/S13 handoff amendments; scripts/check-agent-guidance.mjs plus its discovered tooling tests; test/node-task-policy.test.js, test/node-task-runtime.test.js and necessary type/packed fixtures. Minimal production interface scaffold only to reach actual assertions. Preserve old plan files/IDs/journals. Record source/lock/config/runtime evidence rather than recapturing historical baseline.

Required: release one unambiguous NT1 revision; represent S09A/B in the ordered manifest between S09/S10, with integer position independent of stable slice IDs. Update guidance checker to validate contiguous original base IDs and contiguous insertion suffixes, predecessor/next links, branch uniqueness, plan task ownership and condition owners; do not weaken original checks or renumber S10. Register NT rows once with correct owners. Amend S10 to depend on S09B/use task-wrapped callbacks; S13 reuses delivered function adapter and retains cookbook/template/aggregate proofs. Ensure map/index/manifest/skills discover inserted work consistently.

Proof: establish NT01/02/03/04/08 with valid numeric schemas, real compiled nodes and controlled existing monotonic clock. Expected red must be missing/wrong deadline/cooperation behavior, not missing-module/config setup. Test ordering failures include missing insertion, repeated/skipped suffix or wrong predecessor, while original20-slice history stays navigable. Completion: actual red logs and coherent saved shared contract. Stop if the user chooses process-lifetime timing: revise NT1 and dependent plans before code.

### S09A.B — Deliver configuration and one scoped-operation owner

Prerequisite:S09A.A. Allowed production: src/component.ts, src/builder.ts and private builder helpers; src/model/graph.ts and graph/structure helpers; src/runtime.ts and private runtime modules; src/index.ts; necessary model exports/declaration fixtures. No packet, channel scheduling, schema adapter, singleton, Next, DB or S10 component behavior.

Required: NT1 exact node metadata/options, safe parse/serialization, pre-effect flow/node compatibility, TaskContext/ctx.task and typed NodeTimeoutError; existing run deadline owner retains remaining-time/tie authority. Add private operation lease, one unsettled handler per node, scoped signal/timer cleanup, no task reads/sends, no stale task/runtime access, preserved outer-scope catch routing. Reuse S09 timer utility and S08 admission/identity guards; no timeout-specific duplicate bypass. Register NODE_TIMEOUT among runtime-owned fatal mappings; preserve terminal TIMEOUT distinction. No per-call override or retries without NT1 R11 policy.

Proof: NT01–10 through actual builder→compile→start→ctx.task→send, including both callback-order ties and late async children. Owned timer/listener inventory must return0 under every terminal/settlement path, including expired unresolved handlers. Snapshot remains bounded/payload-free; /model import graph remains Node-free. Completion: scoped tests green and no excluded behavior. Return to planning if an ALS scope can leak capabilities or requires aborting a shared channel to interrupt one task; change the operation boundary rather than silently cancelling other work.

### S09A.C — Accept and publish the advanced-node story

Prerequisites:A/B. Allowed: bounded fixes in B, test files/type/packed consumers, feature guide/example, execution journal and status receipts.

Demonstration: flow100/node30, service never responds; raw node catches NODE_TIMEOUT and sends one failure packet via its declared failure port; run completes after EOF. Separate flow100/node200 start refuses before effects. Separate remaining-budget case yields global TIMEOUT. Verify the real package in both module formats and browser-safe metadata parity, not just private helper mocks.

Commands: npm run check; node --test test/node-task*.test.js; npm run coverage. Same pinned runtime/cache/localhost fixture requirements as S09. Whole changed-file coverage≥95% statements/lines/branches,100% meaningful conditions, no denominator exclusions. Keep source modules cohesive around200 lines, selective JSDoc for operation lifetime/lease invariants. Record G1–G7, all NT01–10 assertion pointers, actual commands/exits, candidate and local raw evidence. Publication follows existing user authority; do not merge or start S09B without its actual predecessor receipt.

Readiness: user timing/retry decisions and actual S09 merge release S09A.A–C. Evidence is recorded in S09A-execution.md as work proceeds. No fictitious success claims. Runtime/native package proof owns external deadline boundary; DB/provider exactly-once and UI are N/A.

R2 amendment: implement/preserve NT1 R11 retry policy and NT15–18 in the same operation owner. Conditions NT01–10/NT15–18 belong to S09A; S09B delegates all retry/deadline behavior.
