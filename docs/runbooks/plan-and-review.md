# Plan and review a feature

Use before implementation or when reviewing a proposed slice/amendment. Read actual source and the relevant shared contract/decision status; a matching title or a complete-looking template is not evidence of coherent behavior.

## Plan

State one recognizable story and preserve/exclude boundaries. Trace existing callers, effects and tests; distinguish current facts, user requirements, hypotheses and unresolved choices. Freeze shared producer/consumer interfaces before deriving dependent tasks. Name input/output/missing-invalid/error representations, ownership, ordering, identity/lifetime/recovery rules and the sole orchestration owner. For a material ambiguity prepare a concrete decision proposal via [contract amendment](change-contract.md).

Enumerate meaningful reachable conditions with valid fixtures/event order/exact assertions/forbidden effects and appropriate proof level. Reuse existing cases and master condition IDs. Assign each cross-feature handoff one producer/consumer/final acceptance owner, then bound tasks/files/prerequisites/stop conditions. Use actual delivered commands and baseline applicability; missing setup is an investigation task, not a fictional passing gate.

## Review

Check the actual content against these questions:

- Can adjacent slices agree on exact types, provenance, failure mapping and effects without private chat context?
- Is the dependency graph acyclic and are integration, provider continuation, cleanup and re-read responsibilities singly owned?
- Do concrete conditions reach the intended guard and assert exact outcomes, including forbidden effects, rather than just covering a category?
- Are commit/partial failure/cancel/late result/retry/crash semantics specified for applicable effects, with explicit N/A where excluded?
- Are task boundaries, commands, baseline and source coverage denominator executable on the expected predecessor?
- Could two capable agents obey the plan and produce incompatible observable behavior? If so, settle the choice or block that task.
- Who accepts the composed story beyond stage-local tests, and what revision/evidence establishes it?

Record pass/gap/N/A with source/section/condition pointers. Use ready-for-review only for a settled proposed task set; needs-investigation or blocked-on-decision for missing facts/choices. Preserve history and status in the [index/manifest](../cursor_plans/fbp-slices/INDEX.md). Review approval, implementation authorization and publication authorization remain distinct; do not revoke already valid approvals just for cosmetic template changes.
