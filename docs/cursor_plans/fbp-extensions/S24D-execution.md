# S24D execution receipt

2026-11-05. User requested S24D after PR39 merged. Verified GitHub and fetched master at c46582a0059ca1f4ff2d5b6ae190d79761e3b332. Branch codex/fbp-24d-revision-comparison.

## EV1-r5 comparison contract

Compare one fixed reviewed case. Each side declares the reviewed fixture, an execution identity preimage, exact dependency roles, deterministic injected facts, a graph builder and optional one-to-one logical node aliases. Validate both fixtures, revision identities and roles before building either graph. Validate both built graph specs and contracts before starting either runtime. The fixture's recorded identity must match the baseline. The candidate has its own explicit identity. Both builders receive fresh copies of the same scripted service cursors.

Reuse S24C review, packet construction and scripted services and the existing production runGraph harness. Its existing opt-in observation includes bounded diagnostic metadata for path comparison. Normal runGraph callers keep the same shape. Compare stable per-port output occurrence, per-node decision and failure order, and transfer paths keyed by admission or producing node/port occurrence. Ignore run/packet/operation/attempt UUIDs and timings. Report topology and declared digest changes separately. Incompatible, incomplete or unspecified facts produce not-comparable without an equality verdict.

### Selected public interface

`compareFixture({baseline,candidate})` is available from `event-driven-design/testing`. Each side contains a passive reviewed fixture, role allowlist and approval callback, `deterministic: true`, its execution identity preimage, a trusted graph builder and optional node-to-origin aliases. Fixture digests and actual reviewed values must agree. The runtime, policy schema and service profile versions must also match. Graph and per-component code/contract digests may differ. Built graph topology is checked against the declared preimage before either run starts.

A comparable report carries case ID, fixture and dependency-script SHA256 digests, each side's execution/graph/code/contract digests, and changed and unchanged observations. A row uses kind, logical origin and zero-based occurrence. An absent side omits its value. Decisions include safe fact names/paths and logical source packet references. Transfer parent and packet links use producing or admitted origin and occurrence. Attempt failure codes and run failure state are observed separately from output values. Side-by-side runtime timestamps are outside the semantic comparison.

The bounded observation has no semantic verdict if required facts differ, approved revision bindings are missing, contracts reject, script consumption differs, or loss/rejected evidence prevents alignment. Origin aliases must name real graph nodes and must be one-to-one after applying defaults. `equal-on-fixtures` applies to the case and retained observations. The host owns the declared code and contract digests and supplies trusted local bindings. The installed proof runs with network permission disabled.

### Condition proof

- X24D.1: `test/revision-comparison.test.js` checks same reviewed fixture and digest, changed facts and service profile, missing bindings, fixed runtime provenance, origin collisions, and zero graph builds for preflight refusals.
- X24D.2: real forked production graph runs 100 through both branches. Tax moves 10→20 and records v1→v2, while base remains 100. Repeated independent runs compare equal across fresh IDs, and explicit renamed origin mapping preserves comparable paths. A new filter produces a path and observed decision difference. A clean installed consumer runs this case with network denied.
- X24D.3: tests exercise mismatched built topology, incompatible expected contract, rejected decisions, unused scripted steps, missing parent origins and evicted evidence. A real failed node appears as an observed difference rather than an invented output. Missing sides are omitted. Multi-packet fixtures align by occurrence.

### Scope

The shared harness exposes its existing opt-in diagnostic snapshot alongside decisions. The prior fixture runner shares packet construction, role service cursors and contract preflight with the comparator. Only the comparator skips baseline decision declarations on the candidate side so it can observe rule revisions. The existing EV1 canonical SHA256 primitive is reused for proof digests. Normal test harness results and production runtime execution remain intact. S24D's public boundary is the installed testing API. No Next UI/server source changed.

### Verification and handoff

- Pinned Node 26.13.0 and npm 11.20.0 through command-local paths. Core lock SHA256 `7a72e97113003c27a10944f869b802f0d43474198662b7d0d2cdeffac49dac01`. Coverage configuration SHA256 `a51b73a30558dee8669138729a50ea64d2e5591f0b8c48a20f449b11a124c787`.
- `npm run coverage` exited 0 with 299/299 core, installed package and stress tests. All configured production files cleared the unchanged per-file gate. The only later production change is the actual value equality check in the comparator alongside the canonical hash, to refuse distinct JavaScript values such as negative and positive zero. Final `npm run check` and all five focused comparison tests exited 0. The three comparison modules report 100% statements, lines and branches on the final build. Logs `/tmp/fbp-s24d-coverage.log`, `/tmp/fbp-s24d-handoff-check.log` and `/tmp/fbp-s24d-handoff-focused.log`.
- Final focused proof packs and installs a fresh consumer, runs the public testing API with Node network permission denied, and verifies the 10→20 change. Guidance links and whitespace checks passed. Next/browser changes are outside this slice's implementation. S24B's production browser proof remains scoped to that slice.
- Readability review separates revision validation, observation normalization and result comparison. No new package dependencies, CI changes or runtime policy changes. The pre-change package did not expose a comparison entry point, so no missing-export failure is reported as behavioral red.
- Implementation and X24D.1–3 proof complete. S24E requires the actual S24D merge and its own request.

Publication receipt: implementation commit `c873990077e77b073a842e9a8e0c9f54950347b1` pushed. GitHub confirmed [PR40](https://github.com/SilverFox70/node-eventDispatcher/pull/40) open against master. This follow-up is documentation only. User-local .DS_Store and .feedback-log remain uncommitted.
