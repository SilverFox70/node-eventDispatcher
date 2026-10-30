# Extension roadmap

Status: future capability directions, not an approved implementation plan or a change to S00–S19. The default framework remains in-memory; applications that do not opt into durability need no database, checkpoint writes or durable worker dependency. Concrete extension interfaces and store choices require their own proposal, slices and failure proofs.

## F01 — optional durable execution add-on

Authority: user direction, 2026-10-29. Goal: graphs can opt into a database/persistent-store-backed execution host that records work and resumes correctly after supported failures, while ordinary graphs retain the lightweight base runtime.

A durable execution should answer: which graph/component versions and inputs define this job; what completed; what is pending; what was in flight; and what next action is safe. Persistence supplies those answers after process loss; an ID or in-memory queue alone cannot.

### Intended capability

- Persist execution/job/packet identities and lineage, graph/component/contract versions, and enough data or versioned references to reconstruct eligible pending work.
- Checkpoint committed node outcomes and downstream work creation consistently. Recovery must not mark work complete without its required evidence or lose the next scheduled work between commits.
- Recover queued work, interrupted attempts and partially completed branches/joins; include durable wait/timer state when those features are supported. Do not model a whole graph's progress as only one last-completed-node pointer.
- Resume on a worker that reacquires valid ownership. Leases/fencing/revisions prevent an old or competing worker from committing obsolete results.
- Distinguish failed, retryable, uncertain, awaiting reconciliation and terminal outcomes. Retry rules and attempt identity belong to the durable profile, not an automatic replay of every node.
- Retain queryable progress/results under an explicit retention/access/eviction contract, independent of the base runtime's bounded diagnostics. Stable job ID can address persisted execution once this store exists.
- Pin the executing graph/handler/schema version. Resume across deployments only under a compatible version or an explicit migration; no silently running unfinished old work with new node semantics.

### External effects and the recovery promise

The target is reliable resumption within a declared failure/storage model, including worker/process crashes, restart/redeployment, duplicate delivery, transient provider/store outage and competing workers. The later design must state persistence acknowledgement and store recovery assumptions. A graph cannot recover data that its store has irretrievably lost merely because the topology is well constructed.

For example: provider accepts a request, worker crashes before recording its result. Recovery must use an idempotency key/provider evidence or reconciliation policy; it cannot infer that the request failed and safely repeat it. An uncertain operation may need reconciliation or human attention rather than blind retry. Exactly-once external effects are not a promise of the generic add-on.

Known committed outcomes should remain recorded; pending work should be reconstructible; uncertain effects should remain explicitly uncertain until resolved. “Knows where to pick up” therefore means a safe next action based on persisted evidence, not necessarily rerunning the last function.

### Keep the add-on optional

The base owns reusable contracts, graph definitions, node interfaces, identity, in-memory transport, inspection and tests. A future durable host owns store transactions/intents, checkpoints, scheduling/claims, recoverable waits, retries and reconciliation. Store adapters are part of that optional layer; no database vendor or persistence package is selected here.

Reuse the same component/graph authoring model where eligible. Durable validation must reject or require an explicit adapter for nodes/payloads it cannot safely serialize, replay or resume. Rich class instances/resource handles and feedback loops need their own persistence semantics; eligibility is not implied by working in one process. Pure transformations and external-effect nodes may need different checkpoint/replay policies.

No durable state machine is implemented inside every ordinary function, and no misleading durability=true flag or stub store API is added during the foundation slices. A Next route may submit/read durable work later, while execution and recovery live in a suitable worker host rather than depend on one request surviving.

### Future feature sequence and acceptance

These are roadmap milestones, not new branch plans or current release gates:

1. Freeze the failure model, durable graph eligibility, identity/version/lifetime rules and storage transaction contract.
2. Deliver one persistent execution/step-intent/outcome model with an actual store adapter and atomic advancement proof.
3. Add ownership/recovery and explicit retry/uncertain-effect reconciliation; prove real competing-worker behavior, not only mocked transactions.
4. Recover fork/join/waits and expose persisted progress through the existing inspection vocabulary, clearly distinguished from an ephemeral run snapshot.
5. Ship store/host adapters, operational recovery guidance and consumer test helpers after crash-window proofs are complete.

Required proof scenarios include crash before/after intent commit, after provider success/before acknowledgement, after outcome commit/before downstream scheduling, and mid-join; duplicate wake/delivery; expired worker completing after takeover; temporary store/provider outage; version mismatch after deployment; cancellation/recovery collision. Assert exact persisted state, next safe action and forbidden duplicate effects. Recovery tests start a new process/worker from persisted state; an in-memory mock or passing happy-path graph is insufficient.

### Foundation dependencies

[S00 identity design](../cursor_plans/fbp-slices/00-identity-contract-plan.md) must leave durable job identity distinct from run/attempt/packet identity, but it need not build this add-on. Generic representation boundaries, explicit effect contracts, one compiler/runtime model, safe inspection and the public testing API make the later integration easier. The exact durable protocol is still a future decision; do not freeze speculative persistence interfaces into the initial core.

## Other recorded extension directions

- Rich payload profiles: binary/domain/custom values with explicit validation, ownership, encoding and resource lifetime.
- Controlled feedback graphs: seeds, budgets, convergence/termination, deadlock/cancellation and effect-replay rules.
- Agent-built applications: discoverable versioned nodes, composable graphs, simulation, reviewable changes and enforced execution capabilities.

Detailed existing goals remain in [the master extension horizon](../cursor_plans/fbp-foundation-plan.md). These directions may intersect F01 but do not require every graph to become durable. New milestones become executable branches only through a concrete shared contract and saved plans.

## F02 — visual graph authoring, test loads and source generation

Authority: user requested this workflow on2026-10-29. It is a future feature sequence, beyond S18's read-only inspector; no interactive editor or generator exists in the foundation yet.

1. Select versioned components from a node palette, inspect input/output contracts, connect compatible named ports, and edit graph configuration through a Next.js-compatible visual editor.
2. Save the same versioned GraphSpec consumed by the existing validator/compiler. Layout is separate presentation metadata. Invalid connections are refused before node effects; no second visual-only executor.
3. Submit controlled fixtures/test loads through the production runtime and public test harness. Display bounded progress/results/errors; server-side authorization and execution budgets govern effectful nodes.
4. Export readable, deterministic TypeScript graph composition plus necessary imports and version references, suitable for source control and ordinary code review. Save the graph specification alongside it; do not serialize function closures or invent a separate generated runtime.
5. Prove save/load and generated-source execution match the original graph, and define how handwritten code and visual edits round-trip without silently overwriting user changes.

Node implementation remains ordinary human/agent-authored code registered on the server. Visual selection does not grant permission to execute arbitrary code or reveal credentials. Integration with rich payloads, feedback loops and durable execution follows each profile's eligibility rules. Concrete branch slices and acceptance tests are still to be planned; this direction does not enlarge S18 automatically.

### Durable graph artifacts and project adoption

User clarification,2026-10-29: a graph that is tested and working must be durably saved and exportable for use in another project. Browser memory or an ephemeral editor session is insufficient. This stores the graph definition/release; F01 separately owns checkpoints and recovery of running jobs.

- Persist editable drafts and explicit immutable published revisions, with stable graph identity, revision/content integrity, graph-format version, node/contract dependency versions, and separate layout metadata. Reopening or restarting the editor must recover the saved revision.
- Lock a validated revision for deployment. Subsequent edits create a new draft/revision rather than silently changing a deployed graph. Associate the release with its test fixtures and verification result; importing projects must revalidate compatibility.
- Export a portable graph artifact plus deterministic readable TypeScript and dependency/import manifest. Include or identify the node implementations and versions required to run it; credentials and environment-specific service bindings are supplied by the consuming project, never embedded in the artifact.
- Demonstrate clean-project import/build/test/run using the ordinary package compiler/runtime, without the editor service being present. Round-trip export/import preserves graph meaning, versions and layout where included; incompatible formats or missing node versions produce clear refusal before effects.
- Choose durable storage, artifact packaging, release/migration policy and bounded implementation slices in the editor proposal. No storage vendor, hosted service or arbitrary-code execution interface is selected by this roadmap entry.

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
