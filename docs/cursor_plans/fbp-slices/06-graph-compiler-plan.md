# S06 — Validate and compile externally defined graphs

Contract version: 2  
Slice revision: r2, 2026-10-29  
Readiness: blocked-on-decision  
Execution: not-started; approved task set: none  
Branch: `codex/fbp-06-graph-compiler`  
Parent: master r6 / SC-FBP-4 + proposed IC1-r2 / SP1-r2; acceptance pending.

## Story and branch outcome

A JSON graph either compiles into a safe immutable handle or reports deterministic issues before any component executes.

This is one feature/task branch, not permission to execute the full roadmap. The three bounded tasks below belong to this one outcome. One agent session is the sizing target; unresolved prerequisites stop execution rather than expand it.

## Provenance, order and entry conditions

Source: master `9cb666dc6c846512d64edd39770b7eb2f213256c`; old JS prototype inspected, new interfaces not yet implemented. This plan is a future change proposal, not a live-source/coverage success claim. Baseline: S01 captures `fbp-pre-modernization-r2`; later slices verify applicability/reuse it. Existing placeholder npm test exit1 is known from planning; no new checks run here.

- Read [execution index](INDEX.md), [shared contract](shared-execution.md), [master plan](../fbp-foundation-plan.md), then this file.
- Previous: [S05 — Define typed nodes with validated port contracts](05-port-contracts-plan.md).
- Base: updated `master` after predecessor is actually merged; never an unmerged sibling feature branch.
- Required predecessor evidence: S05 merged into master, with accepted proof and exact merge SHA recorded.
- Next: [S07 — Compose graphs with checked node and port handles](07-typed-graph-builder-plan.md).
- Readiness gate: IC1-r2 is now concrete and applied to this proposal; execution remains blocked until its human acceptance and actual S00 merge.
- Legacy master work: T4 model/validator/compiler portion.

## Solution contract and condition ownership

Shared contract: master SC-FBP-4 + [SP1](shared-execution.md); S00 is the only identity-amendment producer. Conditions contributed by this feature: **C08, C09, C10, C46, C49, C50**. Exact fixtures/assertions live in the master's authoritative ledger; final condition completion owners (including split cases) are in SP1. Reuse predecessor assertions rather than inventing a second truth table. C55–C65 are specified by IC1-r2; acceptance remains pending. S00 walkthroughs are not implementation proof.

## Observable behavior and boundaries

1. Implement GraphSpec parsing, all exact §5 issue codes, cardinality/tag replacement contract/representation compatibility, capacity/graph limits, safe names and cycle refusal. json target wildcard only; no implicit fanout.
2. Use same browser-safe validator in validateGraph and compileGraph; authoritative server registry/catalog identities agree, factories remain uncalled during compile. Unsupported registry version/representation cannot enable execution.
3. Snapshot spec/catalog/definition references, brand handle privately; retain a canonical definition identity for later run→scope association. Runtime scheduling must not require topological batch execution.

### Exact allowed-change boundary

- `src/graph.ts`
- `src/model/graph.ts`
- `src/model/index.ts`
- `src/index.ts`
- `test/graph.test.js`
- `test/model.test.js (shared graph cases)`

- `src/graph/*.ts` — private compile/identity helpers
- `src/model/graph/*.ts` — private browser-safe validation helpers

Also allowed: this slice's future `S06-execution.md`, append-only local workflow telemetry and necessary index/manifest evidence updates. Generated dist/coverage output is local tooling output, not a license for source changes elsewhere. Existing files are read before editing; future paths are intentional proposed destinations.

### Readability and private module scope

Apply [the shared readability section](shared-execution.md#readability-and-humane-implementation--applies-to-every-slice) and [canonical rules](../../agent-rules/readability-and-structure.md). Public filenames above are entry/ownership boundaries, not instructions to place the whole feature in one large file. Listed private helper paths remain bounded by this story; no new public behavior/export or second orchestrator is implied. Review folder responsibility, utility reuse, plain code and selective JSDoc; explain a sensible larger-file exception briefly rather than adding artificial fragmentation.

### Preserve and exclude

- No runtime factories/process execution, typed builder, diagram rendering or generic cycle flag. Browser model evaluates topology/descriptors, not arbitrary payload schemas.

Preserve every earlier merged feature's assertions, safe browser/server boundary and JSON/admission-versus-generic-transport separation. No network/provider side effects in unit tests; only localhost adapters/fixture where explicitly owned. Do not introduce global registries or retries to hide missing correlation/lifecycle behavior.

## Planned proof pointers

- `test/graph.test.js::reject graph before effects`
- `test/graph.test.js::compile snapshots definitions`
- `test/graph.test.js::own identity and contracts`
- `test/model.test.js::browser and server graph issues agree`

State/setup/order/exact assertions are the cited master condition rows plus Observable behavior above. Proof strength: type fixtures for authoring, real primitive/runtime integration for execution, isolated packed consumers for distribution, production Next/HTTP/browser for UI. Helper-only greens do not prove a downstream layer. No tests exist yet unless delivered by a predecessor.

## Task contracts

### S06.A — establish this feature's contracts and failing proofs

Purpose/references: the story and conditions above. Prerequisites: S05 merged into master, with accepted proof and exact merge SHA recorded; apply the shared identity-release gate when applicable. Read: parent contract sections corresponding to this feature, shared-execution.md and delivered predecessor symbols. Allowed changes: tests/type fixtures listed in the allowlist, minimal interface scaffold needed to reach the intended behavior, and local journal. Required behavior: establish explicit fixtures/order/outcomes from the linked master ledger before production logic. Named proof targets: test/graph.test.js::reject graph before effects; test/graph.test.js::compile snapshots definitions; test/graph.test.js::own identity and contracts; test/model.test.js::browser and server graph issues agree. Preservation: do not duplicate existing cases that already assert the same boundary; extend their tables. Verification/red: Otherwise-valid malformed endpoint/tag/capacity/cycle fixtures reach their intended owner; exact issue code/path and create count0; mutation of caller spec cannot alter compiled definition. Completion: retain actual expected nonzero exits/assertion pointers and valid setups; missing module/setup error is not behavioral proof. Stop if predecessor interface, identity amendment or contract semantics are missing.

### S06.B — deliver the bounded feature

Prerequisites: S06.A meaningful failures or documented characterization/design exception. Read the same contract, existing callers and test failures. Allowed changes: production/config/docs paths explicitly listed above and only their necessary public export/declaration consumer updates. Required behavior: all numbered items in Observable behavior and boundaries, with side effects owned by this slice. Preserve the Exclusions and shared invariants. Verification: make named fixtures green through actual delivered interfaces, inspect diff for extra functionality and run the focused commands below. Completion: allowed-path diff plus green evidence; passing unit tests alone is not integrated acceptance. Return to planning if scope requires new semantics, unimplemented later-slice API, widened any types or excluded recovery/features.

### S06.C — accept the story and hand off the branch

Prerequisite: S06.B implementation. Allowed changes: focused evidence-driven fixes within the same allowlist, feature documentation, journal and index/manifest status from actual evidence. Verify story via the Acceptance demonstration, scoped commands, declaration/import paths and meaningful-condition audit. Measure applicable changed production files with S01 coverage config; reuse valid outputs and classify failures against the baseline. Completion evidence: Opaque CompiledGraph plus exact graph/catalog validation to S07/S08/S12. C49 cycle portion complete; process-concurrency portion S08. Record implementation/proof/gates/coverage/publication separately; do not mark merged from a passing local branch. Stop at this branch's outcome. Next slice cannot start until actual merge into master. Publication only with user authorization; planning request has not granted execution.

## Acceptance demonstration and handoff

Recognizable accepted outcome: **A JSON graph either compiles into a safe immutable handle or reports deterministic issues before any component executes.**

Handoff artifact/interface: Opaque CompiledGraph plus exact graph/catalog validation to S07/S08/S12. C49 cycle portion complete; process-concurrency portion S08.

Exact verification commands for this scope (S01 creates tooling; later commands assume merged scripts):

```sh
npm run build
node --test test/graph.test.js test/model.test.js
npm run check
npm run coverage
```

Commands must return actual individual exits. `npm run coverage` uses the all-delivered-production denominator, including never-executed changed files. Types-only/docs-only scopes are coverage N/A with reason; S00 does not run implementation tests. UI/Figma/DB checks are N/A unless the feature explicitly owns them: S17 production Next boundary, S18 SVG/keyboard/UI, no DB/Figma source in this series. No external publication is part of the acceptance demonstration.

## IC1-r2 amendment and added proof scope

Canonical proposed identity contract: [IC1-r2](../fbp-identity-contract.md). Compiler/model metadata remain independent of live packets. Preserve immutable graph identity; do not introduce packet-ID history/dedup/storage. IC1 does not make graph JSON executable. Human acceptance remains pending; this section settles the proposal, not release authority.

## Readiness evidence

| Gate | Verdict | Concrete artifact pointers |
| --- | --- | --- |
| G1 interfaces | GAP: IC1-r2 acceptance pending | Shared contract + Observable behavior; IC1-r2 freezes proposed interfaces; human acceptance still blocks execution |
| G2 ownership | PASS | Previous/base/next, numbered boundaries, SP1 handoff graph; sole feature branch above |
| G3 proof scenarios | PASS for settled proposed fixtures; acceptance pending | Master condition pointers and named assertions; no invented test result |
| G4 effects/recovery | GAP if identity propagation affects this feature | Master §§6/7/14 + explicit exclusions; no implicit persistence/retry; identity choice held at S00 |
| G5 bounded tasks | PASS | S06.A→B→C (S00 design-specific sequence), exact allowlist and stop rules |
| G6 commands/baseline | PASS as proposal | Focused command block, S01 baseline/tooling owner, SP1 coverage denominator/evidence policy |
| G7 integration | Proposed; release blocked by S00 | Acceptance demonstration + handoff + next-merge condition; parent T labels do not hide owner |

Two-executor counterexample: an executor cannot change the numbered behavior, error/ordering/identity policy, proof level or branch boundary and still claim this plan is satisfied. Equivalent internal algorithms are allowed. Any ambiguity not resolved by parent/SP1 becomes a recorded planning gap, not agent discretion to change behavior. Runtime/tool/merge evidence is gathered during execution; this table does not assert implemented gates passed.
