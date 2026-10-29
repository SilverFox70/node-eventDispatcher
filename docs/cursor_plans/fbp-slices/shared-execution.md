# Branch-slice execution contract SP1

Revision: SP1-r2, 2026-10-28. Parent: [master r6](../fbp-foundation-plan.md), architecture SC-FBP-4. This file partitions the parent's T0–T12 into branch features; it does not silently amend packet semantics. The master C00–C65 ledger is authoritative for behavior. Slice contributions/final acceptance owners below replace its broad T labels for scheduling only.

## Purpose, source identity and readiness

Source inspected at master 9cb666dc6c846512d64edd39770b7eb2f213256c. Repository has old package/scripts and no implementation of the new runtime. Initial user dirty artifacts: .DS_Store and .feedback-log/. No relevant AGENTS.md/canonical architecture guides or reusable baseline index existed at the original planning preflight. Repository guidance was subsequently added: read [AGENTS.md](../../../AGENTS.md) and [the documentation map](../../AGENT_FILES.md). No baseline capture is implied by that setup. Read shared batch-plan workflow and execution-contract v2. No source/dependency/config changes, branches or execution agents were started by slicing. Those planning-only statements describe the original preflight. The subsequent user request authorizes S00 design execution, branch creation and PR submission; no runtime/successor implementation or merge is inferred.

This is a deliberately sequential branch series. Each slice is one recognizable feature/task branch with bounded internal tasks, designed for one focused execution session; it is a scope target, not a wall-clock or context-window guarantee. If a real prerequisite fails, save the journal and stop that slice instead of absorbing unrelated work. S00 design is complete for review; S01–S03 remain ready-for-review proposals. S04–S19 remain blocked-on-decision until S00 freezes the shared identity contract and records approval. Dependencies that have not merged are a separate execution precondition, not an invented behavioral defect.

### Identity proposal and release gate

S00 has delivered [IC1-r1](../fbp-identity-contract.md): complete version1 packet/job/parent identity, distinct runId, explicit derive/forward behavior, (jobId,key) joins, bounded immediate lineage and no base result-index/dedup/persistence service. The exact proposal is applied to downstream r2 plans. Human acceptance is still pending; writing or submitting this design does not release S04–S19. See [S00 receipt](S00-execution.md) for authorization, walkthroughs and actual documentation-check evidence. S01–S03 remain independently reviewable; default sequencing still requires actual S00 review/merge first.

No other initial-profile choices are reopened by slicing: latest LTS, TS-first dual builds, JSON admission with generic transport seams, acyclic topology with future loop horizon, trusted server registry, browser-safe model, real-runtime public testing, and graph plus event/subscription inspection remain SC-FBP-4 proposals. Custom codecs/objects, cycles, durable results and an agent engine are future projects, not extra tasks for the execution agent.

## Order and branch lifecycle

1. Read INDEX.md and manifest.json, this contract, the specific slice and master sections it cites. Resolve the current source/dirty state and any applicable repository guidance; do not assume the planning HEAD is still current.
2. Verify the preceding slice is merged into origin/master, with its exact merge/commit SHA and accepted evidence recorded in the index/journal. A green branch that is not merged is not a valid base for the next slice. No stacked feature branches by default.
3. Use the proposed codex/fbp-NN-name branch from updated master, or reuse an already suitable task branch/worktree without resetting/stashing user files. No implementation on master. This plan does not authorize branch creation until execution is requested.
4. Execute only the current feature's task IDs in order. Deliver real behavior/tests/docs within the allowlist; do not implement the next slice to make this one pass. Record failed-before/passed-after assertions and candidate/config identity.
5. Stop at reviewable feature completion; distinguish implementation complete, proof verified, gates passed/known-failure/unavailable, and publication state. Commit/push/PR/merge only within the user's authorization for that execution. Never bypass hooks/branch protection.
6. Record review/merge evidence and advance next slice only after actual merge. If parent contracts materially change, revise affected plans/statuses and revalidate proofs rather than treating plan titles as compatible interfaces.

Index/manifest are navigation and merge state, not an alternative behavioral ledger. Task completion evidence goes into `SNN-execution.md` beside its plan and is linked from the master execution journal. S00-execution.md records the actual design work; successor journals are created only when their execution starts and never stand in for fictional successful receipts. Plan changes/history must be preserved; never overwrite previously approved contract revisions silently.

## Shared contracts, producers and consumers

| Boundary | Producer | Frozen artifact/interface | Consumer | Cross-boundary final proof |
| --- | --- | --- | --- | --- |
| Identity/correlation/lineage | S00 | IC1-r1 proposal, exact amendment and C55–C65 | S04 packet, S08 runtime, S10/S11 combinators, S13 helper, S14 harness | owners assigned below; S19 accepts all receipts |
| Runtime/toolchain | S01 | pins, lock, dual dist/declarations, baseline record | all later slices | S16 clean install; S19 final applicability |
| Active dispatcher relationships | S03 | DispatcherTopology/inspect/owner/publisher API | S12 scope, S18 graphic | C51 S03 → C52 S12 → C54 S18 |
| Validated packet → transport | S04 | frozen Packet + generic FIFO/error contract | S05 contracts, S08 runtime | C11/C48 S04 → C34 S08 |
| Contracts → graph | S05 | Contract/Component/Catalog + runtime validators | S06 validator/compiler | C33 S05 → C08/C09/C10 S06 |
| Builder → compiler | S07 | GraphSpec (same JSON shape) | S08/runtime and recipes | C32 builder portion S07; C14 S08 |
| CompiledGraph → live run | S06 | opaque handle and immutable definition identity | S08 then S12 | C12–C15/C34 S08; C52 S12 |
| Runtime → component composition | S08/S09 | owned channels, terminal and context APIs | S10/S11/S13 | C27 S15; no second scheduler |
| Structured relationships → graphic | S12 | InspectionSnapshot/toMermaid browser-safe export | S18 | C53 S12 and C54 S18 |
| Public author/testing APIs → consumers | S13/S14 | defineFunction, /testing runNode/runGraph | S16 package, S17 Next | C45 S16; C42 S17 |
| Package → Next server/client | S16 | actual immutable tarball, dist/declarations | S17 routes and S18 UI | C41–C43 S17; C44/C54 S18 |
| Whole feature series | all owners | one applicable candidate/evidence set | S19 | C47 S19 |

No parent T task also owns a second production orchestrator or loader after these slices. S08 owns runtime, S06 graph validation, S14 helpers delegate to runtime. S12 owns inspection, S18 only presentation. Sources/library model are never imported from the server registry into the browser.

## Baselines and executable gates

Existing `npm test` is a known exit1 placeholder, not reusable behavior proof. Do not run it repeatedly during planning. S01 captures the baseline at original tracked-source identity in an isolated snapshot, on the selected latest LTS; proposed record path remains `docs/agent-baselines/records/fbp-pre-modernization-r2.md` for consistency with master. Link record applicability/limitations; do not call a dependency install failure a test failure. No independent baseline per slice unless relevant ancestry, config, runtime or lock changes invalidate it.

S01 implements/verifies the exact core build/typecheck/lint/test/coverage commands from master §11. Later slice command blocks assume those scripts exist on their merged predecessor. Do not introduce commands pointing at nonexistent future test files. Add test:package/main when their actual files/behavior arrive at S16 and test:next at S17; no skipped placeholder counted as proof. Typecheck must initially work with delivered export consumers and expand as exports arrive.

Default offline tests import built dist, not source aliases. Unit files can be node:test JS; TS negative fixtures use generated declarations and @ts-expect-error with a legal companion fixture. A missing module is setup failure, not wrong-behavior red. Add minimal scaffold only to reach the named assertion; preserve behavioral red/green receipts before bounded production change. Tests may inspect private channels via built internal modules without adding public exports.

Coverage uses the S01-proved all-files/source-map config and C31 canary. Every delivered changed production TS file (including unexecuted) and retained shim is in scope. Per-file lines/statements/branches>=95%; meaningful reachable changed conditions100% with exact assertions. Track denominator, source-map equivalence, raw reports and uncovered-region classification; no suite aggregate or test-count substitute. No coverage obligation for a source file that has not been introduced yet. New /model and /testing code is production scope. Do not include vendor/generated duplicate code or exclude a hard failure branch to pass.

Scoped command blocks are the required feature proof selection. `npm run check` is build/types/lint, and coverage runs all delivered offline tests; targeted tests establish behavioral red/green. Reuse still-applicable full outputs instead of rerunning them without changes. For a publication-approved feature, run applicable build/type/lint/test/coverage and hook gates at final candidate. UI/browser gates first apply to S18; real production Next build/HTTP/asset boundary starts S17. S01–S16 no database/browser/Figma claim; no DB introduced, no design reference supplied. Localhost HTTP only.

Quality receipts include candidate/dirty scope, command/cwd, tool/config/lock identity, exit, condition/test pointer, expected vs actual result, retained output path and restoration check. Separate behavioral coverage acceptance from command success. Known baseline failure never turns a gate green; new diagnostics remain introduced even if same code/message as an old occurrence elsewhere.

## Authoritative condition ownership

Master rows retain exact fixtures/assertions. Ownership here assigns their final completion branch; contributing scopes appear in individual plans. Reuse the same assertions rather than duplicate a matrix per slice.

| Conditions | Final acceptance owner | Partial handoffs |
| --- | --- | --- |
| C00,C31 | S01 (S19 checks applicability) | S15 rechecks instrumentation only if changed |
| C01–C05 | S02 | S03 preserves all dispatcher proofs |
| C51 | S03 | S12/S18 consume topology |
| C06,C07,C11,C48 | S04 | rich internal test never enables public custom values |
| C33 | S05 | registry conflict consulted S06 |
| C08–C10 | S06 | safe model reused by S12/S17 |
| C32 | S13 final aggregate | S05 process-port case; S07 builder case; S13 function-return case |
| C12–C15,C34,C49 | S08 | S06 owns C49 cycle-refusal subcase |
| C21–C25 | S09 | baseline safe cancellation exists already in S08 |
| C16,C17 | S10 | C20 filter portion produced S10 |
| C18–C20 | S11 | accept existing C20 filter proof plus key-reuse proof |
| C52,C53 | S12 | S18 verifies inert labels in actual UI |
| C35,C36 | S13 | templates smoke-tested S16 |
| C37–C39 | S14 | no alternate fake runtime |
| C26,C27 | S15 | real public pipeline and load/resource receipt |
| C28–C30,C40,C45,C50 | S16 | C50 catalog refusal S05/S06, author recipe S13 |
| C41–C43,C46 | S17 | C46 catalog/export S05 + shared graph validation S06 |
| C44,C54 | S18 | graphic/UI over real inspection model |
| C47 | S19 | all receipts on one applicable candidate |
| C55,C56 | S04 | root/derived envelope factories and exact refusal rules |
| C57,C63 | S08 | ID-preserving admission, deliberate duplicates and job/run separation |
| C58 | S13 final aggregate | S10 map/filter; S13 function helper/metadata context |
| C59,C60 | S10 | broadcast derived children; merge forwards originals |
| C61,C62 | S11 | job-scoped key groups, lineage order and bounds |
| C64 | S14 | identity-transparent bounded helper results |
| C65 | S12 | no accidental packet-history/result retention |

S00 added C55–C65 with concrete proposed outcomes; downstream plans link these master rows rather than competing versions. All66 rows must have one final owner, including split subcases; no condition can be “someone else's test” without a named producer and acceptance owner.

## Task template and stop conditions

Every slice task inherits its plan's exact allowed files, behavior list, condition pointers and exclusions. Its own read/prerequisite/verification/receipt is listed in the slice; metadata/journal/feedback updates are always allowed local artifacts. Allowed shared edits are necessary export/consumer type updates for that slice's delivered API, not signature changes in unrelated modules. No broad catch-all source refactor. If a required downstream module does not exist yet, use the lower-level interface delivered by a predecessor, not a fake implemented future API.

Stop and save evidence if: identity amendment absent/unapproved for S04 onward; predecessor not merged; moved HEAD invalidates prerequisite; tool cannot establish source coverage; schema policy needs unsupported/private behavior; ownership/missing/error/side-effect contract ambiguous; passing requires widening public types or implementing future features; branch too large because the story gained a new contract; protected branch/hook rejects publication. Do independent already-authorized work, but never use time elapsed as approval.

No surprise approval ceremony is added for routine mechanics within a user-authorized slice. S00's new public identity/lookup behavior is a genuine consequential amendment; the human reviews its concrete artifact once. The user authorized S00 design execution and review submission2026-10-29. No successor implementation, IC1 acceptance or merge is inferred.
