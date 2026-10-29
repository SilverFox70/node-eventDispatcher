# S08 — Execute a real multi-packet streaming graph

Contract version: 2  
Slice revision: r2, 2026-10-29  
Readiness: blocked-on-decision  
Execution: not-started; approved task set: none  
Branch: `codex/fbp-08-stream-runtime`  
Parent: master r6 / SC-FBP-4 + proposed IC1-r2 / SP1-r2; acceptance pending.

## Story and branch outcome

An app can start a compiled graph, feed packets, consume results concurrently, close ingress and obtain a correct terminal result.

This is one feature/task branch, not permission to execute the full roadmap. The three bounded tasks below belong to this one outcome. One agent session is the sizing target; unresolved prerequisites stop execution rather than expand it.

## Provenance, order and entry conditions

Source: master `9cb666dc6c846512d64edd39770b7eb2f213256c`; old JS prototype inspected, new interfaces not yet implemented. This plan is a future change proposal, not a live-source/coverage success claim. Baseline: S01 captures `fbp-pre-modernization-r2`; later slices verify applicability/reuse it. Existing placeholder npm test exit1 is known from planning; no new checks run here.

- Read [execution index](INDEX.md), [shared contract](shared-execution.md), [master plan](../fbp-foundation-plan.md), then this file.
- Previous: [S07 — Compose graphs with checked node and port handles](07-typed-graph-builder-plan.md).
- Base: updated `master` after predecessor is actually merged; never an unmerged sibling feature branch.
- Required predecessor evidence: S07 merged into master, with accepted proof and exact merge SHA recorded.
- Next: [S09 — Finish, cancel and diagnose every owned wait safely](09-lifecycle-diagnostics-plan.md).
- Readiness gate: IC1-r2 is now concrete and applied to this proposal; execution remains blocked until its human acceptance and actual S00 merge.
- Legacy master work: T5 plus required safe baseline lifecycle.

## Solution contract and condition ownership

Shared contract: master SC-FBP-4 + [SP1](shared-execution.md); S00 is the only identity-amendment producer. Conditions contributed by this feature: **C12, C13, C14, C15, C34, C49, C57, C63**. Exact fixtures/assertions live in the master's authoritative ledger; final condition completion owners (including split cases) are in SP1. Reuse predecessor assertions rather than inventing a second truth table. C55–C65 are specified by IC1-r2; acceptance remains pending. S00 walkthroughs are not implementation proof.

## Observable behavior and boundaries

1. Implement sole startNetwork production orchestrator: fresh per-run channels/controller/state, deferred factories, real ingress/egress ports, send/closeInput/finish/cancel/done/snapshot shapes and opaque definition identity retained for S12.
2. Deliver safe baseline terminal behavior now: pre-abort starts no factory; fatal errors cancel owned waits, suppress late sends and never retry; process return closes outputs only after EOF/awaited sends. No knowingly hanging or false-success interim API is mergeable.
3. Validate JSON/schema/identity on ingress and output before delivery. Public wrong schema rejects but run remains usable. Run two graphs independently; raw process double→plus1 yields3/5/7. Do not import built-in map from future S10.

### Exact allowed-change boundary

- `src/runtime.ts`
- `src/index.ts`
- `test/runtime.test.js`
- `test/contract-runtime.test.js`

- `src/runtime/*.ts` — private execution/admission/termination modules; one runtime

Also allowed: this slice's future `S08-execution.md`, append-only local workflow telemetry and necessary index/manifest evidence updates. Generated dist/coverage output is local tooling output, not a license for source changes elsewhere. Existing files are read before editing; future paths are intentional proposed destinations.

### Readability and private module scope

Apply [the shared readability section](shared-execution.md#readability-and-humane-implementation--applies-to-every-slice) and [canonical rules](../../agent-rules/readability-and-structure.md). Public filenames above are entry/ownership boundaries, not instructions to place the whole feature in one large file. Listed private helper paths remain bounded by this story; no new public behavior/export or second orchestrator is implied. Review folder responsibility, utility reuse, plain code and selective JSDoc; explain a sensible larger-file exception briefly rather than adding artificial fragmentation.

### Preserve and exclude

- No second executor, per-packet process recreation, shared global run registry or waiting for user result array. S09 adds adversarial lifecycle proof/deadline implementation; do not publish unsupported timeout option before it works.

Preserve every earlier merged feature's assertions, safe browser/server boundary and JSON/admission-versus-generic-transport separation. No network/provider side effects in unit tests; only localhost adapters/fixture where explicitly owned. Do not introduce global registries or retries to hide missing correlation/lifecycle behavior.

## Planned proof pointers

- `test/runtime.test.js::streaming pipeline drains`
- `test/runtime.test.js::independent runs`
- `test/runtime.test.js::fail process exactly once`
- `test/contract-runtime.test.js::runtime validates both sides`
- `test/runtime.test.js::independent process startup`

State/setup/order/exact assertions are the cited master condition rows plus Observable behavior above. Proof strength: type fixtures for authoring, real primitive/runtime integration for execution, isolated packed consumers for distribution, production Next/HTTP/browser for UI. Helper-only greens do not prove a downstream layer. No tests exist yet unless delivered by a predecessor.

## Task contracts

### S08.A — establish this feature's contracts and failing proofs

Purpose/references: the story and conditions above. Prerequisites: S07 merged into master, with accepted proof and exact merge SHA recorded; apply the shared identity-release gate when applicable. Read: parent contract sections corresponding to this feature, shared-execution.md and delivered predecessor symbols. Allowed changes: tests/type fixtures listed in the allowlist, minimal interface scaffold needed to reach the intended behavior, and local journal. Required behavior: establish explicit fixtures/order/outcomes from the linked master ledger before production logic. Named proof targets: test/runtime.test.js::streaming pipeline drains; test/runtime.test.js::independent runs; test/runtime.test.js::fail process exactly once; test/contract-runtime.test.js::runtime validates both sides; test/runtime.test.js::independent process startup. Preservation: do not duplicate existing cases that already assert the same boundary; extend their tables. Verification/red: 1/2/3 pipeline results3/5/7, separate keys/states across runs, wrong output fails OUTPUT_CONTRACT with zero invalid downstream effects, graph consumers start before source releases packet. Completion: retain actual expected nonzero exits/assertion pointers and valid setups; missing module/setup error is not behavioral proof. Stop if predecessor interface, identity amendment or contract semantics are missing.

### S08.B — deliver the bounded feature

Prerequisites: S08.A meaningful failures or documented characterization/design exception. Read the same contract, existing callers and test failures. Allowed changes: production/config/docs paths explicitly listed above and only their necessary public export/declaration consumer updates. Required behavior: all numbered items in Observable behavior and boundaries, with side effects owned by this slice. Preserve the Exclusions and shared invariants. Verification: make named fixtures green through actual delivered interfaces, inspect diff for extra functionality and run the focused commands below. Completion: allowed-path diff plus green evidence; passing unit tests alone is not integrated acceptance. Return to planning if scope requires new semantics, unimplemented later-slice API, widened any types or excluded recovery/features.

### S08.C — accept the story and hand off the branch

Prerequisite: S08.B implementation. Allowed changes: focused evidence-driven fixes within the same allowlist, feature documentation, journal and index/manifest status from actual evidence. Verify story via the Acceptance demonstration, scoped commands, declaration/import paths and meaningful-condition audit. Measure applicable changed production files with S01 coverage config; reuse valid outputs and classify failures against the baseline. Completion evidence: Useful run handle/real process runtime; S09 tightens same orchestrator, S10 composes it, S12 uses internal definition identity. Optional timeout field becomes public only in S09. Record implementation/proof/gates/coverage/publication separately; do not mark merged from a passing local branch. Stop at this branch's outcome. Next slice cannot start until actual merge into master. Publication only with user authorization; planning request has not granted execution.

## Acceptance demonstration and handoff

Recognizable accepted outcome: **An app can start a compiled graph, feed packets, consume results concurrently, close ingress and obtain a correct terminal result.**

Handoff artifact/interface: Useful run handle/real process runtime; S09 tightens same orchestrator, S10 composes it, S12 uses internal definition identity. Optional timeout field becomes public only in S09.

Exact verification commands for this scope (S01 creates tooling; later commands assume merged scripts):

```sh
npm run build
node --test test/runtime.test.js test/contract-runtime.test.js
npm run check
npm run coverage
```

Commands must return actual individual exits. `npm run coverage` uses the all-delivered-production denominator, including never-executed changed files. Types-only/docs-only scopes are coverage N/A with reason; S00 does not run implementation tests. UI/Figma/DB checks are N/A unless the feature explicitly owns them: S17 production Next boundary, S18 SVG/keyboard/UI, no DB/Figma source in this series. No external publication is part of the acceptance demonstration.

## IC1-r2 amendment and added proof scope

Canonical proposed identity contract: [IC1-r2](../fbp-identity-contract.md). Admit full IC1 envelopes with ID-preserving validation/copy. Repeat packet delivery to one node/run is rejected before a second invocation (DUPLICATE_PACKET); bounded execution ledger capacity fails closed; same root may enter distinct runs with fresh runIds and independently derived outputs. Apply IC1 §3 refusal precedence and C57/C63; no global seen-ID/result map; the per-run execution ledger is required by IC1-r2. Human acceptance remains pending; this section settles the proposal, not release authority.

Additional master condition contributions: **C57, C63**. Final owners are SP1-r2/manifest; reuse predecessor subcase receipts.

## Readiness evidence

| Gate | Verdict | Concrete artifact pointers |
| --- | --- | --- |
| G1 interfaces | GAP: IC1-r2 acceptance pending | Shared contract + Observable behavior; IC1-r2 freezes proposed interfaces; human acceptance still blocks execution |
| G2 ownership | PASS | Previous/base/next, numbered boundaries, SP1 handoff graph; sole feature branch above |
| G3 proof scenarios | PASS for settled proposed fixtures; acceptance pending | Master condition pointers and named assertions; no invented test result |
| G4 effects/recovery | GAP if identity propagation affects this feature | Master §§6/7/14 + explicit exclusions; no implicit persistence/retry; identity choice held at S00 |
| G5 bounded tasks | PASS | S08.A→B→C (S00 design-specific sequence), exact allowlist and stop rules |
| G6 commands/baseline | PASS as proposal | Focused command block, S01 baseline/tooling owner, SP1 coverage denominator/evidence policy |
| G7 integration | Proposed; release blocked by S00 | Acceptance demonstration + handoff + next-merge condition; parent T labels do not hide owner |

Two-executor counterexample: an executor cannot change the numbered behavior, error/ordering/identity policy, proof level or branch boundary and still claim this plan is satisfied. Equivalent internal algorithms are allowed. Any ambiguity not resolved by parent/SP1 becomes a recorded planning gap, not agent discretion to change behavior. Runtime/tool/merge evidence is gathered during execution; this table does not assert implemented gates passed.

IC1-r2 amendment: implement the canonical ledger reservation, capacity, concurrency, failure and cleanup rules; add controlled-race and small-capacity fixtures to the existing condition tests. Never release protection records during a live run or retry failed work automatically. Exact new API settings remain subject to contract review before implementation.
