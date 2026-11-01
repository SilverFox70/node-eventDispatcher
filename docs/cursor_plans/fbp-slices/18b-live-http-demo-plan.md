# S18B — Live API flows and controlled HTTP stress

User authorized execution2026-10-31. Previous S18A merged in PR #29 at19cd6b639ac766da9ad06ccaf1f14460e774b09f. Branch codex/fbp-18b-live-http-demo; next S19, unstarted. Read SP1 and the existing EX1 observation contract. This slice adds application examples/tests, not new framework APIs.

## HTTP1 contract

Explicitly selecting the live demonstration runs three fixed Pokémon jobs (pikachu, bulbasaur, charmander). The existing broadcast forks each name to typed stats/species function nodes; both await real GET responses under node-operation cancellation/deadlines. Existing joinByKey collates by job/key with two immediate parents. No artificial service delays, automatic node retries, arbitrary URL input, credentials or mutations. Public service is PokéAPI v2, free/no-key; respect its caching/fair-use policy. Server fetch caches successful public resources for one hour; UI labels public/cached results accurately rather than claiming every run reaches origin. Fixed endpoint/response byte limits, ingress schema validation, no redirect following and finite budgets bound each operation. Malformed responses and HTTP errors fail visibly without invented results or fallback data.

Live mode is an explicit user action, separate from the existing offline account demo. It opts into capturing these public results and explains that capture choice. Existing optional capture controls still apply. Inspector shows actual graph/trace/counters and collated output cards; switching/restarting/disconnecting disposes the prior run. Tests never depend on a public provider. A server-owned loopback-only override supplies the same endpoint shapes in production HTTP/browser tests; clients cannot specify upstream hosts. No persistent execution, diagnostic policy extension, visual editing or S19 work.

Heavy stress targets our owned real HTTP service, not public APIs. Use independent runtime jobs and bounded concurrent runs; assert exact results/correlation/lineage, observed simultaneous I/O and server cleanup. Controlled gates exercise slow/held responses, errors, malformed/oversize JSON, dropped sockets, cancellation and timeout with no unintended retries or late outputs. Report throughput/latency as observations, never timing SLAs. An explicit harness command runs this acceptance boundary; default offline core tests stay offline.

### S18B.A — plan and characterize

Save HTTP1, order/conditions and actual predecessor; add production HTTP assertions that fail when the intended boundary is bypassed (not missing-module/setup failures).

### S18B.B — deliver live example

Own fixture lib/pokemon-*.ts; inspection route/UI/results additions and topology-derived card columns/layout (parallel branches must look parallel); scoped server startup injection and test helpers. Use the one installed compiler/runtime and EX1 trace. No src changes/dependencies anticipated.

### S18B.C — prove real HTTP behavior

Own test/next/http*.cjs or .js, production browser tests and scripts/test-next.mjs invocation. Harness uses loopback and bounded workers, retaining machine observations and failure/cleanup evidence. Public smoke is explicit manual proof only.

### S18B.D — verify and review

Update README/examples/Next guide, architecture map and slice receipt. Required: npm run check, applicable core/package regression receipt, npm run test:next including all-files95% fixture coverage and negative controls, guidance/diff checks; explicit public smoke and visual QA. Commit/push/PR under standing authorization; stop for review, do not merge/start S19.

Allowed changes: fixtures/next-consumer/app/**, lib/pokemon-*.ts and inspection integration; scripts/next/**, scripts/test-next.mjs, package.json scripts only; test/next/**; relevant docs/README/examples guide. No root dependency/lock or src contract changes. C74–C80 in master own final proofs; journal records exact exits/artifacts and limitations.
