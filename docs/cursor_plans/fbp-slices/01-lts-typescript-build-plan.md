# S01 — Run and build on latest LTS with strict TypeScript

Contract version: 2  
Slice revision: r1, 2026-10-28  
Readiness: ready-for-review  
Execution: not-started; approved task set: none  
Branch: `codex/fbp-01-lts-typescript-build`  
Parent: master r6 / SC-FBP-4 + proposed IC1-r2 / SP1-r2; acceptance pending.

## Story and branch outcome

A maintainer can install reproducibly, build both module formats, typecheck and run offline tests on the same supported runtime as CI.

This is one feature/task branch, not permission to execute the full roadmap. The three bounded tasks below belong to this one outcome. One agent session is the sizing target; unresolved prerequisites stop execution rather than expand it.

## Provenance, order and entry conditions

Source: master `9cb666dc6c846512d64edd39770b7eb2f213256c`; old JS prototype inspected, new interfaces not yet implemented. This plan is a future change proposal, not a live-source/coverage success claim. Baseline: S01 captures `fbp-pre-modernization-r2`; later slices verify applicability/reuse it. Existing placeholder npm test exit1 is known from planning; no new checks run here.

- Read [execution index](INDEX.md), [shared contract](shared-execution.md), [master plan](../fbp-foundation-plan.md), then this file.
- Previous: [S00 — Freeze job, packet and lineage semantics](00-identity-contract-plan.md).
- Base: updated `master` after predecessor is actually merged; never an unmerged sibling feature branch.
- Required predecessor evidence: S00 merged into master, with accepted proof and exact merge SHA recorded.
- Next: [S02 — Use isolated, correct dispatcher instances](02-dispatcher-core-plan.md).
- Readiness gate: This bounded design/independent feature can be reviewed without assuming a new packet identity shape.
- Legacy master work: T0 + T1.

## Solution contract and condition ownership

Shared contract: master SC-FBP-4 + [SP1](shared-execution.md); S00 is the only identity-amendment producer. Conditions contributed by this feature: **C00, C31**. Exact fixtures/assertions live in the master's authoritative ledger; final condition completion owners (including split cases) are in SP1. Reuse predecessor assertions rather than inventing a second truth table. C55–C65 are specified by IC1-r2; acceptance remains pending. S00 walkthroughs are not implementation proof.

## Observable behavior and boundaries

1. Select/recheck latest official LTS patch and its npm; pin project/runtime/build versions without changing global default. Capture old npm test exit1 and targeted dispatcher characterization in isolated tracked-source snapshot; record old/new runtime and lock identity in baseline.
2. Implement strict TS ESM/CJS builds/declarations/source maps and conditional export layout from master §4. Keep root commonjs so old files still run. Tooling operates on delivered files only; empty future entry barrels may export nothing but must not claim to provide future functions.
3. Lock compatible tool/Zod4 versions, wire build/typecheck/lint/test/coverage scripts and prove C31 with a disposable unimported TS module. Do not count generated/source copies twice or omit never-imported files. Standalone consumer fixtures validate current exports.

### Exact allowed-change boundary

- `.nvmrc`
- `.node-version`
- `.npmrc`
- `.gitignore`
- `package.json`
- `package-lock.json`
- `tsconfig*.json`
- `eslint.config.mjs`
- `.c8rc.json`
- `scripts/build.mjs`
- `scripts/coverage-thresholds.mjs`
- `src/index.ts`
- `src/model/index.ts`
- `src/testing/index.ts`
- `test/tooling.test.js`
- `test/package.test.js (runtime/build cases only)`
- `test/types/**`
- `docs/agent-baselines/INDEX.md`
- `docs/agent-baselines/records/fbp-pre-modernization-r2.md`

Also allowed: this slice's future `S01-execution.md`, append-only local workflow telemetry and necessary index/manifest evidence updates. Generated dist/coverage output is local tooling output, not a license for source changes elsewhere. Existing files are read before editing; future paths are intentional proposed destinations.

### Readability in tooling

Follow [readability rules](../../agent-rules/readability-and-structure.md) in build/check tooling as well as future source. Do not add a hard max-lines gate or minify/fragment code to meet a number; leave the documented qualitative module/file review in the handoff.

### Preserve and exclude

- No dispatcher semantic fixes, node runtime, graph compiler or fake skipped future tests. Retain old dependency consumers until their owning slices remove them.

Preserve every earlier merged feature's assertions, safe browser/server boundary and JSON/admission-versus-generic-transport separation. No network/provider side effects in unit tests; only localhost adapters/fixture where explicitly owned. Do not introduce global registries or retries to hide missing correlation/lifecycle behavior.

## Planned proof pointers

- `test/tooling.test.js::runtime pins agree`
- `test/tooling.test.js::coverage sees unexecuted production`
- `test/package.test.js::both distribution entries load`

State/setup/order/exact assertions are the cited master condition rows plus Observable behavior above. Proof strength: type fixtures for authoring, real primitive/runtime integration for execution, isolated packed consumers for distribution, production Next/HTTP/browser for UI. Helper-only greens do not prove a downstream layer. No tests exist yet unless delivered by a predecessor.

## Task contracts

### S01.A — establish this feature's contracts and failing proofs

Purpose/references: the story and conditions above. Prerequisites: S00 merged into master, with accepted proof and exact merge SHA recorded; apply the shared identity-release gate when applicable. Read: parent contract sections corresponding to this feature, shared-execution.md and delivered predecessor symbols. Allowed changes: tests/type fixtures listed in the allowlist, minimal interface scaffold needed to reach the intended behavior, and local journal. Required behavior: establish explicit fixtures/order/outcomes from the linked master ledger before production logic. Named proof targets: test/tooling.test.js::runtime pins agree; test/tooling.test.js::coverage sees unexecuted production; test/package.test.js::both distribution entries load. Preservation: do not duplicate existing cases that already assert the same boundary; extend their tables. Verification/red: Wrong runtime pin/conditional export causes named failure; disposable uncovered TS file must appear at0% and fail coverage. Module-not-found alone does not prove runtime semantics. Completion: retain actual expected nonzero exits/assertion pointers and valid setups; missing module/setup error is not behavioral proof. Stop if predecessor interface, identity amendment or contract semantics are missing.

### S01.B — deliver the bounded feature

Prerequisites: S01.A meaningful failures or documented characterization/design exception. Read the same contract, existing callers and test failures. Allowed changes: production/config/docs paths explicitly listed above and only their necessary public export/declaration consumer updates. Required behavior: all numbered items in Observable behavior and boundaries, with side effects owned by this slice. Preserve the Exclusions and shared invariants. Verification: make named fixtures green through actual delivered interfaces, inspect diff for extra functionality and run the focused commands below. Completion: allowed-path diff plus green evidence; passing unit tests alone is not integrated acceptance. Return to planning if scope requires new semantics, unimplemented later-slice API, widened any types or excluded recovery/features.

### S01.C — accept the story and hand off the branch

Prerequisite: S01.B implementation. Allowed changes: focused evidence-driven fixes within the same allowlist, feature documentation, journal and index/manifest status from actual evidence. Verify story via the Acceptance demonstration, scoped commands, declaration/import paths and meaningful-condition audit. Measure applicable changed production files with S01 coverage config; reuse valid outputs and classify failures against the baseline. Completion evidence: Latest-LTS pins, reproducible tooling, dual build and baseline receipt. Downstream slices use these exact scripts/config versions. Record implementation/proof/gates/coverage/publication separately; do not mark merged from a passing local branch. Stop at this branch's outcome. Next slice cannot start until actual merge into master. Publication only with user authorization; planning request has not granted execution.

## Acceptance demonstration and handoff

Recognizable accepted outcome: **A maintainer can install reproducibly, build both module formats, typecheck and run offline tests on the same supported runtime as CI.**

Handoff artifact/interface: Latest-LTS pins, reproducible tooling, dual build and baseline receipt. Downstream slices use these exact scripts/config versions.

Exact verification commands for this scope (S01 creates tooling; later commands assume merged scripts):

```sh
node --version
npm --version
npm ci
npm run check
npm test
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
| G5 bounded tasks | PASS | S01.A→B→C (S00 design-specific sequence), exact allowlist and stop rules |
| G6 commands/baseline | PASS as proposal | Focused command block, S01 baseline/tooling owner, SP1 coverage denominator/evidence policy |
| G7 integration | PASS for proposed story | Acceptance demonstration + handoff + next-merge condition; parent T labels do not hide owner |

Two-executor counterexample: an executor cannot change the numbered behavior, error/ordering/identity policy, proof level or branch boundary and still claim this plan is satisfied. Equivalent internal algorithms are allowed. Any ambiguity not resolved by parent/SP1 becomes a recorded planning gap, not agent discretion to change behavior. Runtime/tool/merge evidence is gathered during execution; this table does not assert implemented gates passed.
