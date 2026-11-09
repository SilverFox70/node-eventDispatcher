# S22 execution receipt

2026-11-04. User explicitly requested S22.A–C. Contract DG1-r2 declaration freeze in diagnostics-v1.md. Branch codex/fbp-22-node-capture-policy from actual S21 merge cf4af4d6e99767e9659dab1aa919ed49fea663c7, verified origin/master ancestry and GitHub PR33 merged. Unrelated .DS_Store/.feedback-log preserved. Sinks/UI remain S23/S24.

S22.A: source producers/consumers inspected; exact session/policy/epoch declaration recorded before implementation. Behavioral red and final receipts pending.

## Implementation and condition proof

S22.A–C complete for review. X22.1–X22.3 remain owned by the sole conditions.md ledger, now pointing to exact delivered tests.

- policy.ts resolves copied/frozen host authority and strict node/port/job selectors against the actual compiled registry, with32-rule/256-job bounds and equivalent-rule duplicate refusal. Invalid policies refuse before factories execute; invalid updates leave epoch/rules/expiry unchanged.
- session.ts owns one permission lease/run, UUID+epoch attribution, stale-update refusal, prospective rule replacement, guarded coalesced listeners and one unref expiry timer. Expiry is also checked synchronously; dispose/terminal clear listeners/timer. Session snapshots filter the same existing run ring rather than retain another history.
- records.ts/runtime.ts capture only actual accepted/dequeued validated packets. Transfer-only optional capture contains either bounded immutable JSON or complete-Unicode prefix with original UTF-8 byte count. Metadata defaults, EX1, task/retry/deadline behavior and the admission ledger keep their existing owners.
- /model validates paired capture attribution and exact shape/size; public declarations require all three capture fields together. No browser evaluator or server capability is introduced. Root/model exports are necessary declaration plumbing, not package configuration changes.

Meaningful behavioral red: /tmp/fbp-s22-evidence/red-listener.log reaches a valid active session but subscribe(null) wrongly succeeds; the explicit listener guard fixes it. The earlier red.log fails on unsupported pre-S22 StartOptions, which is an existing-behavior contrast, not a claimed capture-path behavioral red. That intermediate focused run also exposed a fixture ordering error: ingress acceptance does not imply component dequeue. The fixture now waits for actual handler entry before enabling capture. A later parked-send fixture expected CANCELLED where existing channel abort correctly reports RUN_TERMINATED; corrected the fixture, not runtime semantics.

Focused final13/13 tests prove host override/default denial, selective job/port inputs and outputs, immutable authority/rules, atomic refusals, legal32/256 boundaries, synchronous and timer expiry, replacement during controlled in-flight work, stale callback suppression, observer release, explicit UTF-8 truncation, metadata model refusal, parked-send exclusion and duplicate protection despite eviction. No public endpoint availability is used as correctness evidence.

## Verification receipts

Cwd repository root. Exact tools Node26.13.0/npm11.20.0 using command-local PATH `/tmp/fbp-s21-tools/node_modules/.bin:/tmp/node-v26.13.0-darwin-arm64/bin:$PATH`, npm_config_cache=/tmp/fbp-npm-cache. Direct package tests set npm_execpath to that isolated npm CLI. No global tool/keychain configuration changes. HTTP gates use owned loopback fixtures; remote git uses BatchMode/UseKeychain=no/AddKeysToAgent=no.

| Actual command | Result / local receipt |
| --- | --- |
| npm run check | exit0; /tmp/fbp-s22-evidence/check.log (build/typecheck/lint) |
| npm run coverage | exit0; coverage.log:255 tests passed,0 failures/skips, all-files per-file gate passed; includes isolated CJS/ESM installed capture and prior runtime/load cases |
| node --test test/diagnostics-capture*.test.js | final exit0; focused-final.log:13 tests passed after three additional test-only boundary scenarios |
| npm run typecheck / npm run lint | exit0; typecheck-final.log/lint-final.log for final installed declaration refinements; final added test is included in subsequent lint receipt |
| node --test test/package-contracts.test.js | exit0; package-final.log:3 passed including compiled-only ESM/CJS capture, isolated .mts/.cts epoch declarations and declaration-removal negative control |
| npm run test:next | exit0; next.log:32 passed/0 failed; production packed browser/HTTP/SSE/assets, server-only rejection and expected unexecuted-file canary refusal |
| node scripts/check-agent-guidance.mjs | exit0; guidance.log:164 Markdown/1119 links; historical foundation24-slice/99-owner check only |

Coverage copied to coverage-verified.json; changed-coverage.json records all8 changed delivered production files at100% statements/lines/branches. No config/lock/threshold/exclusion or dependency changes. source-identity.json fingerprints the measured source; final publication checks compare it again. Production source has not changed after the full measured run. Final additions are tests/docs only; their scoped green receipts supplement the original255-test run, without claiming a second full run or separate npm test/test:package execution.

Next fixture retained at `/private/var/folders/s7/ycx3c31d7tl_xw7ykf3p9ym40000gs/T/fbp-next-vxn62c/evidence` with artifact.json, consumer-tests.log, fixture-coverage.json, HTTP stress evidence and screenshots. Next/package gates were sequential to avoid root dist rebuild/packing races. Its artifact uses the same production source; later README/receipt-only changes are not claimed byte-identical to that earlier tarball.

## Readability, limits and handoff

Three focused new modules: model capture validation22 lines, host policy58 lines, session ownership92 lines. Runtime remains the single orchestration entry (~209 lines); policy/session/validation responsibilities stay in named subfolders. Retaining that entry together avoids splitting channel creation/context/terminal ownership across competing owners. No generic utility bucket, dependencies or second executor.

Capture remains optional host-authorized in-memory evidence. Existing caller-held snapshots are not revoked by expiry/disable. EX1's separate existing opt-in payload setting is unchanged. No sink/remote endpoint/UI toggle, graph editing, global dedup/payload lookup, database, durable recovery, rich codec or cycles. S23 owns bounded sinks/export and S24 owns demo controls. S22 not merged; next implementation waits for actual merge and explicit execution.

Implementation/proof/gates/coverage complete for review. Publication pending at this receipt revision. User .DS_Store/.feedback-log stay excluded. No merge/npm publication/deployment or application-specific modification.

## Publication receipt

Implementation commit42c1fb225566972ec3e22cee7ad6c28f7b441d56 pushed to origin/codex/fbp-22-node-capture-policy. [PR34](https://github.com/SilverFox70/node-eventDispatcher/pull/34) opened against master; connector confirms correct base/head and open/unmerged state. This publication receipt is documentation-only; CI is separate from local green checks. No successor implementation started.

## CI correction — worker coverage flush

2026-11-04 user requested repair of Core package CI on PR34. Run41850318664 job126645258933 failed only the Next worker SIGINT assertion: executed observedWork missing from V8 evidence. Linux/macOS core jobs passed; Windows core coverage also passed at investigation time. This is verification infrastructure, not a change to S22 execution/capture behavior.

The coverage preload called takeCoverage(), resetting counters, then process.exit() triggered an automatic second write. When both reports received the same millisecond filename, the latter overwrote the useful evidence. Original worker reproduced missing evidence1/100 locally. Deferring readiness alone still missed4/200; that hypothesis was rejected and no readiness workaround was retained. Preserved failure report showed a single timestamped file with no eval/function evidence. The Node v8 declarations document automatic final coverage unless stopCoverage() is invoked.

Fix scripts/next/coverage-exit.mjs to takeCoverage(), stopCoverage(), then preserve the existing signal exit code. Strengthen both POSIX regression cases to assert exit130/143, null terminating signal, exactly one report and the existing executed-function assertion. No sleeps, retries, skips, threshold relaxation or core-source change.

Local evidence /tmp/fbp-s22-ci-fix: red.log original100-worker reproduction; repeated-green.log failed readiness hypothesis; final-repeat.log corrected200 alternating SIGINT/SIGTERM exits with0 missing; focused-final.log4/4 passed; lint-final.log exit0. Full Next final gate is recorded below when completed. Existing library-source coverage remains applicable because no delivered package source, build/lock or coverage threshold changed. User .DS_Store/.feedback-log preserved.

The first full verification after the signal fix (next-final.log) passed both signal cases but failed the inspector's immediate Escape→Space reopening sequence: the pending native close event raced with reopening. Fix only test/next/inspector.test.js to await dialog detachment after Escape/close before further interaction. No application behavior or timeout changes. Final `npm run test:next` exit0:32/32 passed with fixture per-file coverage and both negative controls; next-verified.log and retained fbp-next-MmhTZP/evidence. Final lint-verified.log/guidance links and whitespace passed. Original Linux/macOS/Windows core jobs all ultimately passed; no unrelated core change or full local core rerun was needed. The earlier failed commands remain failed receipts, not relabeled passes.

## Verified merge for S23

PR34 merged into master as e95a633f4cc5ac2045b21e9480b23915c3a75b74, including CI correction387fabb. GitHub read-back and fetched ancestry verified before S23 branch. All four hosted jobs on387fabb passed. Earlier unmerged statements retain their delivery-time meaning.
