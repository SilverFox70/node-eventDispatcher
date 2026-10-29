# Agent documentation map

This map is the repository's cross-tool navigation source. No personal home-directory skill or command is required to understand the local workflow. Earlier plans record which shared planning workflow generated them; the repository documents below carry the operational guidance needed by a future executor.

| Resource | Owns | Read when |
| --- | --- | --- |
| [AGENTS.md](../AGENTS.md) | Entry point, routing and authority | Start of repository work |
| [CLAUDE.md](../CLAUDE.md) | Thin compatibility pointer | A client discovers this filename |
| [Development guide](DEVELOPMENT_GUIDELINES.md) | Current commands, future tooling and edit boundaries | Before code/tooling changes |
| [Scope and handoff](agent-rules/scope-and-handoff.md) | One story/branch, evidence and scope changes | Planning/executing work |
| [Modules and contracts](agent-rules/modules-and-contracts.md) | Layer ownership and interface discipline | Source, public API and architecture work |
| [Readability and structure](agent-rules/readability-and-structure.md) | Cohesive small files, meaningful hierarchy/utilities and selective JSDoc | Planning, implementing or reviewing code |
| [Verification](agent-rules/verification.md) | Proof strength, coverage and baseline meaning | Behavioral/tooling changes |
| [Architecture index](architecture/README.md) | Current vs target map and topic routing | Architecture context |
| [System boundaries](architecture/system-boundaries.md) | Layer separation, packets/transport/model/runtime | Affected implementation layer |
| [Decision register](architecture/decision-register.md) | Status/authority of directions and decisions | Choosing or changing behavior |
| [Extension roadmap](architecture/roadmap.md) | Future optional profiles, including persistent/resumable execution | Evaluating a future capability |
| [ADRs](architecture/decisions/README.md) | Durable accepted/superseded decision records | Recording a material contract change |
| [Master plan](cursor_plans/fbp-foundation-plan.md) | Proposed requirements/invariants/condition ledger | Cross-feature behavior |
| [Slice index](cursor_plans/fbp-slices/INDEX.md) / [manifest](cursor_plans/fbp-slices/manifest.json) | Branch order and readiness | Selecting next feature |
| [SP1](cursor_plans/fbp-slices/shared-execution.md) | Slice ownership, handoff and baseline rules | Every slice execution |
| [Runbooks](runbooks/README.md) | Planning/review, execution, amendment, verification/publication and maintenance procedures | Relevant phase |
| [Repository skill](../.agents/skills/fbp-slice-execution/SKILL.md) | Small task-specific execution router | Executing/resuming a named FBP slice |
| [Integrity script](../scripts/check-agent-guidance.mjs) | Local-link and slice-order consistency check | Editing guidance or slice metadata |

## Storage conventions

- `.agents/skills/`: repository-local, focused SKILL.md workflows. Automatic discovery depends on the client; use the path explicitly when needed. No home-folder installation is performed here.
- `docs/agent-rules/`: tool-neutral policies. Do not copy them into `.cursor/rules` or other clients; add a thin pointer only when a concrete client needs it.
- `docs/architecture/`: concise current/target boundaries and durable decisions. Accepted ADRs own resolved architecture, not chat messages or duplicated snippets in many skills.
- `docs/runbooks/`: procedures and small templates, not a second architecture specification.
- `docs/cursor_plans/`: proposed/approved feature plans and historical revisions; existing name retained for compatibility across tools.
- Slice journals: `docs/cursor_plans/fbp-slices/SNN-execution.md`, created when execution starts. Master journal summarizes links, not duplicate raw evidence.
- Baselines: `docs/agent-baselines/INDEX.md` and immutable `records/*.md`, created by S01 when evidence exists. Do not add an empty record claiming a capture.
- `.feedback-log/`: local append-only workflow lessons; not canonical architecture or automatic commits. Avoid credentials, payloads and personal data.

A documentation-only setup does not create baseline receipts, accepted ADRs or implementation claims. Add new resources to this map and run the integrity check so instructions remain discoverable.
