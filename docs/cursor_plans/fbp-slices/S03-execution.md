# S03 execution receipt

Authority: user requested S03 execution on2026-10-29. Tasks S03.A–C only. Branch codex/fbp-03-dispatcher-topology; base98861020af6d540ee352e9849cc845cd0c80d9a8, verified S02 PR8 MERGED. User .DS_Store and .feedback-log/ preserved. No S04 implementation/merge is inferred.

## S03.A — meaningful red

Added the topology model and minimal inspect/declaration scaffolding to reach a real assertion. Valid named/anonymous subscribers and a declared publisher produced empty events instead of ['a','published','z']; node --test test/dispatcher-topology.test.js exited1. Raw receipt: /tmp/fbp-s03-evidence/red.log. This is a semantic mismatch, not a missing module/method. Scaffolding was replaced, not retained as a placeholder.

## S03.B — implementation and C51

- Dispatcher registrations now capture monotonically allocated numeric IDs, copied optional owner IDs and callback names. Existing live registrations remain the sole subscription state. Snapshots sort by registration ID so interleaved events preserve registration order.
- Private topology helper owns explicit publisher declarations/disposers, owner validation and immutable metadata snapshot assembly. Publisher IDs are independently increasing numbers per instance/entity kind. No source inference, callback execution or per-emission history.
- Browser-safe model defines version1 JSON/readonly types; its wire-version constant is shared by the type and runtime snapshot. An initial coverage run correctly flagged the type-only module as unexecuted; the runtime now consumes the canonical model version. No coverage exclusion or fake test import was added.
- inspect returns copied/frozen objects and arrays, sorted union of active subscription/declaration event names, null unassigned owners and anonymous function labels. Once removal/off/unsubscribe/disposal update the next snapshot immediately. Logger state is independent.
- Runtime validation rejects malformed metadata, empty/over128/non-string owners and invalid publisher events before state/log/ID mutation. Duplicate subscriptions and publisher declarations have independent identities; disposers are idempotent.

C51 assertions: test/dispatcher-topology.test.js subscription topology stays current, immutable JSON/no callbacks or source, independent registration IDs/disposers, invalid owners/no state mutation. A1000-emit fixture leaves an empty topology unchanged. Existing S02 tests still own delivery semantics. /model and root declarations are exercised in ESM/CJS typed consumers; packed format fixtures exercise new publisher/owner APIs. Hosted browser/Next compilation remains S17/S18, not claimed here.

## Scope and readability

src/dispatcher.ts128 lines; private topology helper56; model28; focused topology tests120. Cohesive responsibilities, no size exceptions, second dispatcher, scope registry or graph renderer. Necessary consumer fixture updates extend S02 proofs rather than replace them. [API details](../../architecture/dispatcher.md). The test pointer moves from the growing dispatcher test to a discovered sibling file per SP1; behavior/condition ownership is unchanged.

Toolchain: selected Node26.13.0/npm11.20.0 via command-local /tmp/node-v26.13.0-darwin-arm64/bin PATH; no global changes. Dependencies/lock unchanged (SHA256:bf9c99a9567367299e8e5f4afb613fe457a513ad43d1513594af781f2f862bbd). Existing baseline applies to unchanged tooling; prior dispatcher behavior proof is preserved and extended.

Final gate and publication evidence follows. No S03 merge or S04 readiness release claimed.

## Final verification

npm run build and targeted topology tests exit0. npm run check exits0 on final source/config (build, generated-declaration consumers, strict types, lint). npm run coverage exits0 with20 tests, none skipped:100% measured statements/lines/branches for changed dispatcher, topology helper, model schema and entry files, plus inherited files/shim. No exclusions, skipped scenarios or threshold changes. Local raw coverage copy: /tmp/fbp-s03-evidence/coverage-final.json; check log: /tmp/fbp-s03-evidence/check.log. Guidance integrity and diff whitespace checks pass. Documentation/receipt-only changes do not invalidate runtime receipts. Hosted CI/browser/provider tests not claimed; S17/S18 own browser integration.

Implementation, C51 proof and quality/coverage gates complete; publication follows. S04 still requires S03 merge and identity-contract readiness checks.
