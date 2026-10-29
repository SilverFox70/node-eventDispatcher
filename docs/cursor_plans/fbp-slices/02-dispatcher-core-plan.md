# S02 — Use isolated, correct dispatcher instances

Contract version: 2  
Slice revision: r1, 2026-10-28  
Readiness: ready-for-review  
Execution: not-started; approved task set: none  
Branch: `codex/fbp-02-dispatcher-core`  
Parent: master r5 / SC-FBP-4 + partition SP1; identity amendment pending S00.

## Story and branch outcome

Existing consumers keep their calling convention while once listeners, cleanup and instance isolation behave predictably.

This is one feature/task branch, not permission to execute the full roadmap. The three bounded tasks below belong to this one outcome. One agent session is the sizing target; unresolved prerequisites stop execution rather than expand it.

## Provenance, order and entry conditions

Source: master `9cb666dc6c846512d64edd39770b7eb2f213256c`; old JS prototype inspected, new interfaces not yet implemented. This plan is a future change proposal, not a live-source/coverage success claim. Baseline: S01 captures `fbp-pre-modernization-r2`; later slices verify applicability/reuse it. Existing placeholder npm test exit1 is known from planning; no new checks run here.

- Read [execution index](INDEX.md), [shared contract](shared-execution.md), [master plan](../fbp-foundation-plan.md), then this file.
- Previous: [S01 — Run and build on latest LTS with strict TypeScript](01-lts-typescript-build-plan.md).
- Base: updated `master` after predecessor is actually merged; never an unmerged sibling feature branch.
- Required predecessor evidence: S01 merged into master, with accepted proof and exact merge SHA recorded.
- Next: [S03 — Inspect event publishers and active subscriptions](03-dispatcher-topology-plan.md).
- Readiness gate: This bounded design/independent feature can be reviewed without assuming a new packet identity shape.
- Legacy master work: T2 core.

## Solution contract and condition ownership

Shared contract: master SC-FBP-4 + [SP1](shared-execution.md); S00 is the only identity-amendment producer. Conditions contributed by this feature: **C01, C02, C03, C04, C05**. Exact fixtures/assertions live in the master's authoritative ledger; final condition completion owners (including split cases) are in SP1. Reuse predecessor assertions rather than inventing a second truth table. New identity rows are added only by S00's settled amendment.

## Observable behavior and boundaries

1. Implement createDispatcher + singleton and legacy CommonJS shim loading built CJS. Preserve emit(name,data,context), array argument expansion, sync registration order/throw propagation and documented return values.
2. Snapshot listener membership, remove once before callback for recursion safety, make absent cleanup false not throwing, remove first matching registration by original callback. Getter/log copies cannot mutate internal state.
3. Bound metadata-only logger to configured limit, remove shortid after its consumer is migrated. S03 adds topology later; do not invent topology placeholders or change synchronous emit to promise scheduling.

### Exact allowed-change boundary

- `src/dispatcher.ts`
- `src/index.ts`
- `server/src/eventDispatcher.js`
- `test/dispatcher.test.js`
- `package.json`
- `package-lock.json`

Also allowed: this slice's future `S02-execution.md`, append-only local workflow telemetry and necessary index/manifest evidence updates. Generated dist/coverage output is local tooling output, not a license for source changes elsewhere. Existing files are read before editing; future paths are intentional proposed destinations.

### Preserve and exclude

- No graph transport, async emit, event ownership API, incompatible presentation signature or broad legacy example cleanup.

Preserve every earlier merged feature's assertions, safe browser/server boundary and JSON/admission-versus-generic-transport separation. No network/provider side effects in unit tests; only localhost adapters/fixture where explicitly owned. Do not introduce global registries or retries to hide missing correlation/lifecycle behavior.

## Planned proof pointers

- `test/dispatcher.test.js::once removal before invocation`
- `test/dispatcher.test.js::snapshot membership`
- `test/dispatcher.test.js::idempotent cleanup`
- `test/dispatcher.test.js::legacy arguments and throw`
- `test/dispatcher.test.js::isolated bounded inspection`

State/setup/order/exact assertions are the cited master condition rows plus Observable behavior above. Proof strength: type fixtures for authoring, real primitive/runtime integration for execution, isolated packed consumers for distribution, production Next/HTTP/browser for UI. Helper-only greens do not prove a downstream layer. No tests exist yet unless delivered by a predecessor.

## Task contracts

### S02.A — establish this feature's contracts and failing proofs

Purpose/references: the story and conditions above. Prerequisites: S01 merged into master, with accepted proof and exact merge SHA recorded; apply the shared identity-release gate when applicable. Read: parent contract sections corresponding to this feature, shared-execution.md and delivered predecessor symbols. Allowed changes: tests/type fixtures listed in the allowlist, minimal interface scaffold needed to reach the intended behavior, and local journal. Required behavior: establish explicit fixtures/order/outcomes from the linked master ledger before production logic. Named proof targets: test/dispatcher.test.js::once removal before invocation; test/dispatcher.test.js::snapshot membership; test/dispatcher.test.js::idempotent cleanup; test/dispatcher.test.js::legacy arguments and throw; test/dispatcher.test.js::isolated bounded inspection. Preservation: do not duplicate existing cases that already assert the same boundary; extend their tables. Verification/red: Reproduce adjacent once skip, recursive once repeat and missing-event cleanup failure with otherwise-valid calls; assert exact call counts/order. Completion: retain actual expected nonzero exits/assertion pointers and valid setups; missing module/setup error is not behavioral proof. Stop if predecessor interface, identity amendment or contract semantics are missing.

### S02.B — deliver the bounded feature

Prerequisites: S02.A meaningful failures or documented characterization/design exception. Read the same contract, existing callers and test failures. Allowed changes: production/config/docs paths explicitly listed above and only their necessary public export/declaration consumer updates. Required behavior: all numbered items in Observable behavior and boundaries, with side effects owned by this slice. Preserve the Exclusions and shared invariants. Verification: make named fixtures green through actual delivered interfaces, inspect diff for extra functionality and run the focused commands below. Completion: allowed-path diff plus green evidence; passing unit tests alone is not integrated acceptance. Return to planning if scope requires new semantics, unimplemented later-slice API, widened any types or excluded recovery/features.

### S02.C — accept the story and hand off the branch

Prerequisite: S02.B implementation. Allowed changes: focused evidence-driven fixes within the same allowlist, feature documentation, journal and index/manifest status from actual evidence. Verify story via the Acceptance demonstration, scoped commands, declaration/import paths and meaningful-condition audit. Measure applicable changed production files with S01 coverage config; reuse valid outputs and classify failures against the baseline. Completion evidence: Passing legacy shim and factory tests; S03 can extend the same subscription representation without changing semantics. Record implementation/proof/gates/coverage/publication separately; do not mark merged from a passing local branch. Stop at this branch's outcome. Next slice cannot start until actual merge into master. Publication only with user authorization; planning request has not granted execution.

## Acceptance demonstration and handoff

Recognizable accepted outcome: **Existing consumers keep their calling convention while once listeners, cleanup and instance isolation behave predictably.**

Handoff artifact/interface: Passing legacy shim and factory tests; S03 can extend the same subscription representation without changing semantics.

Exact verification commands for this scope (S01 creates tooling; later commands assume merged scripts):

```sh
npm run build
node --test test/dispatcher.test.js
npm run check
npm run coverage
```

Commands must return actual individual exits. `npm run coverage` uses the all-delivered-production denominator, including never-executed changed files. Types-only/docs-only scopes are coverage N/A with reason; S00 does not run implementation tests. UI/Figma/DB checks are N/A unless the feature explicitly owns them: S17 production Next boundary, S18 SVG/keyboard/UI, no DB/Figma source in this series. No external publication is part of the acceptance demonstration.

## Readiness evidence

| Gate | Verdict | Concrete artifact pointers |
| --- | --- | --- |
| G1 interfaces | PASS for bounded proposed scope | Shared contract + Observable behavior; S00 design deliverable or independent runtime/dispatcher API |
| G2 ownership | PASS | Previous/base/next, numbered boundaries, SP1 handoff graph; sole feature branch above |
| G3 proof scenarios | PASS for proposed scope | Master condition pointers and named assertions; no invented test result |
| G4 effects/recovery | PASS / N/A for no execution effects | Master §§6/7/14 + explicit exclusions; no implicit persistence/retry; identity choice held at S00 |
| G5 bounded tasks | PASS | S02.A→B→C (S00 design-specific sequence), exact allowlist and stop rules |
| G6 commands/baseline | PASS as proposal | Focused command block, S01 baseline/tooling owner, SP1 coverage denominator/evidence policy |
| G7 integration | PASS for proposed story | Acceptance demonstration + handoff + next-merge condition; parent T labels do not hide owner |

Two-executor counterexample: an executor cannot change the numbered behavior, error/ordering/identity policy, proof level or branch boundary and still claim this plan is satisfied. Equivalent internal algorithms are allowed. Any ambiguity not resolved by parent/SP1 becomes a recorded planning gap, not agent discretion to change behavior. Runtime/tool/merge evidence is gathered during execution; this table does not assert implemented gates passed.
