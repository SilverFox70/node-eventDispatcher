# Extension roadmap

**Current baseline:** S00–S51 are merged. See the [extension index](../cursor_plans/fbp-extensions/INDEX.md) for the delivered sequence and [architecture index](README.md) for package boundaries.

## F01 — optional durable execution

S39–S51 delivered a PostgreSQL host for eligible pinned graphs. It stages obligations with business changes, retains worker claims and step outcomes, recovers branches and keyed joins, persists waits and shows durable progress. The [crash matrix](../cursor_plans/fbp-extensions/S50-execution.md) tests recovery with real workers, PostgreSQL and a controlled HTTP provider. The [adoption receipt](../cursor_plans/fbp-extensions/S51-execution.md) verifies installation, restore and retained evidence. Core in-memory execution remains independently installable.

Provider operations use the linear durable profile. Recovery of an uncertain provider operation depends on authoritative evidence or a supported idempotency guarantee. Retained artifacts and bindings must be available to resume a pinned run.

## Candidate next step — Realberry IAW-2919

A bounded pilot would compare one durable obligation with its current Realberry implementation. Start by verifying the actual transaction and provider boundaries. Use an isolated branch and controlled effects to demonstrate atomic staging, safe recovery after provider acceptance, one mutation and progress for unrelated work. Compare the time and effort to diagnose a stalled operation, test a step and change a workflow rule. IAW-3093 account-status projection is a separate consistency and maintainability study. These candidates require their own scope and acceptance evidence.

## Other recorded extension directions

- Rich payload profiles: binary/domain/custom values with explicit validation, ownership, encoding and resource lifetime.
- Controlled feedback graphs: seeds, budgets, convergence/termination, deadlock/cancellation and effect-replay rules.
- Agent-built applications: discoverable versioned nodes, composable graphs, simulation, reviewable changes and enforced execution capabilities.

Detailed existing goals remain in [the master extension horizon](../cursor_plans/fbp-foundation-plan.md). These directions may intersect F01 but do not require every graph to become durable. New milestones become executable branches only through a concrete shared contract and saved plans.

## F02 — visual graph authoring, test loads and source generation

S25–S38 delivered visual wiring and configuration, controlled test runs, live packet inspection, saved and locked revisions, portable artifacts, readable TypeScript and pinned subflows. See the [Next.js guide](../nextjs.md) and [artifact storage guide](../artifact-storage.md). Node handlers remain ordinary registered server code. The following follow-ons preserve the user's original design goals.

### Inspect the function behind a node

When a user selects a node in the visual editor, offer an **Open function code** action. Open a read-only, syntax-highlighted code panel showing the actual authored handler body for the component version used by that node. Preserve its formatting and comments. Keep registration, port and schema declarations, runtime wrappers, and service wiring out of the panel.

Make source inspection opt-in for project-owned or explicitly published handlers. Resolve only approved source for the selected component version. If the source is private, unavailable, or cannot be matched to that version, explain why in the panel. Keep the lookup separate from running the node.

The first milestone is inspection in a code-editor-style window. Editing and saving the handler can be scoped separately around a reviewable source change and the existing node tests.

### Give the editor canvas room to work

Let the editor use the full available viewport width without a page-level maximum content width. Give extra space on wide screens to the canvas so users can see more of their graph. On narrow screens, let supporting panels stack or collapse to keep the canvas usable.

As the editor gains more tools, make side panels and top or bottom panes resizable where they share space with the canvas. Use keyboard-accessible resize handles and sensible minimum sizes so users can make room for the task at hand.

### Editor UX and UI cleanup

PR #52 delivered the post-S33 checkpoint with a full-width workspace, resizable panels and clearer packet visibility. Further UX work can use the same create → wire → run → inspect journey:

- Keep validation, test actions, selected nodes and unsaved or conflicting edits easy to distinguish. Keep help and the walkthrough accessible.
- Keep packet details and the canvas visible where space permits. Preserve job, node and transfer selection after the highlight fades.
- Verify reopening a saved draft, panel sizing and focus on wide and narrow screens with mouse and keyboard.

### Durable graph artifacts and project adoption

SQLite drafts and immutable tested revisions store graph definitions and layout. Portable bundles and readable TypeScript support adoption in a separate project. These artifacts are distinct from PostgreSQL checkpoints for running workflows. See the [graph adoption demo](../../examples/adoption/README.md).

## F03 — existing application discovery and assisted source transformation

Authority: user direction, 2026-10-30. Future sidecar goal: inspect an existing application, represent its behavior as an editable graph, test proposed changes, and apply the approved changes back to its source. This is beyond F02's authoring of graphs already expressed in our component model. It does not expand S00–S19 or authorize implementation yet.

For example: discover a page's load query, editable state and submit command; show their relationships; let a developer add a post-submit action or change sequencing; then produce and test the corresponding application changes. The final save/apply operation should update the application through a reviewable source patch, with a recoverable previous revision.

### Discovery and an honest behavior model

- Start with a declared JavaScript/TypeScript and Next.js integration scope. Inventory UI events, functions, queries, service commands, state transitions, subscriptions and external effects using source analysis, framework adapters and, where useful, optional runtime traces.
- Attach source locations, source revision, contracts and supporting evidence to relationships. Distinguish confirmed, inferred and unresolved behavior, including dynamic dispatch, reflection, generated code and missing dependencies. A trace demonstrates an observed path; it does not prove every possible path was discovered.
- Keep the application analysis graph distinct from an executable FBP graph. Calls, state dependencies and event subscriptions have different meanings; an arbitrary existing function is not automatically a safe packet-processing node. Define explicit adapters or supported transformations where execution in the FBP runtime is desired.
- Support useful partial maps and focused flows before promising whole-application understanding. Agents may propose missing relationships or changes, but those proposals need evidence and verification before becoming accepted behavior.

### Visual changes that become maintainable application code

- Build on F02's editor, versioned artifacts and test presentation. Express changes as explicit operations such as adding an action, changing a dependency/order, reconnecting a supported flow or editing a function implementation.
- Preserve the original application's authorization, transaction, concurrency, error and side-effect boundaries unless the developer explicitly changes them. A simplified display must not silently imply different execution semantics.
- Generate focused, readable source changes through syntax-aware transformations and/or constrained agent assistance. Preserve handwritten code and unsupported regions; refuse or surface ambiguous transformations instead of silently rewriting them. Generated code follows the repository's human-readable structure rules.
- Test with the application's existing build/type/test checks and new assertions for the requested behavior. Use isolated fixtures or controlled environments for effectful test loads. Present the source diff, affected behavior and verification results before apply.
- Bind proposals to a source revision, detect intervening edits and require regeneration or reconciliation when stale. Work on a branch or equivalent recoverable revision. Saving an accepted change applies the reviewed patch; it must not overwrite unrelated work.

### Future feature sequence and proof

1. Deliver a read-only application inventory and source-linked graph for one supported framework pattern, with visible unknowns and evidence.
2. Add targeted flow discovery, contract extraction and optional trace correlation; validate against known fixture applications, including intentionally unresolved dynamic behavior.
3. Support one bounded visual transformation, such as adding a post-submit action, and produce a reviewable source patch with application-level tests.
4. Prove the full import → edit → test → approve → apply → rediscover loop. A no-op round-trip creates no unrelated changes; stale revisions and unsupported/ambiguous edits fail clearly; applied behavior matches the accepted graph change.
5. Expand transformation coverage, framework adapters and agent-assisted implementation only after their preservation and behavioral proofs exist. Define ownership and round-trip rules for applications combining handwritten code, generated code and native FBP flows.

This sidecar can help teams understand and evolve applications without first rebuilding them as FBP programs. Its analysis and transformation tooling belongs outside the lightweight runtime. F01 durability remains independently optional; understanding an existing workflow does not make that workflow recoverable after failure.

## Numbered extension slices

[EXT1-r2](../cursor_plans/fbp-extensions/INDEX.md) preserves the S20–S51 plans and their delivery evidence. SQLite graph storage and PostgreSQL durable hosting are the verified default choices for their respective optional packages.

The r2 [explainability/application milestone](../cursor_plans/fbp-extensions/explainability.md) inserts S24A–S24F before S25 visual authoring. It tests retained ancestry, missing-result decisions, sanitized offline fixtures and revision comparison in an installed application, then records a fair ordinary-TypeScript comparison. Their owning receipts record the implemented capabilities and verification limits.
