# EXT1-r2 — shared extension contract

Status: proposed; implementation not approved. User-selected storage: **SQLite for local graph documents; PostgreSQL for durable execution** (2026-10-31). Driver/API/package versions still require evidence. [Readiness](readiness.md) records the remaining decisions. Existing contracts remain authoritative until amendments merge.

*every result can be explained, every node can be tested alone, and every change can be traced.*

The user’s product direction is visibility and explainability, not winning an asynchronous-programming feature race with Node-RED or RxJS. The four extensions must make behavior inspectable and changes understandable. This is a design objective, not a claim about competitors’ limitations.

[EXT1-r2 amendment](amendment-r2.md) and [explainability contract](explainability.md) add S24A–S24F before editor work. Evidence loss and node-reported reasons are explicit; the tagline does not promise introspection of arbitrary internal code.

S20 has delivered [SC20-r1](S20-decisions.md), selecting the canonical detailed contracts for review. These refine earlier sketches; existing implemented v1 behavior remains unchanged.

## Requirements and invariants

- R1 Explain actual execution: node purpose, validated input/output, job/packet/attempt lineage, error/wait reason and graph/code revision. Unknown or uncaptured data must be labeled, never invented.
- R2 Test each registered node alone and the composed flow using the same production contracts/task semantics. Extend the existing public testing helpers; no shadow interpreter.
- R3 Trace semantic/configuration/code changes through saved draft revisions, immutable releases, fixture receipts and deterministic exports. Layout-only changes stay distinguishable.
- R4 Keep core installation independent of editor/SQL dependencies. A Next application supplies its registry, service bindings, authorization and test/run endpoints.
- R5 Add opt-in per-node data capture with safe metadata errors by default, bounded storage and explicit delivery loss. Diagnostics never become business retry/success authority.
- R6 Author using a palette/canvas/configuration/test/debug workflow. Human/agent-authored functions remain ordinary reviewed TypeScript modules with declared contracts and injected services.
- R7 Persist documents separately from executions. Saving a draft neither runs a graph nor makes an existing run durable.
- R8 Durable execution is an eligible profile with explicit persisted state, atomic continuations and evidence-backed provider recovery. It cannot checkpoint arbitrary JavaScript memory.
- R9 Preserve immutable packets, distinct packet/job/run identities, immediate parents, per-edge FIFO and no unintended duplicate admission. Re-execution is explicit, bounded and distinguishable from repeated delivery.
- R10 Preserve no-reuse completed joins, 2–256 join inputs, default zero retries and explicit 1–5 retries under safe policy. Never silently downgrade validation or replay uncertain non-idempotent effects.
- R11 Live topology/progress updates require no page refresh; stale source/run/revision callbacks cannot overwrite newer state.
- R13 Explain retained full ancestry and input disposition; record declared decisions, expose gaps, and never infer absent reasons. Owners X24A.1–X24B.3.
- R14 Generate reviewed offline regression fixtures and compare explicit revisions on identical fixed facts; scope the result to covered fixtures. Owners X24C.1–X24D.3.
- R15 Prove usefulness in an installed application and fair plain-TypeScript comparison before editor investment. Owners X24E.1–X24F.3.
- R12 Cohesive small modules, useful folder names and selective JSDoc are acceptance requirements. Around 200 lines is a strong guideline, not a fragmentation target.

## Requirement-to-proof map

| Requirement | Authoritative planned condition owners |
| --- | --- |
| R1 actual causality | X21.2–X24.3, X30.2–X30.3, X49.2–X49.3 |
| R2 isolated/composed tests | X25.2–X25.3, X29.2–X31.3, X39.2–X39.3 |
| R3 revision/change trace | X32.2–X38.3 |
| R4 optional installation | X26.2–X26.3, X31.3, X37.2, X51.2 |
| R5 bounded diagnostics | X21.2–X24.3 |
| R6 understandable authoring | X26.2–X31.3 |
| R7 documents ≠ execution | X31.3, X33.2–X34.3, X37.2 |
| R8 explicit durable state | X39.2–X51.3 |
| R9 identity/order/admission | X21.3, X29.2, X41.2–X43.3, X46.2–X47.3 |
| R10 bounded safe replay/joins | X43.2–X45.3, X47.2–X47.3, X51.3 |
| R11 live update freshness | X24.3, X28.3, X30.3, X49.2–X49.3 |
| R12 readable structure | Every slice C cohesion review; X36.2–X37.2 readable generated-code acceptance |

These links assign requirements to the single ledger; they do not assert exhaustive future code-branch coverage. Each owning preflight adds newly reachable conditions before implementation.

## Boundary and ownership map

| Producer → consumer | Representation | Owner / check before effects |
| --- | --- | --- |
| Registry definitions → compiler/catalog | existing v1 or reviewed configured v2 | S25; one authoritative validator/compiler, typed and raw-JSON callers |
| Runtime → diagnostics → UI/sink | diagnostic-v1 envelopes, bounded capture session | S21–S24; observer failures isolated from task outcome |
| Editor commands → draft semantic/layout state | document-v1; GraphSpec v1/v2 | S27/S32; command reducer owns edits, compiler owns executable validity |
| Browser → test host | pinned graph hash + validated test input + requested capabilities | S29; host authorizes registry/bindings before compiler/run effects |
| Draft repository → immutable revision | CAS revision + canonical content/registry/receipt hashes | S33–S34; SQL transaction owns write, stale writes refused |
| Bundle/TS export → installed project | portable data + trusted import bindings | S35–S37; verify before code loading, compiler before execution |
| Locked subflow → compiler | expanded DAG + logical/physical origin map | S38; bounded expansion and recursion refusal |
| Domain transaction → durable submission | same PG connection/transaction, fingerprinted job | S40; atomic domain mutation and durable intent |
| Durable task → outcome/continuation | validated packet + step epoch + unique commit key | S39/S41; shared task kernel, transactional scheduler adapter |
| Worker → provider → reconciliation | persisted business key/fingerprint/resource slot/intent | S43–S44; no automatic replay of ambiguous effects |
| Persisted execution → query/UI | authorized bounded snapshot/cursor and CAS commands | S49; refresh never repeats business mutation |

## Shared refusal envelope

New host/artifact/editor adapter boundaries return `Result<T> = {ok:true,value:T} | {ok:false,issues: readonly Issue[]}`. `Issue = {code:string,path:string}` contains safe identifiers, never payloads/credentials; conflicts may include a separate validated `currentRevision` field. Existing compileGraph/FlowError return shapes are preserved; adapt rather than silently change them. One operation has one terminal result. Transport failure is distinct from a domain refusal.

Stable proposed new codes: `CONFIG_INVALID`, `VERSION_UNAVAILABLE`, `DRAFT_CONFLICT`, `RECEIPT_STALE`, `BINDING_MISMATCH`, `ARTIFACT_INVALID`, `EXPORT_CONFLICT`, `PROFILE_INELIGIBLE`, `INPUT_CONFLICT`, `STALE_CLAIM`, `OPERATION_UNCERTAIN`, `RESOLUTION_CONFLICT`, `SIGNAL_CONFLICT`. S20 freezes the code/path mapping for affected APIs before implementation. Existing known compiler issue codes remain unchanged for v1.

Identifiers are opaque validated strings; hashes are lowercase SHA256 hex over version-tagged canonical UTF-8 bytes. SQL IDs are never client authority. Document/workspace/release IDs, semantic digests, runtime run/job/packet IDs, step/attempt IDs and provider operation keys are separate identities; none substitutes for authorization.

## Package and dependency direction — proposed D2

User-selected addition (2026-11-01): [local npm workspace consumption](local-workspace.md) alongside installed packages, using the same public exports. No registry publication is required for local development. Application nodes/graphs remain ordinary project source. This consumption choice is accepted; exact build/watch/manifests still need implementation proof.

Keep existing `event-driven-design` root, `/model`, `/testing`. Introduce independently packaged optional `event-driven-design-editor`, `event-driven-design-artifacts`, `event-driven-design-durable` as selected local identities in [PK1](contracts/packages-and-storage.md); registry ownership is not verified and publication is not authorized.

Editor → core browser model initially, plus artifact model after S32 (no premature S26 dependency); artifact server → core compiler and SQL repository; durable host → core shared task kernel + pinned artifact model. Core never imports optional packages. Editor client never imports SQL, handlers, service implementations or testing internals. SQL drivers sit only in server adapter entries. Package build/type/coverage/install paths must be introduced by each package-owning slice, not claimed available now.

One compiler and shared invocation/validation/identity primitives remain. The durable scheduler interprets only registered eligible stateful operators, not a second ad-hoc GraphSpec implementation. S39 must prove parity before accepting durable routing.

## Handoff graph and decision discipline

Default branch sequence: S19 → S20 → S21–S24 → S24A–S24F → S25–S51. Each branch owns one story. Read the predecessor receipt and actual merge commit before branching. Contract/condition handoffs are in [the manifest](manifest.json); foundation manifest/order stays untouched until an approved execution-guidance amendment links this extension series.

No future implementation task is released on this planning pass. S20 can be reviewed independently to settle D1–D5. Proposed APIs, limits and failure rules below are reviewable defaults; accepted differences require one versioned amendment and propagation to producers, consumers and proof owners together.

## Explicit exclusions

Arbitrary existing-application import/rewrite (F03), arbitrary browser code evaluation, dynamic npm installation, rich/custom packet codecs, cyclic execution, deterministic per-frame game scheduling, production Realberry migration, auto-compensation of external effects and exactly-once provider execution are not delivered by these plans. Extension seams are preserved; no boolean flag enables them without a separate contract and proofs.

## Proof navigation

The sole assertion ledger is [conditions.md](conditions.md). [Execution](execution.md) maps current versus future commands, red/green rules, coverage and publication. [Readiness](readiness.md) records content gates and source limitations. [Use cases](use-cases.md) test usefulness without authorizing new projects.
