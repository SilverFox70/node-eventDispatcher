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
