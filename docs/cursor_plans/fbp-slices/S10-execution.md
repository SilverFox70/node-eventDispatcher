# S10 execution receipt

User requested “proceed with S10”, authorizing S10.A–C implementation and the existing branch/review publication workflow. Branch codex/fbp-10-stream-components starts at actual S09B PR18 merge4bad939d45f0f61e820a375dcea7b7a92a8a6f51, verified through GitHub and origin/master. Accepted IC1-r2 packet/lineage rules and delivered S09A/S09B task contracts are reused. Historical blanket pending-language does not reopen these delivered contracts. S11 is not started.

## Implementation

- map(input,output,handler) delegates to defineFunction: serial scoped callback, authoritative output validation, one child packet with immediate input parent. There is no duplicated timer/retry/schema policy.
- filter(contract,predicate) scopes each serial predicate through ctx.task. True forwards the original envelope, false intentionally consumes it. Non-boolean JS results fail OUTPUT_CONTRACT without emission. Metadata-only context and operation attempts retain S09B conventions.
- broadcast(contract,names) validates/captures explicit names and derives independently copied/frozen child packets in original declaration order. Every send is awaited before another input. Partial delivery survives later cancellation/failure; no rollback/replay.
- merge(contract,names) retains one read or ready result/input, plus the current send. A bounded readiness queue preserves earlier settlements across output backpressure; one microtask settlement batch uses declaration-order ties, including numeric-looking names. EOF removes only that input; all must close. Read rejections are observed, and the runtime owns terminal channel cleanup.
- shared/named-ports owns descriptor-safe list validation and literal port declarations used by broadcast/merge. All ports use the supplied contract. Internal homogeneous iteration restores the exact captured literal types at the component boundary; generated-declaration assertions prove public payload and port types. No any-based public widening or runtime type bypass is introduced.

Built-in IDs are map/filter/broadcast/merge@1. Different operations of one kind use the existing defineComponent({...helper(...),id:'stable-app-name'}) API and their own registry entries. No new naming/options API, graph interpreter, implicit fanout, keyed join, persistence or new dependencies. Necessary packed/declaration consumer updates and architecture navigation are recorded in the plan's execution amendment.

## Conditions and behavioral evidence

Production graphs in test/components.test.js establish C16 broadcast backpressure: capacity1 slow branch parks the second send, fast sees only1/2 while3 is held, then both see1/2/3 after release. C59 checks distinct child IDs, same job/key and exact immediate parent; nested payloads are independently copied/frozen. A separate actual graph cancels with a second branch parked and retains earlier effects exactly once, with no later delivery after release.

C17/C60 production graph proofs interleave right10,left1,left2,right20 with unchanged envelopes and FIFO per input. Independent source components prove one input EOF does not close output before another produces10 and EOF. Actual runtime cancellation revokes waiting inputs. Supplemental controlled iterator tests inspect otherwise-private read counts: max one outstanding/input; one output pending; declaration ties; readiness accumulated while blocked; all EOF; error observation. They supplement, rather than replace, the real runtime proofs.

C20 filter contribution outputs original packets2/4 from1..4. C58 map contribution derives2/4/6/8 with preserved job/key and one parent, distinct IDs. Both callbacks are serial under a controlled handler gate, and explicit retry invokes attempts1/2/1 with fresh attempt IDs and one output/input. Filter local timeout aborts its signal, clears timers and suppresses late true. Invalid map/predicate results produce no output. Malformed contracts/names/callbacks and accessor arrays reject before getters execute. C20 join cases remain S11; C58 aggregate remains S13.

Initial interface implementation preceded general assertions; no missing-module/build diagnostic is claimed as behavioral red. A retained reproduction reinstates the initial declaration-first readiness selection while output is blocked: merge-order-red.log fails the intended earlier-readiness assertion (exit1). Final code restores chronological queueing. Source bytes were restored in finally. This is an actual scheduling counterexample, not a claim that the whole feature followed tests-first perfectly.

Generated declaration negative fixture removes only expected-error directives from test/types/components.ts: types-red.log records exit2 for wrong map output/input, nonboolean/narrow predicate and unknown ports; no missing-module diagnostic. Fixture restored byte-for-byte and final declaration check passes. Legal async mapping, typed callback metadata, exact broadcast/merge ports and stable renaming are positive companions.

## Verification and applicability

Repository root; command-local PATH=/tmp/node-v26.13.0-darwin-arm64/bin:$PATH, Node26.13.0/npm11.20.0. No global config changes. Lock SHA256 bf9c99a9567367299e8e5f4afb613fe457a513ad43d1513594af781f2f862bbd unchanged. Build/type/coverage config and all-source denominator unchanged; the user-requested examples are included in the existing lint scope; historical fbp-pre-modernization-r2 remains historical characterization only.

Retained outputs are local under /tmp/fbp-s10-evidence/:

- npm run check → exit0, check-final.log: dual build, strict source/generated consumer checks and lint. One earlier check overlapped a second build's dist cleanup and failed missing declaration files; discarded as invalid concurrent-build evidence. Final check runs sequentially after the complete coverage command and passes. An earlier missing jsonContract test import was a fixture setup issue, corrected before final checks.
- node --test --test-timeout=5000 test/components.test.js → exit0,13 focused tests,0 failures/skips (focused-final.log). Entire final source/test candidate is also covered by the full run below.
- npm_config_cache=/tmp/fbp-npm-cache npm run coverage → exit0,156 tests,0 failures/skips, coverage-final.log and mapped coverage-final.json. Every delivered file meets100% required statement/line/branch metrics. All new component files also have100% function coverage; inherited unused private function counters are unchanged. No excludes/threshold relaxation.
- Offline installed tarball CJS/ESM consumers execute map→filter→broadcast→merge through the real compiler/runtime and assert components:4,4 alongside prior function/deadline proofs. Installed declaration entries exercise all helpers and reject unknown ports. Exact expected stdout avoids unresolved-promise false greens.
- Final restored generated consumer check → exit0, types-final.log. Documentation example → exit0, demo.log: completed and [4,4]. Guidance/diff results recorded before publication.

Readability: cohesive public modules are9–53 lines, named-ports14; no new source exceeds200 lines. No competing scheduler or generic utility bucket. Tests remain in the specified focused file (172 lines), with shared existing runtime/deferred/clock fixtures. Architecture guide explains naming, operation policy, branching/collation distinction and a runnable example.

Implementation complete; scoped conditions verified; build/type/lint/coverage passed. No browser/Next/provider/store or hosted CI proof claimed. Existing .DS_Store/.feedback-log remain untouched. Publication follows; no merge claimed. S11 consumes these combinators and supplies keyed collation only after actual S10 merge.

## User-requested examples follow-up

Before staging, the user requested an explicit current-progress README and runnable examples/. README now distinguishes S00–S09B merged, S10 review candidate and S11 keyed collation next; removes superseded trailing stage announcements and links real demos. examples/01-map-filter.cjs demonstrates6/8 from1..4, and examples/02-async-branches.cjs splits one object into independently named profile/settings async operations with signals, then merges two separate results. These are offline local stand-ins with no claimed DB durability. Both use the real compiler/runtime and complete. examples/README.md provides exact build/run commands and expected results. Lint now includes these CJS files; dependency/lock and build/type/coverage policies are unchanged. Final examples/check/navigation exits follow.

Final follow-up verification: npm run check exit0 after adding examples to lint (check-final.log). Each demo ran directly under the pinned runtime with explicit subprocess exit0 and expected stdout assertions (demo-map-filter.log and demo-async-branches.log). Required full coverage receipt remains applicable to unchanged production/test code; subsequent changes are README/examples/lint scope and slice metadata only. Guidance integrity passes81 scanned Markdown files/443 local links/22 slices/84 condition owners (guidance-final.log); examples README links also inspected. git diff --check passes after removing an extra README trailing blank line. No gate is left failed.

Publication: implementation commit3eb1634 pushed to origin/codex/fbp-10-stream-components; [PR #19](https://github.com/SilverFox70/node-eventDispatcher/pull/19) created against master. This documentation follow-up records actual publication; no merge claimed.
