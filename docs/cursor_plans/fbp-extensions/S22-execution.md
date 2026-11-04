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

Implementation/proof/gates/coverage complete for review. Publication pending at this receipt revision. User .DS_Store/.feedback-log stay excluded. No merge/npm publication/deployment or Realberry modification.

## Publication receipt

Implementation commit42c1fb225566972ec3e22cee7ad6c28f7b441d56 pushed to origin/codex/fbp-22-node-capture-policy. [PR34](https://github.com/SilverFox70/node-eventDispatcher/pull/34) opened against master; connector confirms correct base/head and open/unmerged state. This publication receipt is documentation-only; CI is separate from local green checks. No successor implementation started.
