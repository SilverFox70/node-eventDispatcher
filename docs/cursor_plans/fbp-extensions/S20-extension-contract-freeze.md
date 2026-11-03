# S20 — Review one coherent extension contract before changing public interfaces.

Plan revision EXT1-r2. Status **ready-for-review**; execution approval **S20.A–C, user request 2026-11-03**.
Phase: design. Proposed branch: `codex/fbp-20-extension-contract-freeze`.
Order: S19 → S20 → S21.

## Story and boundaries

Review one coherent extension contract before changing public interfaces.

Resolve D1–D5 with explicit selected options, migration maps, package boundaries and reviewed API/schema examples; record accepted versus still proposed decisions. No production changes.

Contract: [shared-contract.md](shared-contract.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S19 merge verified; this planning artifact reviewed. No implementation approval inferred.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

Read the r2 amendment and explainability contract before freeze. D5 must specify decision declarations, evidence completeness, trusted execution identity and reviewed offline fixture/comparison APIs; no implementation is included.

## Tasks

### S20.A — Decision and evidence inventory

- Allowed: the documentation paths below only.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Produce the contract/decision inventory from current source; record evidence and exact proposed producer/consumer mappings.
- Condition: [X20.1](conditions.md); Read current v1 graph/config/factory/trace exports and all four proposed boundaries → enumerate every changed producer/consumer and D1–D5 owner → record exact source paths, accepted versus proposed decisions and valid/refused specimens. No proposed export or SQL behavior is described as delivered.
- Verification/red: Document comparison against the current compiler/component interfaces; no runtime red is applicable to a design-only slice.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S20.B — Record selected architecture and gated alternatives

- Allowed: docs/cursor_plans/fbp-extensions/**; docs/architecture/decisions/**; docs/architecture/decision-register.md; docs/runbooks/execute-slice.md; .agents/skills/fbp-slice-execution/SKILL.md (documentation discovery amendment only).
- Prerequisite: S20.A evidence; reviewed decision evidence.
- Obligation: Resolve D1–D5 with explicit selected options, migration maps, package boundaries and reviewed API/schema examples; record accepted versus still proposed decisions. No production changes.
- Condition: [X20.2](conditions.md). Trace the current strict GraphSpec v1 and captured create() factory into all proposed producers/consumers; show a v1 graph remains unchanged and a configured v2 graph is either validated or explicitly refused before effects.
- Verification: source-grounded walkthrough and documentation integrity; production tests N/A.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S20.C — Failure walkthrough and handoff

- Allowed: same documentation paths only.
- Prerequisite: S20.B; immutable candidate identity before final receipts.
- Obligation/condition: [X20.3](conditions.md). Walk two workers across a provider success followed by a crash: a stale claim cannot commit, but provider duplication remains possible without reconciliation; the plan must never label that exactly-once execution.
- Verification: link/order/ownership checks plus G1–G7 review; no fabricated executable result.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

S20.A–C were authorized and completed for review; see S20-execution.md. Exact design proposal awaits review/merge. No successor task is approved by this receipt; named later gates remain explicit.
