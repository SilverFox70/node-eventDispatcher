# S18 execution receipt

## Scope and base

User requested S18 continuation after merging PR #27. Branch `codex/fbp-18-graphical-inspector`, base `56e1fb155fd26f3bb055cb343f68421771789a89`. S17 predecessor merged as PR #26 at `6747624ae9c78c72e2f1654ac817f8409a751c9e`; all four predecessor CI checks passed. Existing `.DS_Store` and `.feedback-log/` are preserved.

## S18.A — design and proof preparation

LV2 in the saved plan freezes the minimal dispatcher notification producer and scoped SSE/browser lifecycle. No public scope watch API, global run/session registry or payload history is introduced. Initial API cannot notify topology changes, so producer paths/proofs are explicitly amended before implementation. Existing tooling/pins/locks and real runtime are reused. Tests-first red and subsequent gates are pending.


## Behavioral red and integration progress

Observer tests failed against S17 with actual undefined-not-function assertions (producer-red.log under /tmp paths below); implementation makes both tests pass. The first UI red was invalid setup (missing task-local Chromium), not behavioral proof. After installing the pinned browser, the exact inspector story failed against the retained S17 production app because the expected inspector heading was absent (ui-red-actual.log). Source/dirty state of that isolated predecessor was not edited.

The first S18 production build refused an incorrect public NodeHandle.id assumption; changed to emitted GraphSpec identity. All224 core tests pass with100% coverage for dispatcher.ts and dispatcher/changes.ts. Existing package/legacy/runtime tests remain intact. Build/type/declaration/lint check passes. Production browser tests prove SVG/text parity, keyboard details, source selection, inert labels, automatic once/off/publisher/new-subscription updates and navigation cleanup.

Offline emulation did not terminate an already-open EventSource; this was a test setup assumption, not a missing reconnect implementation. The replacement test uses a real server-owned short lease and observes disconnected/stale status followed by automatic fresh connection. All10 consumer/inspector/state tests pass in the isolated corrected app. Final fresh-artifact gates are pending.

Coverage investigation found two independent tooling gaps: disposable Next build workers exit on SIGINT without flushing late executed ranges; an explicit preload flushes worker coverage before signal exit. Separately, an unmapped empty generated CSS module (()=>{}) inherited the preceding source’s closing brace under v8-to-istanbul's nearest mapping, falsely reporting the page's final line uncovered. The mapper now removes only exactly empty arrow stubs with no mapping inside their range; authored mapped empty functions and unmapped executable functions remain measured, proved by focused assertions. Thresholds/denominator stay unchanged; real authored functions/branches are not ignored. New worker coverage also exposed the new ordinary subscriber callback had not been exercised; the demonstration now emits after registration and proves that regular subscription remains active.

Local raw evidence: /tmp/fbp-s18-producer-red.log, /tmp/fbp-s18-producer-green.log, /tmp/fbp-s18-ui-red-actual.log, /tmp/fbp-s18-core-coverage.log, /tmp/fbp-s18-check-final.log, /tmp/fbp-s18-browser-2.log and task-owned fbp-next-KclNaG/evidence under the printed system temp path. Failed build/coverage captures are retained separately. These are local-only receipts, not hosted merge evidence.


## Accepted local gates and handoff

- Pinned Node26.13.0/npm11.20.0; root lock SHA2567a72e97113003c27a10944f869b802f0d43474198662b7d0d2cdeffac49dac01 unchanged. No root/fixture dependency additions or lock changes.
- `npm run coverage` → exit0,224 tests/0 failures/skips; changed dispatcher.ts and dispatcher/changes.ts100% statements/lines/branches. /tmp/fbp-s18-core-coverage.log. Later changes were isolated fixture/presentation/tooling/docs; core production code and denominator stayed unchanged, so this receipt is reused.
- `npm run check` → exit0, final /tmp/fbp-s18-check-release.log: build, strict source/generated-declaration consumers including observer types, lint of scripts/tests/fixture JSX. No missing-module or setup failure counted as behavioral green.
- `npm run test:next` → exit0, final /tmp/fbp-s18-next-release-2.log:14 actual production HTTP/browser/controlled-state/worker/source-map cases,0 failures/skips. Server-only build mutation, emitted client-capability mutation and never-imported-file0% coverage negative control each fail as intended and restore source/assets before positive acceptance. The final actual tarball manifest, raw V8 data, production maps, screenshots, HTTP/server logs and refreshed positive coverage remain in `/private/var/folders/s7/ycx3c31d7tl_xw7ykf3p9ym40000gs/T/fbp-next-rxC2wu/evidence`.
- All17 executable fixture TS/TSX files meet per-file95% statements/lines/branches. All have100% lines/statements. Branches100% except the existing demo route's96.29% defensive infrastructure catch and inspector.tsx's95.65% invalid-graph render guard, unreachable through the connection's prior shared model admission. Invalid incoming metadata is explicitly rejected/displayed by the connection/browser tests; the guard remains measured, not ignored. Function percentages are not substituted for the required metrics or claimed100%.
- Actual real-interval browser assertions prove once removal, off, publisher disposal and new subscriber update SVG/text without refresh. The lifecycle test proves real server lease closure→stale status→automatic reconnect/fresh snapshot, and navigation closes the owned request. Unit tests use controlled notifications/timers for pre-abort, cancellation, lease, slow readers, faults, stale callbacks, sequence refusal and all four arrow directions. Event identities are stable when event ordering changes. No database/provider/Edge/multi-browser/durable session claim.
- Visual QA inspected final graph/event screenshots. Removed forced SVG minimum width that clipped a focused left card; extracted22-line pure layout helper and tested facing-boundary arrows so the upward input arrowhead remains visible. No layout engine dependency. Simple rows/columns are intentional; automatic graph editing/layout optimization remain future work.
- Guidance integrity92 Markdown/479 links/22 slices/84 condition owners passes; git diff --check passes. These are links/order/whitespace checks, not substitute runtime proof.

Readability: producer27 lines plus narrow dispatcher integration; client connection27, diagram metadata47, fixture55, stream55, layout22, SVG35, inspector44, route14, page5. Pure layout is shared by rendering/tests; transport/model/presentation are separate cohesive responsibilities, no duplicate validator/executor or utility dumping ground. New test modules stay under200 lines. Existing long historical ledgers/generated locks stay intact. No handwritten production file needs a size exception. User artifacts are untouched.

S18.A/B/C implementation, behavioral proof and local quality/coverage are complete. Publication/hosted CI follow; S18 is not merged and S19 is unstarted. Adapting this demonstration to application-owned sources requires the application's host/access-control/lifetime policy; reconnecting a viewer does not authorize re-executing business jobs.
