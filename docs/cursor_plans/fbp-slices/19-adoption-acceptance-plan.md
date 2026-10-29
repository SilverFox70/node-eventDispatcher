# S19 — Accept the complete application/developer story

Contract version: 2  
Slice revision: r2, 2026-10-29  
Readiness: blocked-on-decision  
Execution: not-started; approved task set: none  
Branch: `codex/fbp-19-adoption-acceptance`  
Parent: master r6 / SC-FBP-4 + proposed IC1-r2 / SP1-r2; acceptance pending.

## Story and branch outcome

A reviewer can follow one candidate from typed authored node through installed graph execution and graphical inspection, with trustworthy proof receipts.

This is one feature/task branch, not permission to execute the full roadmap. The three bounded tasks below belong to this one outcome. One agent session is the sizing target; unresolved prerequisites stop execution rather than expand it.

## Provenance, order and entry conditions

Source: master `9cb666dc6c846512d64edd39770b7eb2f213256c`; old JS prototype inspected, new interfaces not yet implemented. This plan is a future change proposal, not a live-source/coverage success claim. Baseline: S01 captures `fbp-pre-modernization-r2`; later slices verify applicability/reuse it. Existing placeholder npm test exit1 is known from planning; no new checks run here.

- Read [execution index](INDEX.md), [shared contract](shared-execution.md), [master plan](../fbp-foundation-plan.md), then this file.
- Previous: [S18 — See graph wiring and event relationships in Next.js](18-graphical-inspector-plan.md).
- Base: updated `master` after predecessor is actually merged; never an unmerged sibling feature branch.
- Required predecessor evidence: S18 merged into master, with accepted proof and exact merge SHA recorded.
- Next: **none — adoption acceptance closes this series**.
- Readiness gate: IC1-r2 is now concrete and applied to this proposal; execution remains blocked until its human acceptance and actual S00 merge.
- Legacy master work: T12.

## Solution contract and condition ownership

Shared contract: master SC-FBP-4 + [SP1](shared-execution.md); S00 is the only identity-amendment producer. Conditions contributed by this feature: **C47**. Exact fixtures/assertions live in the master's authoritative ledger; final condition completion owners (including split cases) are in SP1. Reuse predecessor assertions rather than inventing a second truth table. C55–C65 are specified by IC1-r2; acceptance remains pending. S00 walkthroughs are not implementation proof.

## Observable behavior and boundaries

1. Reconcile all original C00–C54 plus finalized S00 identity conditions and assigned split proofs; require same artifact/config identity, not stale tarball or raw source aliases.
2. Recheck latest LTS vs locked candidate; change pins only through a focused earlier-slice amendment and rerun invalidated evidence. Reuse applicable stress/coverage/browser receipts, run missing/invalidated gates without claiming absent tests passed.
3. Produce separate implementation/behavior/quality/coverage/publication outcomes and archive contents/compatibility limits/next feature horizons. Update index status only from real accepted/merged evidence.

### Exact allowed-change boundary

- `docs/cursor_plans/fbp-slices/S19-execution.md`
- `docs/cursor_plans/fbp-foundation-execution.md`
- `docs/cursor_plans/fbp-slices/INDEX.md`
- `docs/cursor_plans/fbp-slices/manifest.json`
- `test/acceptance.test.js (only distinct cross-boundary proof gaps)`
- `docs/agent-baselines/INDEX.md (superseding links only)`

Also allowed: this slice's future `S19-execution.md`, append-only local workflow telemetry and necessary index/manifest evidence updates. Generated dist/coverage output is local tooling output, not a license for source changes elsewhere. Existing files are read before editing; future paths are intentional proposed destinations.

### Preserve and exclude

- No new product functionality or broad fixes. A failed proof returns to owning slice with explicit amendment; no npm publication or reviewer messages implied.

Preserve every earlier merged feature's assertions, safe browser/server boundary and JSON/admission-versus-generic-transport separation. No network/provider side effects in unit tests; only localhost adapters/fixture where explicitly owned. Do not introduce global registries or retries to hide missing correlation/lifecycle behavior.

## Planned proof pointers

- `test/acceptance.test.js::same artifact supports author graph and inspector (only if not already proved by existing package/Next assertions)`

State/setup/order/exact assertions are the cited master condition rows plus Observable behavior above. Proof strength: type fixtures for authoring, real primitive/runtime integration for execution, isolated packed consumers for distribution, production Next/HTTP/browser for UI. Helper-only greens do not prove a downstream layer. No tests exist yet unless delivered by a predecessor.

## Task contracts

### S19.A — establish this feature's contracts and failing proofs

Purpose/references: the story and conditions above. Prerequisites: S18 merged into master, with accepted proof and exact merge SHA recorded; apply the shared identity-release gate when applicable. Read: parent contract sections corresponding to this feature, shared-execution.md and delivered predecessor symbols. Allowed changes: tests/type fixtures listed in the allowlist, minimal interface scaffold needed to reach the intended behavior, and local journal. Required behavior: establish explicit fixtures/order/outcomes from the linked master ledger before production logic. Named proof targets: test/acceptance.test.js::same artifact supports author graph and inspector (only if not already proved by existing package/Next assertions). Preservation: do not duplicate existing cases that already assert the same boundary; extend their tables. Verification/red: N/A for docs/reused evidence. Any genuinely new executable acceptance case must fail on a controlled violated boundary and pass restored candidate; do not duplicate assertions merely to add tests. Completion: retain actual expected nonzero exits/assertion pointers and valid setups; missing module/setup error is not behavioral proof. Stop if predecessor interface, identity amendment or contract semantics are missing.

### S19.B — deliver the bounded feature

Prerequisites: S19.A meaningful failures or documented characterization/design exception. Read the same contract, existing callers and test failures. Allowed changes: production/config/docs paths explicitly listed above and only their necessary public export/declaration consumer updates. Required behavior: all numbered items in Observable behavior and boundaries, with side effects owned by this slice. Preserve the Exclusions and shared invariants. Verification: make named fixtures green through actual delivered interfaces, inspect diff for extra functionality and run the focused commands below. Completion: allowed-path diff plus green evidence; passing unit tests alone is not integrated acceptance. Return to planning if scope requires new semantics, unimplemented later-slice API, widened any types or excluded recovery/features.

### S19.C — accept the story and hand off the branch

Prerequisite: S19.B implementation. Allowed changes: focused evidence-driven fixes within the same allowlist, feature documentation, journal and index/manifest status from actual evidence. Verify story via the Acceptance demonstration, scoped commands, declaration/import paths and meaningful-condition audit. Measure applicable changed production files with S01 coverage config; reuse valid outputs and classify failures against the baseline. Completion evidence: End-to-end adoption receipt, reconciled ledger and explicit retained future limits; recognizable ready-to-use framework story rather than just aggregated green unit tests. Record implementation/proof/gates/coverage/publication separately; do not mark merged from a passing local branch. Stop at this branch's outcome. Next slice cannot start until actual merge into master. Publication only with user authorization; planning request has not granted execution.

## Acceptance demonstration and handoff

Recognizable accepted outcome: **A reviewer can follow one candidate from typed authored node through installed graph execution and graphical inspection, with trustworthy proof receipts.**

Handoff artifact/interface: End-to-end adoption receipt, reconciled ledger and explicit retained future limits; recognizable ready-to-use framework story rather than just aggregated green unit tests.

Exact verification commands for this scope (S01 creates tooling; later commands assume merged scripts):

```sh
npm ci
npm run check
npm test
npm run coverage
npm run test:package
npm run test:next
npm pack --dry-run
```

Commands must return actual individual exits. `npm run coverage` uses the all-delivered-production denominator, including never-executed changed files. Types-only/docs-only scopes are coverage N/A with reason; S00 does not run implementation tests. UI/Figma/DB checks are N/A unless the feature explicitly owns them: S17 production Next boundary, S18 SVG/keyboard/UI, no DB/Figma source in this series. No external publication is part of the acceptance demonstration.

## IC1-r2 amendment and added proof scope

Canonical proposed identity contract: [IC1-r2](../fbp-identity-contract.md). Reconcile all C00–C65, including split C58 proof ownership, against one actual candidate. Design submission/approval/merge is separate from code proof; no S00 walkthrough is counted as passing runtime assertions. Human acceptance remains pending; this section settles the proposal, not release authority.

## Readiness evidence

| Gate | Verdict | Concrete artifact pointers |
| --- | --- | --- |
| G1 interfaces | GAP: IC1-r2 acceptance pending | Shared contract + Observable behavior; IC1-r2 freezes proposed interfaces; human acceptance still blocks execution |
| G2 ownership | PASS | Previous/base/next, numbered boundaries, SP1 handoff graph; sole feature branch above |
| G3 proof scenarios | PASS for settled proposed fixtures; acceptance pending | Master condition pointers and named assertions; no invented test result |
| G4 effects/recovery | GAP if identity propagation affects this feature | Master §§6/7/14 + explicit exclusions; no implicit persistence/retry; identity choice held at S00 |
| G5 bounded tasks | PASS | S19.A→B→C (S00 design-specific sequence), exact allowlist and stop rules |
| G6 commands/baseline | PASS as proposal | Focused command block, S01 baseline/tooling owner, SP1 coverage denominator/evidence policy |
| G7 integration | Proposed; release blocked by S00 | Acceptance demonstration + handoff + next-merge condition; parent T labels do not hide owner |

Two-executor counterexample: an executor cannot change the numbered behavior, error/ordering/identity policy, proof level or branch boundary and still claim this plan is satisfied. Equivalent internal algorithms are allowed. Any ambiguity not resolved by parent/SP1 becomes a recorded planning gap, not agent discretion to change behavior. Runtime/tool/merge evidence is gathered during execution; this table does not assert implemented gates passed.
