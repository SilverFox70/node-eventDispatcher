# Architecture documentation

## Current state versus destination

S02 delivers the synchronous TypeScript dispatcher and a legacy CommonJS shim; S03 adds safe current subscription/publisher topology. Legacy HTTP examples remain under server/src. The FBP graph/runtime layers are still planned. Guidance setup does not advance slice status, resolve S00 identity or certify current tests.

- [Dispatcher API and migration](dispatcher.md): instance ownership, synchronous delivery, bounded metadata logs and the legacy import.
- [System boundaries](system-boundaries.md): proposed module responsibilities and present source map.
- [Human-readable structure](../agent-rules/readability-and-structure.md): cohesive modules and legible responsibilities; strong size guideline with exceptions.
- [Decision register](decision-register.md): what came from the user, what is proposed and what remains unsettled.
- [Extension roadmap](roadmap.md): optional durable execution and other future profiles.
- [Decision records](decisions/README.md): status/lifecycle and template for later concrete architecture amendments.
- [Master plan](../cursor_plans/fbp-foundation-plan.md): requirement/invariant/condition specification.
- [Slice index](../cursor_plans/fbp-slices/INDEX.md): implementation sequencing and feature ownership.

## Authority and maintenance

User instruction defines scope; accepted decisions and the approved feature contract settle behavior. Proposed plans are reviewable design, not implementation approval. For execution order SP1 supersedes old broad T task groupings. For unresolved packet/job/lineage/lookup semantics S00 owns the amendment; do not infer a complete contract from the word key.

After a feature merges, update only relevant current-state facts and decision status with its evidence link. Keep detailed historical plans/receipts in their existing locations; do not copy all55 conditions into an architecture overview. If an accepted ADR changes a shared interface, amend affected plans/consumers and proof owners together using [the runbook](../runbooks/change-contract.md).
