# S05 — Define typed nodes with validated port contracts

Contract version: 2  
Slice revision: r1, 2026-10-28  
Readiness: blocked-on-decision  
Execution: not-started; approved task set: none  
Branch: `codex/fbp-05-port-contracts`  
Parent: master r5 / SC-FBP-4 + partition SP1; identity amendment pending S00.

## Story and branch outcome

A developer declares reusable component inputs/outputs once and gets inferred TypeScript types plus accurate public descriptors.

This is one feature/task branch, not permission to execute the full roadmap. The three bounded tasks below belong to this one outcome. One agent session is the sizing target; unresolved prerequisites stop execution rather than expand it.

## Provenance, order and entry conditions

Source: master `9cb666dc6c846512d64edd39770b7eb2f213256c`; old JS prototype inspected, new interfaces not yet implemented. This plan is a future change proposal, not a live-source/coverage success claim. Baseline: S01 captures `fbp-pre-modernization-r2`; later slices verify applicability/reuse it. Existing placeholder npm test exit1 is known from planning; no new checks run here.

- Read [execution index](INDEX.md), [shared contract](shared-execution.md), [master plan](../fbp-foundation-plan.md), then this file.
- Previous: [S04 — Transport validated packets with bounded backpressure](04-packet-channels-plan.md).
- Base: updated `master` after predecessor is actually merged; never an unmerged sibling feature branch.
- Required predecessor evidence: S04 merged into master, with accepted proof and exact merge SHA recorded.
- Next: [S06 — Validate and compile externally defined graphs](06-graph-compiler-plan.md).
- Readiness gate: G1/G3 identity-dependent behavior remains provisional; this branch cannot be released until S00 contract amendment is reviewed and applied.
- Legacy master work: T4 contracts/component/catalog portion.

## Solution contract and condition ownership

Shared contract: master SC-FBP-4 + [SP1](shared-execution.md); S00 is the only identity-amendment producer. Conditions contributed by this feature: **C33, C46, C50, C32**. Exact fixtures/assertions live in the master's authoritative ledger; final condition completion owners (including split cases) are in SP1. Reuse predecessor assertions rather than inventing a second truth table. New identity rows are added only by S00's settled amendment.

## Observable behavior and boundaries

1. Implement contract<T>, jsonContract and defineComponent with exact schema subset/invariance/representation identity and frozen identity types from S00. Unsupported checks/coercion/default/transform/custom/lazy/schema kinds fail UNSUPPORTED_SCHEMA.
2. Export canonical draft2020-12 JSON Schema and safe catalog with examples validated by actual contracts; same ID/different semantic schema refuses CONTRACT_ID_CONFLICT. No validators/dependencies/functions are serialized.
3. Generated declaration fixtures catch unknown ctx.send port and wrong payload; /model catalog types/helpers do not import Node/runtime. Use documented Zod core traversal only; unrepresentable fallback-to-any forbidden.

### Exact allowed-change boundary

- `src/contracts.ts`
- `src/component.ts`
- `src/model/contracts.ts`
- `src/model/catalog.ts`
- `src/model/index.ts`
- `src/index.ts`
- `test/contracts.test.js`
- `test/model.test.js (catalog cases)`
- `test/types/contracts.ts`

Also allowed: this slice's future `S05-execution.md`, append-only local workflow telemetry and necessary index/manifest evidence updates. Generated dist/coverage output is local tooling output, not a license for source changes elsewhere. Existing files are read before editing; future paths are intentional proposed destinations.

### Preserve and exclude

- No graph compilation, typed graph builder, function helper, runtime send or JSON Schema subtyping engine. C34 runtime proof belongs S08; C32 builder/function cases belong S07/S13.

Preserve every earlier merged feature's assertions, safe browser/server boundary and JSON/admission-versus-generic-transport separation. No network/provider side effects in unit tests; only localhost adapters/fixture where explicitly owned. Do not introduce global registries or retries to hide missing correlation/lifecycle behavior.

## Planned proof pointers

- `test/contracts.test.js::one contract meaning`
- `test/model.test.js::catalog parity (definition/export cases)`
- `test/types/contracts.ts::typed process ports reject wrong values`

State/setup/order/exact assertions are the cited master condition rows plus Observable behavior above. Proof strength: type fixtures for authoring, real primitive/runtime integration for execution, isolated packed consumers for distribution, production Next/HTTP/browser for UI. Helper-only greens do not prove a downstream layer. No tests exist yet unless delivered by a predecessor.

## Task contracts

### S05.A — establish this feature's contracts and failing proofs

Purpose/references: the story and conditions above. Prerequisites: S04 merged into master, with accepted proof and exact merge SHA recorded; apply the shared identity-release gate when applicable. Read: parent contract sections corresponding to this feature, shared-execution.md and delivered predecessor symbols. Allowed changes: tests/type fixtures listed in the allowlist, minimal interface scaffold needed to reach the intended behavior, and local journal. Required behavior: establish explicit fixtures/order/outcomes from the linked master ledger before production logic. Named proof targets: test/contracts.test.js::one contract meaning; test/model.test.js::catalog parity (definition/export cases); test/types/contracts.ts::typed process ports reject wrong values. Preservation: do not duplicate existing cases that already assert the same boundary; extend their tables. Verification/red: Same contract ID different assertion schema fails, unsupported transformations refuse, wrong process port/payload fails tsc, valid equivalent fixtures pass. Completion: retain actual expected nonzero exits/assertion pointers and valid setups; missing module/setup error is not behavioral proof. Stop if predecessor interface, identity amendment or contract semantics are missing.

### S05.B — deliver the bounded feature

Prerequisites: S05.A meaningful failures or documented characterization/design exception. Read the same contract, existing callers and test failures. Allowed changes: production/config/docs paths explicitly listed above and only their necessary public export/declaration consumer updates. Required behavior: all numbered items in Observable behavior and boundaries, with side effects owned by this slice. Preserve the Exclusions and shared invariants. Verification: make named fixtures green through actual delivered interfaces, inspect diff for extra functionality and run the focused commands below. Completion: allowed-path diff plus green evidence; passing unit tests alone is not integrated acceptance. Return to planning if scope requires new semantics, unimplemented later-slice API, widened any types or excluded recovery/features.

### S05.C — accept the story and hand off the branch

Prerequisite: S05.B implementation. Allowed changes: focused evidence-driven fixes within the same allowlist, feature documentation, journal and index/manifest status from actual evidence. Verify story via the Acceptance demonstration, scoped commands, declaration/import paths and meaningful-condition audit. Measure applicable changed production files with S01 coverage config; reuse valid outputs and classify failures against the baseline. Completion evidence: Component/Contract/Catalog representations to S06; defined schema/representation failures; safe descriptors to S12/S17. Record implementation/proof/gates/coverage/publication separately; do not mark merged from a passing local branch. Stop at this branch's outcome. Next slice cannot start until actual merge into master. Publication only with user authorization; planning request has not granted execution.

## Acceptance demonstration and handoff

Recognizable accepted outcome: **A developer declares reusable component inputs/outputs once and gets inferred TypeScript types plus accurate public descriptors.**

Handoff artifact/interface: Component/Contract/Catalog representations to S06; defined schema/representation failures; safe descriptors to S12/S17.

Exact verification commands for this scope (S01 creates tooling; later commands assume merged scripts):

```sh
npm run build
node --test test/contracts.test.js test/model.test.js
npm run typecheck
npm run check
npm run coverage
```

Commands must return actual individual exits. `npm run coverage` uses the all-delivered-production denominator, including never-executed changed files. Types-only/docs-only scopes are coverage N/A with reason; S00 does not run implementation tests. UI/Figma/DB checks are N/A unless the feature explicitly owns them: S17 production Next boundary, S18 SVG/keyboard/UI, no DB/Figma source in this series. No external publication is part of the acceptance demonstration.

## Readiness evidence

| Gate | Verdict | Concrete artifact pointers |
| --- | --- | --- |
| G1 interfaces | GAP: identity amendment pending | Shared contract + Observable behavior; S00 blocks affected public interfaces |
| G2 ownership | PASS | Previous/base/next, numbered boundaries, SP1 handoff graph; sole feature branch above |
| G3 proof scenarios | GAP only for identity additions | Master condition pointers and named assertions; no invented test result |
| G4 effects/recovery | GAP if identity propagation affects this feature | Master §§6/7/14 + explicit exclusions; no implicit persistence/retry; identity choice held at S00 |
| G5 bounded tasks | PASS | S05.A→B→C (S00 design-specific sequence), exact allowlist and stop rules |
| G6 commands/baseline | PASS as proposal | Focused command block, S01 baseline/tooling owner, SP1 coverage denominator/evidence policy |
| G7 integration | Proposed; release blocked by S00 | Acceptance demonstration + handoff + next-merge condition; parent T labels do not hide owner |

Two-executor counterexample: an executor cannot change the numbered behavior, error/ordering/identity policy, proof level or branch boundary and still claim this plan is satisfied. Equivalent internal algorithms are allowed. Any ambiguity not resolved by parent/SP1 becomes a recorded planning gap, not agent discretion to change behavior. Runtime/tool/merge evidence is gathered during execution; this table does not assert implemented gates passed.
