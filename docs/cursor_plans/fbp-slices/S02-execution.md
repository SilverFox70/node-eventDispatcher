# S02 execution receipt

Authority: user requested S02 execution on2026-10-29 after discussing independent dispatchers with optional shared use. Tasks S02.A–C only. Branch codex/fbp-02-dispatcher-core; base ef8c6bfb67c63316024d91632e2ace0dc67a468e, current master including PR6 dependency remediation and PR7 roadmap clarification. S01 prerequisite verified MERGED at e82ea08497d9e08f52a35b007d06ac667e9fadae. User .DS_Store and .feedback-log/ preserved. No S03 execution or merge claimed.

## S02.A — behavioral red

Old implementation was tested through valid legacy calls before replacement. /tmp/fbp-s02-evidence/legacy-red.log retains node --test test/dispatcher.test.js output, exit1: adjacent once listeners produced ordinary count1 instead of2; A removing B/adding C delivered A,C instead of A,B; missing cleanup threw ReferenceError; guarded recursive once invoked3 times instead of1. These are behavioral failures, not missing-module setup failures.

## S02.B — implementation and bounded amendment

- src/dispatcher.ts owns one synchronous dispatcher implementation. Map-backed instance registrations, snapshot delivery, per-registration once-consumed state, first matching callback removal, validation, detached getter collections and optional singleton.
- src/dispatcher/log.ts owns bounded metadata-only logging; default1000, integer0–10000, logger starts off, oldest entries discarded. No payload/context/function-source retention.
- Legacy CommonJS file is a four-line shim to built CJS; package subpath export and packed consumer tests prove it shares the CommonJS root singleton. ESM/CJS remain distinct module instances, documented; explicit instances are usable across boundaries.
- Necessary consumer updates: old characterization now expects fixed cleanup and original once callback references; generated-declaration fixtures accept typed callback arguments and reject non-string names/non-callable listeners/bad option types. Packed ESM/CJS consumers exercise actual delivery, not just import.
- Minimal build prerequisite: tsconfig.base.json now explicitly includes installed Node types. TypeScript6 did not automatically resolve node:crypto when the first real Node source arrived. This does not change dependency versions or weaken strictness. Initial setup build failure was classified separately from behavioral red.
- shortid had already been removed by the merged remediation; no dependency change or reintroduction. Lock SHA256:bf9c99a9567367299e8e5f4afb613fe457a513ad43d1513594af781f2f862bbd.

## C01–C05 proof handoff

| Condition | Assertion pointer / outcome |
| --- | --- |
| C01 | dispatcher.test.js once removal / recursive once / recursive snapshots: counts1,1,2; once consumed before invocation/throw, never repeated by recursion |
| C02 | snapshot membership: first A,B, next A,C; cleanup during emit preserves current snapshot |
| C03 | idempotent cleanup / duplicates: absent false twice; original callback removes once; first duplicate only; empty event remains known until unsubscribed |
| C04 | legacy arguments and throw: positional2,3/context identity, scalar argument, no-listener no-op, sentinel stops dispatch; resolved async return ignored |
| C05 | isolated bounded inspection: distinct instances; detached getter/log snapshots; limit2 retains2; default1000 retains1000; limit0 retains0; metadata keys only |

Additional boundary tests cover invalid calls before registration/log mutation, limit/type bounds, prototype-like event names and direct/package legacy singleton identity. test/package.test.js proves tarball runtime/declaration adoption in both formats. Existing localhost HTTP and coverage-canary proofs remain in the full suite.

## S02.C — verification and scope

Commands run from repository root using command-local PATH=/tmp/node-v26.13.0-darwin-arm64/bin:$PATH (Node26.13.0/npm11.20.0), without a global installation change. Scope: dispatcher sources/shim/export, necessary consumer/Node-type setup updates and feature documentation/receipts. No topology, ownership metadata, graph/channel runtime or async emitter delivered.

Readability review: dispatcher109 lines, log helper31 lines, shim4 lines; core tests and boundary tests are separated by responsibility, each under200 lines. No size exception or competing dispatcher. [API/migration](../../architecture/dispatcher.md) records metadata/getter changes and synchronous-only behavior. Earlier baseline's once/cleanup observations are superseded by the explicit C01–C03 fixes; original historical record remains intact.

Final gate/publication receipts follow. Branch implementation success is not merge evidence; S03 waits for actual S02 review/merge.

## Final gate receipt

Final source/config candidate: npm run build exit0; node --test test/dispatcher.test.js test/dispatcher-boundaries.test.js exit0 (11 focused tests); npm run check exit0; npm run coverage exit0 (16 total tests, none skipped). c8 reports100% statements/lines/branches for dispatcher.ts, dispatcher/log.ts, index.ts and the legacy shim; inherited HTTP and scaffold files also pass. Report contains mapped TS paths, not duplicate generated implementations. No unreachable-region exceptions or relaxed thresholds. Local raw logs: /tmp/fbp-s02-evidence/build.log, focused.log, check.log, coverage.log; coverage/coverage-final.json and HTML are ignored local artifacts. Guidance integrity and git diff --check pass. Documentation-only receipt updates do not invalidate source/config receipts.

Implementation, C01–C05 behavioral proof and quality/coverage gates are complete. Publication is prepared below; no merge inferred. No hosted CI/Next/browser/provider run applies to S02.
