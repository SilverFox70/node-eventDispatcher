# S00 — Freeze job, packet and lineage semantics

Contract version: 2  
Slice revision: r1, 2026-10-28  
Readiness: ready-for-review  
Execution: not-started; approved task set: none  
Branch: `codex/fbp-00-identity-contract`  
Parent: master r5 / SC-FBP-4 + partition SP1; identity amendment pending S00.

## Story and branch outcome

An author can distinguish connection ordering, logical job identity, packet identity and retrievable results before writing node code.

This is one feature/task branch, not permission to execute the full roadmap. The three bounded tasks below belong to this one outcome. One agent session is the sizing target; unresolved prerequisites stop execution rather than expand it.

## Provenance, order and entry conditions

Source: master `9cb666dc6c846512d64edd39770b7eb2f213256c`; old JS prototype inspected, new interfaces not yet implemented. This plan is a future change proposal, not a live-source/coverage success claim. Baseline: S01 captures `fbp-pre-modernization-r2`; later slices verify applicability/reuse it. Existing placeholder npm test exit1 is known from planning; no new checks run here.

- Read [execution index](INDEX.md), [shared contract](shared-execution.md), [master plan](../fbp-foundation-plan.md), then this file.
- Previous: **none — start here**.
- Base: updated `master` after predecessor is actually merged; never an unmerged sibling feature branch.
- Required predecessor evidence: Current master planning HEAD verified; no predecessor.
- Next: [S01 — Run and build on latest LTS with strict TypeScript](01-lts-typescript-build-plan.md).
- Readiness gate: This bounded design/independent feature can be reviewed without assuming a new packet identity shape.
- Legacy master work: Pre-T3 design gate; resolves the FIFO/identity discussion after master r4.

## Solution contract and condition ownership

Shared contract: master SC-FBP-4 + [SP1](shared-execution.md); S00 is the only identity-amendment producer. Conditions contributed by this feature: **Design-only: add new identity conditions after concrete outcomes are frozen; no invented behavior asserted now.**. Exact fixtures/assertions live in the master's authoritative ledger; final condition completion owners (including split cases) are in SP1. Reuse predecessor assertions rather than inventing a second truth table. New identity rows are added only by S00's settled amendment.

## Observable behavior and boundaries

1. Read master §§5–7/13/14 and the FIFO discussion recorded in shared-execution.md. Produce one versioned proposal for Packet<T>, packet(), ProcessContext, run admission and propagation through function/map/filter/broadcast/merge/join.
2. Name jobId/correlation identity, packetId, parent/causation identity and runId separately. Set absent/malformed-ID behavior, ID allocation authority, re-admission/copy semantics, fan-out identities, join output lineage, duplicate meaning and correlation key/revision policy. A stable ID alone promises neither retained lookup nor persistence.
3. Choose explicitly whether this release has any result lookup/retention API. Recommended scope is identity/correlation now, persisted lookup/recovery later; if ephemeral lookup is selected, freeze maximum retention, owner, access, eviction and not-found semantics before implementation.
4. Add concrete new condition rows C55 onward to the master ledger only once exact outcomes are settled. Assign final proof owners to downstream slices and amend only affected slice contracts. Freeze the chosen signatures and one branch/join success plus stale/malformed/duplicate refusal walkthrough; obtain user review for the consequential amendment before downstream release.

### Exact allowed-change boundary

- `docs/cursor_plans/fbp-identity-contract.md`
- `docs/cursor_plans/fbp-foundation-plan.md`
- `docs/cursor_plans/fbp-slices/*.md`
- `docs/cursor_plans/fbp-slices/manifest.json`

Also allowed: this slice's future `S00-execution.md`, append-only local workflow telemetry and necessary index/manifest evidence updates. Generated dist/coverage output is local tooling output, not a license for source changes elsewhere. Existing files are read before editing; future paths are intentional proposed destinations.

### Preserve and exclude

- No source, tests, package/runtime installation, persistence implementation or codec/loop engine. No silently selecting contradictory interfaces under the label investigation.

Preserve every earlier merged feature's assertions, safe browser/server boundary and JSON/admission-versus-generic-transport separation. No network/provider side effects in unit tests; only localhost adapters/fixture where explicitly owned. Do not introduce global registries or retries to hide missing correlation/lifecycle behavior.

## Planned proof pointers

- Design review walkthrough; no feature-code test run claimed.

State/setup/order/exact assertions are the cited master condition rows plus Observable behavior above. Proof strength: type fixtures for authoring, real primitive/runtime integration for execution, isolated packed consumers for distribution, production Next/HTTP/browser for UI. Helper-only greens do not prove a downstream layer. No tests exist yet unless delivered by a predecessor.

## Task contracts

### S00.A — identify the contract choices

Purpose/read: master §§5–7/13/14, shared-execution identity gap and FIFO discussion. Prerequisites: verified planning/source HEAD. Allowed changes: this slice's document allowlist only. Required outcome: enumerate the exact unresolved identity/lookup questions in behavior items1–3, separating ordering, correlation, lineage and persistence. Preserve/exclude: do not treat a stable ID as storage or infer user approval for a new public service. Verification: two branch results for one job, multiple runs and post-crash lookup counterexamples each expose a named unresolved choice. Completion receipt: source-grounded decision inventory, not a fabricated test run. Stop if additional implementation is required to invent evidence.

### S00.B — publish one complete proposed identity contract

Prerequisite: S00.A inventory. Read master SC-FBP-4 and interface consumers named in this plan. Allowed changes: identity-contract.md plus affected plan/ledger amendments, preserving history. Required outcome: choose one representation/behavior proposal, exact TypeScript signatures and boundary/error mappings for every question, with rationale and fixture assertions. Assign one owner for envelope creation, ingress validation and each derived packet. Do not leave A-or-B types, conditional parent ownership or ambiguous lookup lifetime to an executor. Verification: success fork/join plus malformed/duplicate/stale/unknown-result scenarios have exact values/IDs or codes and forbidden effects. Completion receipt: proposed revision and affected-slice diff. Return to planning if contract expands into implementing durability/custom codecs/cycles.

### S00.C — review cross-slice consistency and record release gate

Prerequisite: S00.B concrete artifact. Walk the same packet through S04→S08→S10/S11→S13/S14 with no competing key/identity policy. Update added condition owners and plan statuses only where the chosen proposal settles them; preserve pending approval. Human approval is the final consequential release gate, not a substitute for doing this design work. No live tests or implementation approval claimed. Completion receipt: G1–G7 results for the amendment, exact approval reference if actually supplied, otherwise blocked downstream status and clear next input. End here; do not start S01 implementation automatically.

## Acceptance demonstration and handoff

Recognizable accepted outcome: **An author can distinguish connection ordering, logical job identity, packet identity and retrievable results before writing node code.**

Handoff artifact/interface: Versioned identity-contract.md plus master/slice applicability amendment, exact producer→consumer signatures and new proof ownership. This is a design artifact, not implementation evidence.

Exact verification commands for this scope (S01 creates tooling; later commands assume merged scripts):

```sh
git diff --check
git diff --stat
```

Commands must return actual individual exits. `npm run coverage` uses the all-delivered-production denominator, including never-executed changed files. Types-only/docs-only scopes are coverage N/A with reason; S00 does not run implementation tests. UI/Figma/DB checks are N/A unless the feature explicitly owns them: S17 production Next boundary, S18 SVG/keyboard/UI, no DB/Figma source in this series. No external publication is part of the acceptance demonstration.

## Readiness evidence

| Gate | Verdict | Concrete artifact pointers |
| --- | --- | --- |
| G1 interfaces | PASS for bounded proposed scope | Shared contract + Observable behavior; S00 design deliverable or independent runtime/dispatcher API |
| G2 ownership | PASS | Previous/base/next, numbered boundaries, SP1 handoff graph; sole feature branch above |
| G3 proof scenarios | PASS for proposed scope | Master condition pointers and named assertions; no invented test result |
| G4 effects/recovery | PASS / N/A for no execution effects | Master §§6/7/14 + explicit exclusions; no implicit persistence/retry; identity choice held at S00 |
| G5 bounded tasks | PASS | S00.A→B→C (S00 design-specific sequence), exact allowlist and stop rules |
| G6 commands/baseline | PASS as proposal | Focused command block, S01 baseline/tooling owner, SP1 coverage denominator/evidence policy |
| G7 integration | PASS for proposed story | Acceptance demonstration + handoff + next-merge condition; parent T labels do not hide owner |

Two-executor counterexample: an executor cannot change the numbered behavior, error/ordering/identity policy, proof level or branch boundary and still claim this plan is satisfied. Equivalent internal algorithms are allowed. Any ambiguity not resolved by parent/SP1 becomes a recorded planning gap, not agent discretion to change behavior. Runtime/tool/merge evidence is gathered during execution; this table does not assert implemented gates passed.
