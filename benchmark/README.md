# Reproducible runtime load observations

From the repository root with the pinned Node/npm versions and dependencies installed:

```sh
npm run build
node benchmark/throughput.cjs
```

The command prints one JSON hardware/runtime/revision header and four measurements:100000 source packets through three maps and through broadcast→two async maps→keyed join, each at connection capacities1/16. Every run checks exact counts, values, sums, keys, lineage shape, channel occupancy and cleanup before reporting success. It runs offline, using the production compiler, contracts, channels and runtime. Failure exits nonzero.

Output includes elapsed milliseconds, source packets per second, eleven sampled heap readings, and each real channel's high-water occupancy and maximum in-flight read/write operations. These are observations on this machine with channel instrumentation enabled, not uninstrumented peak performance, a service SLA or a memory ceiling. No forced GC or flaky speed/byte assertions. Identity ledgers and completed-join histories deliberately grow within configured limits until run termination; sampled process heap also includes GC scheduling and previous runs.

Large fixtures explicitly set executionRecordLimit1048576 and, for joins, completedGroupLimit100000. Defaults remain65536; no identity eviction, completed-group reuse or automatic retry is enabled. Graphs have no public ingress/egress collectors: a real source generates incrementing keyed packets and a sink retains totals rather than100000 output packets. Connection backpressure remains active. The shared fixture restores its test-process channel observer in finally; it does not alter library source or add a runtime scheduler.

For correctness/resource checks, run the focused suites after building:

```sh
node --test test/integration.test.js test/stress.test.js
```

They additionally exercise controlled key interleaving, branch failure/late-result suppression,100 repeated finish/cancel cycles, and capacity2 with a deliberately gated slow sink for both completion and cancellation. Tests inspect owned queues/waits/timers/listeners, not global process-handle counts. The full project gates still own regression, declaration, lint and source-mapped coverage checks. Recorded observations and candidate identity live in [the S15 receipt](../docs/cursor_plans/fbp-slices/S15-execution.md).
