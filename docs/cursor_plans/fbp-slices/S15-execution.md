# S15 execution receipt

User requested “proceed” after S15 explanation, authorizing S15.A–C and the standing branch/commit/push/PR workflow. The repository fbp-slice-execution skill applies. S14 PR23 verified MERGED at75fb972bd685bdc15d68d7624d3d34017024b453, fetched before creating codex/fbp-15-reliability-load from origin/master. User .DS_Store/.feedback-log preserved; no S16 work or merge authorization inferred.

## Bounded implementation and proof progress

This slice adds real-runtime integration/stress tests and a reproducible benchmark. No production defect has been observed and no src change is currently needed. Shared benchmark/flow-fixture.cjs constructs real source/three-map/sink and source/broadcast/two-async-map/keyed-join/sink graphs. It retains totals and eleven periodic heap observations, not packet histories or an unbounded seen-ID registry. A test/benchmark-process-only channel factory wrapper delegates every operation to the production channel, observes occupancy and active read/write counts, and restores the factory in finally. Queue/ledger/history policies are unchanged. Explicit existing executionRecordLimit1048576 and join completedGroupLimit100000 support the large fixtures without modifying production defaults.

C27: two-key same-job integration controls right-x until left-y has entered, asserting exact interleaving, results and immediate lineage at each real edge. Small two-packet event observation is test-local. Branch throw waits until peer entered, then asserts original failed terminal, peer abort, one call each/no replay, no sink output and no late emission after releasing the peer.100 finish/cancel cycles assert owned channel waits/queues and exact timer/listener counters return0. No sleeps or global handle counts.

Meaningful proof negative: a temporary test copy changed the expected joined left value4→5, ran only the named interleaved-correlations test against the unchanged production runtime, and failed ERR_ASSERTION with actual exit1. /tmp/fbp-s15-evidence/red.log records that result; the temporary copy is removed in finally and pristine source is unchanged. Performance measurements are characterization, not fabricated pre-fix failures. Any newly evidenced production defect requires its own red proof and bounded fix.

C26:100000-packet exact key/value/count/sum tests at capacities1/16 for both shapes; separate authoritative capacity2 slow-sink completion/abort controls prove real backpressure. All-channel high-water<=capacity and max concurrent reader/writer<=1; clean terminal channels have queued0/pendingReadfalse/pendingSendfalse and active observers0. Throughput/heap are observational, never fixed-time/byte gates. C31 reuses the existing unchanged all-files source-mapped coverage canary; lint discovery expands to the delivered benchmark only.

Evidence local under /tmp/fbp-s15-evidence. Final verification/coverage/benchmark/publication pending. No passing gate or source-fix claim implied by this progress record.

## Final verification and handoff

Repository root, command-local PATH=/tmp/node-v26.13.0-darwin-arm64/bin:$PATH; Node26.13.0/npm11.20.0. Actual base75fb972bd685bdc15d68d7624d3d34017024b453; verification runs on the S15 working-tree candidate whose files are committed with this receipt. No src, dependency, lock, build, runtime default or coverage configuration/threshold change. Lock SHA256 bf9c99a9567367299e8e5f4afb613fe457a513ad43d1513594af781f2f862bbd unchanged. Benchmark fixture SHA25675634e2748e6ba7d759823afde1b80aecbe82c422c175e26e2b8eba6bf4f38c9; runner SHA2560b0e6cf5dee047334763677b74b6cba894a64345841c4fafc28f746f060d67bb. The standalone benchmark header records base revision plus these exact working-tree content identities, not a fictional already-committed candidate.

- npm run check → exit0 (check.log): dual builds, strict source/generated declaration consumers and lint. After adding benchmark content hashes, npm run lint → exit0 (lint-final.log) refreshes that file's affected gate; no type/build change. Benchmark files are now included in normal lint discovery.
- Initial node --test test/integration.test.js test/stress.test.js → exit0,8 passes (focused.log); this predates the added capacity2 completion subcase. Final full runs below include all9 new tests and supersede that bounded receipt.
- npm_config_cache=/tmp/fbp-npm-cache npm test → exit0,212 passes/0 failures/skips (test.log). Includes all9 S15 tests,100 repeated lifecycle cycles and five completed100000-packet flows plus controlled abort.
- npm_config_cache=/tmp/fbp-npm-cache npm run coverage → exit0,212 passes/0 failures/skips (coverage.log); all delivered production source meets required per-file95% statement/line/branch gates, with100% across those metrics. Existing unused private function counters remain inherited, not a newly excluded denominator. coverage-final.json retained locally. S15 introduces verification/benchmark code rather than shipped production source; no changed production condition requires a new coverage exception. C31's unexecuted-production canary passes in the same full run; instrumentation configuration is unchanged. Existing isolated recipe coverage and declaration/package tests also pass in that run.
- node benchmark/throughput.cjs → exit0 (benchmark.jsonl/benchmark.err): exactly one identity/hardware header plus four successful measurements,100000 packets each. Exact pipeline sum5000250000 and fork/join sum15000850000, eleven heap samples each; every channel high-water within capacity and maximum in-flight reads/writes1. Empty stderr. Structured output was additionally parsed/asserted, not merely assumed complete from exit0.
- node scripts/check-agent-guidance.mjs → exit0 (guidance-final.log):88 Markdown/475 local links/22 slices/84 condition owners. Links/order only. git diff --check passes after correcting an extra Markdown EOF blank line.

The deliberately wrong expected-value copy fails actual exit1/ERR_ASSERTION (red.log); pristine files restored/temporary test absent. No product bug, weakened assertion, ignored test or production fix was needed. All expensive final gates ran sequentially; standalone benchmark followed coverage so its observations do not overlap another verification workload. No performance number is a pass threshold.

Standalone observations on Apple M1 Pro,10 logical CPUs,32GiB RAM, darwin/arm64, pinned Node/npm, instrumented real channels and no forced GC:

| Shape | Edge capacity | Seconds | Source packets/s | Sampled heap range MiB |
| --- | --- | --- | --- | --- |
| pipeline | 1 | 3.71 | 26928 | 10.6–86.4 |
| pipeline | 16 | 3.60 | 27812 | 56.0–137.3 |
| fork-join | 1 | 5.59 | 17885 | 89.4–193.4 |
| fork-join | 16 | 6.17 | 16200 | 74.4–260.1 |

These are source-request rates, not total internal packet deliveries. Heap includes bounded identity/history records, library state, test instrumentation, preceding runs and ordinary GC timing; sampled maxima are not proven peak usage or release guarantees. Reproducible assertions, owned resource counters and bounded graph policies are the acceptance evidence, not flat memory or a speed promise. Default small-run limits remain unchanged. No durable recovery, provider/database, browser/Next, deterministic frame, or installed-cookbook proof is claimed.

Readability reviewed: benchmark fixture112 lines, runner18, integration97, stress37. The shared fixture owns load graph construction, constant-size real-channel observation and the measurement assertions used by both stress and benchmark, with public runtime orchestration unchanged. The tiny integration-only two-packet trace is bounded; no unbounded packet history is retained by load fixtures. No file needs a size exception or miscellaneous helper hierarchy. Documentation/README/map explain actual progress and how to reproduce observations. User artifacts untouched.

Implementation, C26/C27 integration/load/resource proofs, reused C31, quality gates and coverage complete. Publication follows; S16 remains unstarted and requires actual S15 merge.
