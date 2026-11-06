# FBP extensions — ordered feature plans

Revision **EXT1-r2**, 2026-10-31. Planning only; no execution approval, feature branch, commit, PR or deployment is implied. These plans extend the foundation rather than rewriting its historical plans.

Foundation prerequisite: S19 merged at `53737a3dc229fb95fcc8d4bd7bc730be24e9f8aa` (PR31), verified against fetched origin/master. [Foundation acceptance](../fbp-slices/S19-execution.md) supplies the prior proof, not proof of these extensions. Working checkout at planning time was S19 head `6329cd22b32e9b9607703834f529bbfc5c083135`; merge differences must be checked before execution.

*every result can be explained, every node can be tested alone, and every change can be traced.*

The product focus is seeing and explaining application behavior, testing nodes independently and tracing changes—not competing on asynchronous primitives alone.

## Four requested capabilities

1. **Diagnostics, S21–S24:** per-node input/output toggles, safe errors, bounded export and useful live UI.
2. **Visual authoring, S25–S31:** Node-RED-inspired palette/canvas/configuration/run/debug, using our compiler and runtime.
3. **Saved/exportable graphs, S32–S38:** durable drafts, immutable tested revisions, portable artifacts, readable TypeScript and pinned subflows.
4. **Optional durable execution, S39–S51:** eligible tasks, transactions, worker recovery, provider uncertainty/reconciliation, persisted joins/waits and installed adoption.

**S20** is the shared design/decision story that precedes implementation. There are **38 branch-sized stories: one contract-review slice and 37 implementation/evaluation slices**. Order is deliberately sequential. One branch per story; several bounded tasks inside each branch. No parallel branch authorization is implied. Re-slice at a documented contract boundary if current-source evidence makes a story too large; never silently absorb a later story.

User-selected consumption target: [local workspace packages](local-workspace.md) alongside installed packages; no npm publication required for local development. Existing slices own both-path proof.

## Read first

- [Shared contract](shared-contract.md), [decision/readiness gates](readiness.md), [execution/proof contract](execution.md).
- [Explainability/application proof](explainability.md), [amendment record](amendment-r2.md).
- [Diagnostics](diagnostics.md), [editor](editor.md), [artifact lifecycle](artifacts.md), [durable execution](durable-contract.md).
- [S20 execution journal](S20-execution.md), [source inventory](S20-source-inventory.md), [selected contracts/release](S20-decisions.md).
- [Planning verification receipt](planning-evidence.md) (historical planning-only evidence).
- [Canonical condition ledger](conditions.md), [machine-readable proposed order](manifest.json), [future use cases and demonstrations](use-cases.md).

S20 design merged in [PR32](https://github.com/SilverFox70/node-eventDispatcher/pull/32) at `b45213ae290822569c6f8b6ed5ffcce61b32e7d2`; [SC20-r1](S20-decisions.md) records selected interfaces and remaining later gates. S21 merged in [PR33](https://github.com/SilverFox70/node-eventDispatcher/pull/33) at `cf4af4d6e99767e9659dab1aa919ed49fea663c7`; [receipt](S21-execution.md) retains its delivery proof. S22 merged in [PR34](https://github.com/SilverFox70/node-eventDispatcher/pull/34) as `e95a633f4cc5ac2045b21e9480b23915c3a75b74`; [S22 receipt](S22-execution.md). S23 merged in [PR35](https://github.com/SilverFox70/node-eventDispatcher/pull/35) as `d30e686ab67723087686d9823863c94bd9770b7c`; [S23 receipt](S23-execution.md). S24 merged in [PR36](https://github.com/SilverFox70/node-eventDispatcher/pull/36) as `bb0ad50c1392d4730992469b0a959d840f604590`; [S24 receipt](S24-execution.md). User requested S24A.A–C on2026-11-05; [S24A receipt](S24A-execution.md) records decision declarations and proof. S24A merged in [PR37](https://github.com/SilverFox70/node-eventDispatcher/pull/37) at `618b65bf439c4723347fef847caf64ed1193b68e`. S24B merged in [PR38](https://github.com/SilverFox70/node-eventDispatcher/pull/38) at `17633bca95ccdbe9be0ff037d6e856acb6ada4e9`. S24C merged in [PR39](https://github.com/SilverFox70/node-eventDispatcher/pull/39) at `c46582a0059ca1f4ff2d5b6ae190d79761e3b332`. S24D merged in [PR40](https://github.com/SilverFox70/node-eventDispatcher/pull/40) at `bd0302b5de986dfd2ffcc3903a9c666ff3264770`. S24E merged in [PR41](https://github.com/SilverFox70/node-eventDispatcher/pull/41) at `9f05cdf2f30e6a76001621343ab4d6e0d0287642`. S24F merged in [PR42](https://github.com/SilverFox70/node-eventDispatcher/pull/42) at `b492eff655bbc81bf5517f49eb0b45f072f22014`. S25 merged in [PR43](https://github.com/SilverFox70/node-eventDispatcher/pull/43) at `68cef7db8ff35e749370f34ac48d0ab525a13a6d`. S26 merged in [PR44](https://github.com/SilverFox70/node-eventDispatcher/pull/44) at `7a7cbb89d1768e797bee4919f288822f22521c59`. [S27 execution](S27-execution.md) records the graph editing work. S28–S51 retain their named gates. This is a complete roadmap breakdown with explicit gates, not a claim all future branches can execute unchanged today.

Six insertion slices **S24A–S24F** prove explainability and application value before S25 visual authoring. Existing S25–S51 IDs/branch names stay stable.

## Sequence

| Slice | Story | Branch | Predecessor |
| --- | --- | --- | --- |
| [S20](S20-extension-contract-freeze.md) | Review one coherent extension contract before changing public interfaces. | `codex/fbp-20-extension-contract-freeze` | S19 |
| [S21](S21-diagnostic-records.md) | See safe, correlated error and operation records without enabling payload logging. | `codex/fbp-21-diagnostic-records` | S20 |
| [S22](S22-node-capture-policy.md) | Turn input/output capture on for a selected node and turn it off again safely. | `codex/fbp-22-node-capture-policy` | S21 |
| [S23](S23-diagnostic-sinks.md) | Export bounded diagnostics without making logging a business dependency. | `codex/fbp-23-diagnostic-sinks` | S22 |
| [S24](S24-diagnostic-controls.md) | Use node capture controls and inspect correlated inputs, outputs and errors in the installed demo. | `codex/fbp-24-diagnostic-controls` | S23 |
| [S24A](S24A-decision-evidence.md) | Record explicit decisions, including inputs that intentionally produce no output. | `codex/fbp-24a-decision-evidence` | S24 |
| [S24B](S24B-causal-inspection.md) | Explain an output or a missing output using retained run-scoped evidence. | `codex/fbp-24b-causal-inspection` | S24A |
| [S24C](S24C-run-to-test.md) | Export a reviewed, sanitized observed case as a regression fixture. | `codex/fbp-24c-run-to-test` | S24B |
| [S24D](S24D-revision-comparison.md) | Compare two graph/code revisions against the same fixed test case. | `codex/fbp-24d-revision-comparison` | S24C |
| [S24E](S24E-application-proof.md) | Use the framework for an understandable content-validation and preview application. | `codex/fbp-24e-application-proof` | S24D |
| [S24F](S24F-comparative-value.md) | Measure whether the application is easier to diagnose, test and change. | `codex/fbp-24f-comparative-value` | S24E |
| [S25](S25-configured-graph-contract.md) | Give registered node definitions typed per-instance configuration that the backend validates. | `codex/fbp-25-configured-graph-contract` | S24F |
| [S26](S26-editor-canvas.md) | Install a usable palette and canvas alongside a Next application. | `codex/fbp-26-editor-canvas` | S25 |
| [S27](S27-editor-commands.md) | Wire, rearrange and undo graph edits without accidentally executing them. | `codex/fbp-27-editor-commands` | S26 |
| [S28](S28-editor-configuration.md) | Configure a node and see authoritative errors on its actual fields and ports. | `codex/fbp-28-editor-configuration` | S27 |
| [S29](S29-editor-test-runs.md) | Run explicit test inputs against the graph being edited. | `codex/fbp-29-editor-test-runs` | S28 |
| [S30](S30-editor-live-debug.md) | Follow real packet transfers and relationships while testing a graph. | `codex/fbp-30-editor-live-debug` | S29 |
| [S31](S31-editor-installed-acceptance.md) | Build, wire and test a meaningful flow in a fresh installed Next project. | `codex/fbp-31-editor-installed-acceptance` | S30 |
| [S32](S32-graph-document-identities.md) | Represent editable documents and immutable content identities consistently. | `codex/fbp-32-graph-document-identities` | S31 |
| [S33](S33-saved-graph-drafts.md) | Save and reopen a draft without losing edits or overwriting someone else’s changes. | `codex/fbp-33-saved-graph-drafts` | S32 |
| [S34](S34-locked-graph-revisions.md) | Lock an immutable tested graph revision and keep later edits separate. | `codex/fbp-34-locked-graph-revisions` | S33 |
| [S35](S35-portable-graph-bundles.md) | Export and import portable graphs with explicit dependencies and integrity checks. | `codex/fbp-35-portable-graph-bundles` | S34 |
| [S36](S36-readable-typescript-export.md) | Export a graph as readable TypeScript that another project can build and run. | `codex/fbp-36-readable-typescript-export` | S35 |
| [S37](S37-artifact-adoption-acceptance.md) | Take a visually authored graph into a separate project and maintain it there. | `codex/fbp-37-artifact-adoption-acceptance` | S36 |
| [S38](S38-versioned-subflows.md) | Reuse a locked graph as a version-pinned subflow with useful debug attribution. | `codex/fbp-38-versioned-subflows` | S37 |
| [S39](S39-durable-task-profile.md) | Identify which graphs can recover and share task semantics with the in-memory runtime. | `codex/fbp-39-durable-task-profile` | S38 |
| [S40](S40-durable-submission-store.md) | Commit business state and the obligation to run together. | `codex/fbp-40-durable-submission-store` | S39 |
| [S41](S41-atomic-step-continuations.md) | Retain a finished step and its next work atomically. | `codex/fbp-41-atomic-step-continuations` | S40 |
| [S42](S42-worker-recovery-fencing.md) | Recover abandoned work without accepting stale worker results. | `codex/fbp-42-worker-recovery-fencing` | S41 |
| [S43](S43-external-operation-ledger.md) | Protect non-idempotent external calls across jobs and worker failures. | `codex/fbp-43-external-operation-ledger` | S42 |
| [S44](S44-reconciliation-resolution.md) | Resolve uncertain provider outcomes with evidence and an audit trail. | `codex/fbp-44-reconciliation-resolution` | S43 |
| [S45](S45-durable-time-policy.md) | Keep retries, waits and deadlines meaningful across restarts. | `codex/fbp-45-durable-time-policy` | S44 |
| [S46](S46-durable-routing.md) | Recover asynchronous fan-out and merge without losing packets. | `codex/fbp-46-durable-routing` | S45 |
| [S47](S47-durable-keyed-joins.md) | Recover partially collated results and never reopen a completed join. | `codex/fbp-47-durable-keyed-joins` | S46 |
| [S48](S48-durable-signals-waits.md) | Pause a workflow for an authorized event or human decision and resume safely. | `codex/fbp-48-durable-signals-waits` | S47 |
| [S49](S49-durable-progress-ui.md) | Show recoverable workflow progress and safe operator actions in an app. | `codex/fbp-49-durable-progress-ui` | S48 |
| [S50](S50-durable-crash-qualification.md) | Prove the composed host survives adversarial failures instead of relying on unit claims. | `codex/fbp-50-durable-crash-qualification` | S49 |
| [S51](S51-durable-installed-adoption.md) | Install and operate an optional durable host with honest recovery guarantees. | `codex/fbp-51-durable-installed-adoption` | S50 |

## Useful milestones

- After S24: ask a selected node to capture its actual input/output, inspect failures and export bounded diagnostics.
- After S24F: inspect output ancestry/missing results, export sanitized tests, compare revisions and evaluate a real application against equivalent TypeScript before investing in the editor.
- After S31: assemble and test useful graphs visually, with live intermediate data; drafts are still session-only.
- After S37: author, test, save, lock and export to a separate project. S38 adds reusable pinned subflows.
- After S44: demonstrate uncertain provider outcomes and evidence-backed reconciliation in a controlled fixture; broad durable routing is still incomplete.
- After S51: qualify an installed durable profile for the selected supported operators. A Realberry adoption spike is then a separate measured application change, not a delivered replacement claim.

The Node-RED reference is its [editor interaction model](https://nodered.org/docs/user-guide/editor/), not runtime/JSON compatibility. App discovery and arbitrary application rewriting remain the separate F03 future investigation.
