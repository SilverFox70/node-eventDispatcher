# S09A execution receipt

Authority: user requested node/function deadline plans as next work, accepted active discrete operations (sample durations are illustrative), explicitly added default0/configurable1–5 retries, then requested “proceed” and “continue.” NT1-r2 releases S09A.A–C. Branch codex/fbp-09a-node-task-deadlines starts from actual S09 merge2ee5ac5ff8a28bd525a03e3e0a7d839c9737d1c3 (PR16). S09B remains a separate branch after actual S09A merge; no function adapter/combinator implementation is claimed here.

## Contract and ownership

Canonical [NT1-r2](../fbp-node-timeout-contract.md) and [current operation guide](../../architecture/node-operations.md) freeze policy, attempt lifetime, error ordering and retry semantics. Planning-r1 is preserved in fbp-node-timeout-contract-r1.md. Node policy is GraphSpec/builder taskTimeoutMs and optional retry{maxRetries,codes,delayMs,idempotent:true,settleTimeoutMs?}. Per-attempt/retry-wait/grace budgets cannot exceed configured flow timeout; actual remaining time still wins later. No policy means0 retries; explicit1–5 means at most2–6 serial attempts. Only matching error codes retry, never packet delivery/process creation or framework validation/duplicate/terminal errors.

The application supplies durations and safe retry eligibility. idempotent:true acknowledges safety; it does not prove provider idempotency. A positive configured cancellation-settlement window permits waiting for an expired attempt before retry; default0 does not wait. No overlap with unsettled work, no implicit replay/rollback/reconciliation/durable store. Callback attempt/attemptId are fresh while original job/packet/parents stay unchanged; output occurs once after final success. ctx.task returns values, with port IO around it. Scoped IO refusal and revoked descendants protect the runtime; arbitrary external callbacks/effects remain application-owned.

model/graph/task-policy.ts owns pure descriptor-safe serialized validation; GraphSpec/model/compiler/builder share it. runtime/task-scope.ts owns private per-run ALS leases; task-attempt.ts owns one controller/deadline/identity; tasks.ts owns bounded attempt/grace/backoff and one node slot. Existing runtime/state remains sole flow/terminal/cleanup owner. ctx.task must be awaited; returning with pending outer work fails UNAWAITED_TASK. Caught finished timeout can route declared failure while revoked underlying work settles, keeping its busy slot. No second scheduler, new dependency or channel policy change.

## Plans, order and handoffs

Manifest now has22 ordered entries: original S00–S19 identities plus S09A/S09B inserted before S10. Order is an explicit execution position, not parsed from stable IDs. Guidance checker retains branch/predecessor/task/condition checks and validates base continuity plus contiguous suffixes. Real disposable CLI fixtures reject skipped/repeated insertions and wrong predecessors/order. Local skill routes approved insertion IDs. Master/SP1/decision register/index and S10/S13 handoffs point to one NT ledger: S09A owns NT01–10/15–18; S09B owns NT11–14 and contributes to the original authoring aggregate conditions. S13 retains cookbook/templates/final aggregate acceptance, not another adapter.

## Proof pointers and genuine red evidence

- node-task-policy.test.js: builder/JSON serialization/freeze, invalid duration/retry tables, exact model/server parity and retry issue path, static flow/node/delay/grace rejection before factories, descriptor-safe array accessors.
- node-task-runtime.test.js: explicit timeout-as-data routing; fatal NODE_TIMEOUT vs global TIMEOUT; remaining flow ceiling and reversed timer callback tie; successful/revoked leases and IO/public mutation guards; idle/backpressure exclusion; cancellation before handler; node/run ownership; monotonic late-result rejection and unawaited-task failure.
- node-task-retry.test.js:0-default/unmatched errors,1/5 retry bounds and exhaustion, unique attempt IDs with one final packet/unchanged lineage and existing duplicate refusal; fixed backoff; cooperative and late-settled timeout retry; zero/expired grace and busy refusal; flow interruption during grace/backoff; getter/proxy-safe code classification; elapsed scheduler setup cleanup and deadline crossing before retry.
- node-task-guidance.test.js: real CLI baseline plus wrong suffix/base/position/predecessor/duplicates fail. Existing framework tests remain discovered. Generated declarations preserve literal ports and callback/result typing; packed CJS/ESM consumers assert retry2 calls, output4, global TIMEOUT and local NODE_TIMEOUT with actual Node timers.

Initial new interfaces/implementation preceded general assertions; no missing-module or initial setup/type diagnostic is counted as semantic red. Actual failing-before-fix fixtures:

1. A node started an operation without awaiting it and reported completed. unawaited-task-red.log command exit1 records expected UNAWAITED_TASK/actual completed; process completion now checks outer operation activity.
2. Retry array accessor ran before eventual rejection. policy-accessor-red.log exit1 records nonzero getter reads versus expected0; policy now snapshots/validates data before array iteration.
3. Controlled budget-guard bypass in an otherwise-valid graph made node>flow preflight fail its expected INVALID_TIMEOUT_POLICY assertion, exit1 (budget-guard-red.log). Source restored byte-for-byte in finally and rebuilt before final gates. This is sensitivity proof, not invented test-first history.

Raw logs live in /tmp/fbp-s09a-evidence/. Tests with non-JSON undefined/Infinity graph fields intentionally hit existing INVALID_GRAPH before execution-policy validation; valid JSON0/null/fraction fixtures reach INVALID_TIMEOUT_POLICY. No wrong fixture was used to claim a semantic defect.

## Verification and readiness

Final source candidate uses unchanged Node26.13.0/npm11.20.0, dependency lock/build/type/lint/coverage configuration and denominator. Historical fbp-pre-modernization-r2 baseline remains applicable only to old-source characterization; no new capture/exclusions/threshold changes. Final commands/evidence:

- npm run check with command-local pinned PATH → exit0; check.log. Build/strict source/generated declarations/lint passed.
- node --test --test-timeout=5000 test/node-task*.test.js → exit0,23 focused tests,0 skips/failures; focused-final.log. The runner watchdog is not a runtime option. Final test-only parity assertions were re-run and linted separately (lint-final.log).
- npm_config_cache=/tmp/fbp-npm-cache npm run coverage with existing localhost permissions → exit0,131 tests,0 failures/skips. All delivered production files100% statements/lines/branches/functions, including pure policy and every task module. coverage-final.log and mapped coverage-final.json retained. Existing package consumers use real offline installs and stdout assertions, preventing false green on unresolved promises/process exit.
- Runnable operation example → one {found:true} output, completed, calls2; demo.log retained. Guidance links/order and git diff --check passed; current counts recorded at publication. Guidance proof is not runtime semantics. No hosted CI/Next/browser/provider/store execution claimed.

Every new ordinary production/test file is below200 lines; facade186 lines keeps orchestration visible, private policy/scope/attempt/retry modules have clear ownership. Source code uses plain control flow and JSDoc for lifetime/safety boundaries; no wrapper forest or miscellaneous utilities. Test fixtures share existing graph/runtime helpers and controlled clocks without public test seams.

Implementation and S09A proof complete; quality/coverage passed. S09B automatic function adaptation remains unstarted pending actual predecessor merge. User .DS_Store/.feedback-log preserved; local feedback remains uncommitted. Publication follows; local green is not merge evidence.

Final publication candidate:131 full tests and23 focused tests pass; all delivered source metrics100%. Final framework-code eligibility guard includes packet/schema/graph/identity/join/terminal refusal codes, which cannot be selected for retry. No production changes follow the final check/coverage receipt. Guidance integrity:77 Markdown files/432 local links/22 ordered slices/84 condition owners; diff whitespace clean. Lock unchanged (SHA256 bf9c99a9567367299e8e5f4afb613fe457a513ad43d1513594af781f2f862bbd).

Publication: implementation commitf6e0968 pushed on codex/fbp-09a-node-task-deadlines; [PR #17](https://github.com/SilverFox70/node-eventDispatcher/pull/17) created against master. Receipt/index/manifest pushed before marking ready for review. No merge claimed; final source/config evidence remains applicable to these documentation-only publication updates. S09B is next after actual S09A merge.
