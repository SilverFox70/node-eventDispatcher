# S09 execution receipt

Scope: user authorized S09.A–C with “proceed”,2026-10-30. Branch codex/fbp-09-lifecycle-diagnostics starts from actual S08/master merge185f30326092b1d920b0b55449b3195d30757f59 (PR15). Existing packet/ledger/report/graph contracts are delivered. This slice adds the already-proposed timeoutMs and verifies lifecycle/snapshot behavior in the same orchestrator; no new identity, persistence, join or inspection-scope protocol. .DS_Store and .feedback-log/ preserved. No S10 execution or merge implied.

## Implementation and contract

startNetwork accepts absent or positive safe-integer timeoutMs, rejecting invalid explicit values before factories. runtime/deadline.ts owns one monotonic timer, chunks at2147483647ms, and reschedules remaining time on early wake or expires immediately after delayed wake. Stale callbacks cannot recreate a cancelled timer. runtime/state.ts remains sole first-terminal/cleanup/snapshot owner, clearing the deadline and parent abort listener before done resolves. No diagnostics wrapper or second runtime was needed; existing state/ports/channel ownership is preserved.

Terminal code TIMEOUT belongs to the run without a nodeId. Completed nodes remain completed; a component's failing node is failed and interrupted siblings cancelled; global timeout cancels still-running nodes. Snapshots/counters/diagnostic bounds and backend report attribution remain S08's protocol. Source-only finish now marks draining while its exposed output awaits EOF. UI, Next, durable recovery, retries and forced synchronous interruption remain excluded.

## Meaningful red/green and conditions

S09.A scaffold admitted/typed timeoutMs without scheduling it. The valid blocked-handler fixture failed the assertion “one owned deadline must be scheduled”, expected1/actual0, command exit1; /tmp/fbp-s09-evidence/deadline-red.log. This is missing behavior after valid setup, not an unknown-option/missing-module failure. After implementation, actual Node timers also expire a blocked asynchronous process; no elapsed-speed threshold is asserted.

A separate C24 fixture found source-only finish incorrectly stayed running while full output drained; drain-red.log exit1 records expected draining/actual running. finish now marks draining for zero ingress too. Existing S08 consumers/types were updated only where timeout becomes available; unknown-option refusal is preserved with an actually unknown field.

- C21: lifecycle.test.js::cancel releases owned resources inventories only runtime-owned timers and parent listeners, asserts1→0, double cancellation, blocked read rejection and cancelled terminal. Pre-abort checks0 timers/listeners/factories; timeout/failure/completion variants also prove cleanup.
- C22: timeout and late completion and late rejection cannot replace timeout or become unhandled use controlled deferred work and test-local clock; timeout is exact failed/TIMEOUT, late sends reject RUN_TERMINATED, egress sent0, no raw error leakage/unhandled rejection. Completed/cancelled/failed outcomes remain the exact first immutable object despite parent abort/stale timer callbacks. Real Node deadline fixture and packed consumers prove the scheduling boundary independently of the controlled clock.
- C23: inherited runtime-lifecycle.test.js assertions cover early process return, normal loop break, external output return, parked unawaited sends and ignored reads; real S08 ports/runtime are reused. Original loop-body/output-contract failures still outrank iterator cleanup. No duplicate test executor.
- C24: consumer participates in drain fills the actual fixed16-capacity exposed channel, parks packet17, asserts exact full counters and draining status, then drains17 ordered outputs/EOF and completed terminal; repeated finish shares done. The old ledger's hypothetical exposed capacity1 is replaced by canonical fixed16, not a new capacity override.
- C25: diagnostics.test.js asserts exact1/1/0 admitted/received/discarded counters, event names/sequences3/4 with limit2, detached/frozen snapshots, no packet/job/value/function history, node state distinctions, limit0/1000 behavior, and bounded late diagnostics without terminal mutation. S08 validation-report proof remains applicable and preserved by the full suite.

Test-local lifecycle-clock.cjs intercepts the actual scheduler/monotonic clock and inventories runtime timers/parent listeners. It does not use sleeps, blanket process handle counts or a production clock-injection API. Controlled setImmediate turns flush promise failures/state settlement without timing luck. Real Node timer test has a test-runner watchdog, not a flaky elapsed-duration assertion.

Final verification/publication follows. No source/config/dependency/global machine changes outside slice scope. Necessary declaration/packed-consumer edits accompany the new root option. S08 baseline runtime assertions remain enabled.

## Final verification and acceptance

Final source candidate: same Node26.13.0/npm11.20.0 pins, dependencies, build/type/lint/coverage config and lock SHA256 bf9c99a9567367299e8e5f4afb613fe457a513ad43d1513594af781f2f862bbd. Existing S01 historical baseline remains applicable; no exclusions/threshold changes or new baseline capture.

From the repository root with command-local PATH=/tmp/node-v26.13.0-darwin-arm64/bin:$PATH:

- npm run check → exit0, dual build, strict source/generated-declaration consumers and lint; /tmp/fbp-s09-evidence/check-final.log.
- node --test --test-timeout=5000 test/lifecycle.test.js test/diagnostics.test.js → exit0,15 tests,0 failures/skips; focused-final.log. Test timeout is only the runner watchdog.
- npm_config_cache=/tmp/fbp-npm-cache npm run coverage → exit0,108 tests,0 failures/skips; all delivered production files100% statements/lines/branches/functions, including deadline.ts, state.ts and runtime.ts. coverage-final.log and mapped coverage-final.json retained locally. Existing localhost fixtures ran with explicit permissions. Packed ESM/CommonJS consumers assert both stream:4 and deadline:TIMEOUT with real Node timers; positive/negative timeout declarations compile in both formats.
- Documented lifecycle.md example ran and printed {status:'failed',code:'TIMEOUT'}; demo.log retained. Guidance integrity passed71 Markdown files/408 local links/20 slices/66 condition owners (links/order only); git diff --check passed.

Monotonic early/delayed wake and long-duration chunk tests do not assert elapsed speed. Controlled inventories prove cleanup on every terminal path, including disabled stale callbacks, while independent native timer/packed tests prove actual scheduling. Retained red logs establish both timer absence and source-only drain-status defects before their fixes. Current source has no changes after these final gates; subsequent edits are documentation/publication only.

Readability: runtime facade170 lines, state63, deadline24; lifecycle test108, diagnostic test50 and clock fixture26. Existing state remains the diagnostics owner, so no artificial new diagnostics facade was added. Source responsibilities and shared helpers stay cohesive; no file exceeds200 lines and no wrapper forest or second scheduler introduced. Root/architecture README current-state prose was corrected to reflect delivered graph execution and duplicate protection.

Implementation complete; C21–C25 verified with preserved S08 assertions; quality/coverage passed. Publication follows. No hosted CI/Next/browser/provider/durable recovery claim. S10 starts only after actual S09 merge.
