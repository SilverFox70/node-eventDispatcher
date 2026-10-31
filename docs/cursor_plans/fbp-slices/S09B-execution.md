# S09B execution receipt

Scope: user said S09A merged and requested the next slice, authorizing S09B.A–C. Actual predecessor d607bb69187df5b1cf95381ac362df394d933dfa (PR17) verified before branch codex/fbp-09b-function-task-deadlines. Shared contract NT1-r2 and delivered S09A ctx.task/attempt/retry owner reused. Existing .DS_Store/.feedback-log preserved. S10 not started; no merge implied.

## Implementation and bounded amendment

function.ts exports defineFunction, FunctionSpec and FunctionContext. Safe data-property spec capture, exact literal in/out contracts, typed sync/async returns, one serial operation per packet and immutable signal/attempt/attemptId/packet-metadata context. Handler references are captured; caller spec mutation cannot replace them. Fresh task context per attempt with stable input metadata; after final success, authoritative output validation precedes derivation of one child and awaited send. No callback prefetch or new timer/retry loop. Raw handler/service state captured outside the component remains application-owned, not cloned.

Initial inline output.validate rejected wrong results but discarded the S08 authoritative report. The meaningful output-report-red.log fixture ran a valid real function graph, observed OUTPUT_CONTRACT, then failed because attributed validation was absent (command exit1). A private weak ProcessContext→run/node/component attribution bridge now lets the adapter call the exact existing runtime validator on a plain value before allocating a child. runtime.ts registers metadata; runtime/validation.ts accepts value instead of packet wrapper and ports passes packet.value. No public API/policy/scheduler/channel/timer changes; this necessary amendment is recorded in the slice plan. JS undefined/class returns now map OUTPUT_CONTRACT with bounded INVALID_PACKET issue detail instead of failing derivation first.

Backend details stay versioned/attributed and payload-free. A fabricated context or missing output port refuses through the private bridge. This is not a public handle inventory or alternative executor; real function/node proofs compile and start the production runtime.

## Conditions and evidence

- NT11/C35/C58 contribution: automatic operation scope preserves metadata/lineage and serial handler order; controlled first handler gate blocks the second packet, one derived result per input keeps job/key/immediate parent, fresh IDs/context/attempt identities. Output backpressure after17 results blocks handler18 until consumption. Frozen object input and literal port/context declarations verified.
- NT12: local deadline produces failed NODE_TIMEOUT/nodeId; the remaining overall budget produces TIMEOUT; late value cannot emit. Default handler failure invokes once/COMPONENT_FAILED with no raw message in snapshot. JS wrong string/undefined/class returns OUTPUT_CONTRACT with bounded actual report and0 output admissions; explicit5-retry policy never retries output validation.
- NT13/C32 contribution: generated declarations reject wrong sync/async numeric handler returns, unknown ports, ctx.key/value aliases and metadata mutation; legal typed handler passes. Removing only expect-error directives gave named TS2322 return/Promise return failures plus intended context errors, command exit2 (types-red.log); source fixture restored byte-for-byte in finally. Original function-return aggregate owner remains S13.
- NT14: expected unavailable business result is normal typed JSON output/completed. Explicit transient failure retry2 calls produces exactly1 derived output, distinct signals/attempt IDs and unchanged input metadata. Actual S09A first-settlement/tie/resource/duplicate proofs remain unchanged in full suite.
- Real downstream consumer effect counter stays0 when function output is invalid. Invalid public input invokes0 handlers and later valid input succeeds. Malformed specs/accessors/fake contracts reject; no getters invoked. Private bridge own-context/port guards use actual runtime contexts rather than a mock scheduler.

All tests use existing production graph/packet/task owners and controlled existing clock/deferred fixtures. Initial interface build and negative-fixture lint mistakes are setup diagnostics, not behavioral red. Initial implementation preceded general new assertions; only actual attributed-output failure and restored declaration-negative failures are claimed as red evidence.

## Verification status

Final build/type/lint/coverage and publication results follow. Runtime/config/lock unchanged; historical fbp-pre-modernization-r2 remains historical characterization only. No new dependencies, Next/browser/provider/database proof claimed. New source/helper/test files remain comfortably under200 lines; small private bridge prevents duplicated validation/schema evaluation policy and keeps adapter plain. No unrelated cleanup.

## Final gates and handoff

Same pinned Node26.13.0/npm11.20.0, lock/build/type/lint/coverage configuration and denominator; no dependency changes. Lock SHA256 bf9c99a9567367299e8e5f4afb613fe457a513ad43d1513594af781f2f862bbd. Historical baseline remains applicable only to historical characterization; no baseline recapture or exclusions/threshold changes.

From repository root with command-local pinned PATH:

- npm run check → exit0 (dual build, source/generated declaration consumers and lint); check-final.log retained in /tmp/fbp-s09b-evidence/.
- node --test --test-timeout=5000 test/function-task.test.js → exit0,12 focused tests,0 failures/skips; focused-final.log. Final test-only run-isolation assertions were separately linted, exit0 (lint-final.log).
- npm_config_cache=/tmp/fbp-npm-cache npm run coverage → exit0,143 tests,0 failures/skips; required per-file statement/line/branch metrics100% for delivered source. New function/context-validation modules also have100% function coverage. Existing unused private state.live retains its prior0 function count; no unrelated code was changed to inflate that metric. coverage-final.log and mapped coverage-final.json retained locally.
- Packed offline CJS/ESM consumers assert actual automatic function retry2 calls/result4/unchanged parent and real NODE_TIMEOUT, alongside prior raw runtime/global timeout proofs. Both installed declaration module consumers exercise defineFunction and exact output ports. No unresolved-promise false green: expected stdout is asserted.
- Documented function example ran and printed [2,4,6], then completed (demo.log). Guidance integrity passed79 Markdown files/439 local links/22 ordered slices/84 condition owners (links/order only); git diff --check passed.

Real two-run fixture confirms shared function definitions keep scoped signals/input jobs and validation attribution independent: one run's bad output fails only that run; the other returns4/job-b/completed. Required C36 contribution is real runtime composition, not a fake service harness. Helper timers/retries remain wholly S09A-owned, and all prior admission/lease/deadline/cancellation proofs pass in the full suite.

Source/readability: function.ts36 lines, context-validation.ts16; root runtime remains below200 lines. Test function-task.test.js138 and package.test.js153 remain cohesive and within the guideline. One small private metadata bridge retains one validator/report owner without an extra scheduler or public context fields. Documentation updates record the source-boundary amendment and correct prior S09A function-metric wording while preserving history.

Implementation complete; NT11–14 and authoring contribution proofs verified; quality and required coverage passed. No hosted CI/Next/browser/provider/store proof claimed. S10 is next after actual S09B merge; S13 retains full cookbook/templates/aggregate acceptance. User artifacts untouched. Publication follows; no merge is claimed from local success.

Final declaration audit found a genuine variance regression: a number-only handler was accepted for a number|string input contract because the spec used method syntax. handler-variance-red.log records tsc exit2/TS2578 (the intended rejection was absent). FunctionSpec now uses a function-valued property, preserving strict input contravariance; narrower handlers reject and broader compatible handlers pass. Final build/type/lint/package/coverage gates were refreshed after this type-only correction. The new negative fixture remains in the generated-declaration consumer; no runtime policy changed.

Publication: implementation commit523aab6 pushed to origin/codex/fbp-09b-function-task-deadlines; [PR #18](https://github.com/SilverFox70/node-eventDispatcher/pull/18) created for review against master. This receipt is included in the publication follow-up commit. No merge is claimed.
