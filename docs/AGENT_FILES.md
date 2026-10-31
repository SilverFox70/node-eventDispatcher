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
| [Runnable demos](../examples/README.md) | Offline map/filter and asynchronous branch/merge checkout examples | Trying or demonstrating the delivered runtime |
| [Keyed joins](architecture/keyed-joins.md) | S11 typed result products, job/key groups, bounds and terminal refusal semantics | Collating asynchronous results or implementing downstream inspection/testing |
| [Stream components](architecture/stream-components.md) | S10 map/filter/broadcast/merge, naming, bounded fan-out/fan-in and runnable example | Composing streams or implementing S11 keyed join |
| [Function nodes](architecture/function-nodes.md) | S09B typed ordinary handlers, automatic task policy and runnable example | Authoring simple nodes or implementing mapping/cookbook/testing consumers |
| [Node operations](architecture/node-operations.md) | S09A operation budgets, scoped capabilities and explicit bounded retry policy | Authoring advanced nodes or integrating function helpers/combinators |
| [Lifecycle/deadlines](architecture/lifecycle.md) | S09 deadline, terminal cleanup and exact snapshot/event protocol | Configuring deadlines or implementing inspection/testing consumers |
| [Streaming runtime](architecture/runtime.md) | S08 run lifecycle, admission/ledger, backend verdicts and runnable pipeline | Executing graphs or implementing lifecycle/inspection/testing consumers |
| [Graph builder](architecture/graph-builder.md) | S07 typed construction, local handle ownership and runnable example | Authoring graphs in TypeScript/JavaScript |
| [Graphs](architecture/graphs.md) | S06 graph shape, wiring validation, compilation and runnable validation example | Building/compiler/runtime graph consumers |
| [Contracts/components](architecture/contracts-and-components.md) | S05 schema subset, typed ports, safe catalog and backend validation-detail handoff | Defining nodes or implementing compiler/runtime/inspection consumers |
| [Packets and channels](architecture/packets-and-channels.md) | S04 admission/identity/JSON ownership and internal FIFO semantics | Implementing ports/runtime or using packet factories |
| [Dispatcher API/migration](architecture/dispatcher.md) | S02 synchronous instance API, logging/getter compatibility and legacy shim | Using or extending the dispatcher |
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
