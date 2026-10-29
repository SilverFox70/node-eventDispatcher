# S15 — Prove composed flows and sustained bounded execution

Contract version: 2  
Slice revision: r2, 2026-10-29  
Readiness: blocked-on-decision  
Execution: not-started; approved task set: none  
Branch: `codex/fbp-15-reliability-load`  
Parent: master r6 / SC-FBP-4 + proposed IC1-r2 / SP1-r2; acceptance pending.

## Story and branch outcome

A maintainer has reproducible evidence that the assembled runtime stays correct under interleaving, failure and sustained load.

This is one feature/task branch, not permission to execute the full roadmap. The three bounded tasks below belong to this one outcome. One agent session is the sizing target; unresolved prerequisites stop execution rather than expand it.

## Provenance, order and entry conditions

Source: master `9cb666dc6c846512d64edd39770b7eb2f213256c`; old JS prototype inspected, new interfaces not yet implemented. This plan is a future change proposal, not a live-source/coverage success claim. Baseline: S01 captures `fbp-pre-modernization-r2`; later slices verify applicability/reuse it. Existing placeholder npm test exit1 is known from planning; no new checks run here.

- Read [execution index](INDEX.md), [shared contract](shared-execution.md), [master plan](../fbp-foundation-plan.md), then this file.
- Previous: [S14 — Test nodes and whole graphs with the real runtime](14-public-test-sdk-plan.md).
- Base: updated `master` after predecessor is actually merged; never an unmerged sibling feature branch.
- Required predecessor evidence: S14 merged into master, with accepted proof and exact merge SHA recorded.
- Next: [S16 — Install the framework and author/test nodes outside the repo](16-package-cookbook-plan.md).
- Readiness gate: IC1-r2 is now concrete and applied to this proposal; execution remains blocked until its human acceptance and actual S00 merge.
- Legacy master work: T9.

## Solution contract and condition ownership

Shared contract: master SC-FBP-4 + [SP1](shared-execution.md); S00 is the only identity-amendment producer. Conditions contributed by this feature: **C26, C27, C31**. Exact fixtures/assertions live in the master's authoritative ledger; final condition completion owners (including split cases) are in SP1. Reuse predecessor assertions rather than inventing a second truth table. C55–C65 are specified by IC1-r2; acceptance remains pending. S00 walkthroughs are not implementation proof.

## Observable behavior and boundaries

1. Prove full source→broadcast→async maps→join→sink for two interleaved correlations with exact values/identities and completed; branch error aborts peers/no replay/late emission.
2. Run100000 packets through3 maps and fork/join at capacities1/16; exact counts/sums/keys, high-water<=capacity, <=1 pending writer/reader;100 repeated finish/cancel cycles return resource counters to baseline.
3. Record throughput and sampled heap with hardware/tool identity as observations, no flaky wall-time gates. Reconcile every reachable changed condition and source-mapped per-file coverage; reuse applicable prior evidence rather than repeat all suites without reason.

### Exact allowed-change boundary

- `test/integration.test.js`
- `test/stress.test.js`
- `benchmark/throughput.cjs`
- `docs/cursor_plans/fbp-slices/S15-execution.md`
- `src/** only for a precisely evidenced defect; contract changes return to planning`

Also allowed: this slice's future `S15-execution.md`, append-only local workflow telemetry and necessary index/manifest evidence updates. Generated dist/coverage output is local tooling output, not a license for source changes elsewhere. Existing files are read before editing; future paths are intentional proposed destinations.

### Preserve and exclude

- No new features, performance promises without evidence, broad refactor or metric relaxation. Scoped bug fix must stay within frozen semantics.

Preserve every earlier merged feature's assertions, safe browser/server boundary and JSON/admission-versus-generic-transport separation. No network/provider side effects in unit tests; only localhost adapters/fixture where explicitly owned. Do not introduce global registries or retries to hide missing correlation/lifecycle behavior.

## Planned proof pointers

- `test/stress.test.js::bounded sustained pipeline`
- `test/integration.test.js::whole network composition and failure`

State/setup/order/exact assertions are the cited master condition rows plus Observable behavior above. Proof strength: type fixtures for authoring, real primitive/runtime integration for execution, isolated packed consumers for distribution, production Next/HTTP/browser for UI. Helper-only greens do not prove a downstream layer. No tests exist yet unless delivered by a predecessor.

## Task contracts

### S15.A — establish this feature's contracts and failing proofs

Purpose/references: the story and conditions above. Prerequisites: S14 merged into master, with accepted proof and exact merge SHA recorded; apply the shared identity-release gate when applicable. Read: parent contract sections corresponding to this feature, shared-execution.md and delivered predecessor symbols. Allowed changes: tests/type fixtures listed in the allowlist, minimal interface scaffold needed to reach the intended behavior, and local journal. Required behavior: establish explicit fixtures/order/outcomes from the linked master ledger before production logic. Named proof targets: test/stress.test.js::bounded sustained pipeline; test/integration.test.js::whole network composition and failure. Preservation: do not duplicate existing cases that already assert the same boundary; extend their tables. Verification/red: A deliberately wrong ordering/count/cleanup invariant must fail named assertion; before-fix red for any production defect. Performance baseline can be initial observation with no fabricated red. Completion: retain actual expected nonzero exits/assertion pointers and valid setups; missing module/setup error is not behavioral proof. Stop if predecessor interface, identity amendment or contract semantics are missing.

### S15.B — deliver the bounded feature

Prerequisites: S15.A meaningful failures or documented characterization/design exception. Read the same contract, existing callers and test failures. Allowed changes: production/config/docs paths explicitly listed above and only their necessary public export/declaration consumer updates. Required behavior: all numbered items in Observable behavior and boundaries, with side effects owned by this slice. Preserve the Exclusions and shared invariants. Verification: make named fixtures green through actual delivered interfaces, inspect diff for extra functionality and run the focused commands below. Completion: allowed-path diff plus green evidence; passing unit tests alone is not integrated acceptance. Return to planning if scope requires new semantics, unimplemented later-slice API, widened any types or excluded recovery/features.

### S15.C — accept the story and hand off the branch

Prerequisite: S15.B implementation. Allowed changes: focused evidence-driven fixes within the same allowlist, feature documentation, journal and index/manifest status from actual evidence. Verify story via the Acceptance demonstration, scoped commands, declaration/import paths and meaningful-condition audit. Measure applicable changed production files with S01 coverage config; reuse valid outputs and classify failures against the baseline. Completion evidence: Integrated reliability receipt tied to candidate revision/config, not a mock-only claim; S16 can package validated core. Record implementation/proof/gates/coverage/publication separately; do not mark merged from a passing local branch. Stop at this branch's outcome. Next slice cannot start until actual merge into master. Publication only with user authorization; planning request has not granted execution.

## Acceptance demonstration and handoff

Recognizable accepted outcome: **A maintainer has reproducible evidence that the assembled runtime stays correct under interleaving, failure and sustained load.**

Handoff artifact/interface: Integrated reliability receipt tied to candidate revision/config, not a mock-only claim; S16 can package validated core.

Exact verification commands for this scope (S01 creates tooling; later commands assume merged scripts):

```sh
npm run check
npm test
npm run coverage
node benchmark/throughput.cjs
```

Commands must return actual individual exits. `npm run coverage` uses the all-delivered-production denominator, including never-executed changed files. Types-only/docs-only scopes are coverage N/A with reason; S00 does not run implementation tests. UI/Figma/DB checks are N/A unless the feature explicitly owns them: S17 production Next boundary, S18 SVG/keyboard/UI, no DB/Figma source in this series. No external publication is part of the acceptance demonstration.

## IC1-r2 amendment and added proof scope

Canonical proposed identity contract: [IC1-r2](../fbp-identity-contract.md). Exercise IC1 job/lineage/correlation invariants in existing composed/stress fixtures without an unbounded seen-ID table. Add identity receipts to handoff; no claim to durable recovery from an in-memory load test. Human acceptance remains pending; this section settles the proposal, not release authority.

## Readiness evidence

| Gate | Verdict | Concrete artifact pointers |
| --- | --- | --- |
| G1 interfaces | GAP: IC1-r2 acceptance pending | Shared contract + Observable behavior; IC1-r2 freezes proposed interfaces; human acceptance still blocks execution |
| G2 ownership | PASS | Previous/base/next, numbered boundaries, SP1 handoff graph; sole feature branch above |
| G3 proof scenarios | PASS for settled proposed fixtures; acceptance pending | Master condition pointers and named assertions; no invented test result |
| G4 effects/recovery | GAP if identity propagation affects this feature | Master §§6/7/14 + explicit exclusions; no implicit persistence/retry; identity choice held at S00 |
| G5 bounded tasks | PASS | S15.A→B→C (S00 design-specific sequence), exact allowlist and stop rules |
| G6 commands/baseline | PASS as proposal | Focused command block, S01 baseline/tooling owner, SP1 coverage denominator/evidence policy |
| G7 integration | Proposed; release blocked by S00 | Acceptance demonstration + handoff + next-merge condition; parent T labels do not hide owner |

Two-executor counterexample: an executor cannot change the numbered behavior, error/ordering/identity policy, proof level or branch boundary and still claim this plan is satisfied. Equivalent internal algorithms are allowed. Any ambiguity not resolved by parent/SP1 becomes a recorded planning gap, not agent discretion to change behavior. Runtime/tool/merge evidence is gathered during execution; this table does not assert implemented gates passed.
