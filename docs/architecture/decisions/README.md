# Architecture decision records

Create an ADR for a consequential choice that needs durable rationale: a public identity/envelope contract, graph execution semantics, package/host boundary, representation/ownership profile or changed side-effect guarantees. Routine variable names, equivalent algorithms and scoped fixes do not need an ADR.

Use the [template](../../runbooks/templates/architecture-decision.md), number the next free record `NNNN-short-title.md`, and link it in the [decision register](../decision-register.md). State proposed, accepted, rejected or superseded; name actual authority/date and affected interface/plan/condition revisions. Proposed is the default until the required decision is made. Do not invent an approver or retroactively label a conversation's general interest as approval of an exact schema.

Keep the exact canonical interface in one owned contract document and link it; avoid competing code snippets. Acceptance of a design is distinct from authorization to implement/publish it. A superseding decision links the old record and updates affected consumers/plans/proof owners; old evidence stays historical.

No ADR content is pre-filled with an invented decision in this setup. The first expected material amendment is S00's packet/job/lineage contract; follow [the amendment runbook](../../runbooks/change-contract.md).
