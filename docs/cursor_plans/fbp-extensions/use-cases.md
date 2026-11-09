# Future use cases and proof-driven demonstrations

Proposed after-extension work, not additional approved implementation slices. [Ordered plan](INDEX.md). Product test: *every result can be explained, every node can be tested alone, and every change can be traced.* Prefer fewer meaningful nodes over turning every helper/getter into a graph.

First application evidence now belongs to S24E content validation/preview and S24F fair comparison, before the editor. [Explainability](explainability.md) specifies output ancestry, missing-result reasons, run-to-test and tested-change comparison. Econ/Resistance remain later personal applications, not prerequisites.

## Demonstration ladder

| Stage | Useful demonstration | What it proves / does not prove |
| --- | --- | --- |
| S24 | Existing Pokémon enrichment: enable capture on one HTTP branch, inspect each job/attempt and export bounded records | Actual async attribution, not durable recovery |
| S31 | Build a new enrichment flow visually, inject slow/failing branch, inspect waiting join and node data | Useful authoring/debugging, not persistent drafts yet |
| S37–S38 | Save/test/lock/export; run in an independent project; reuse one pinned subflow twice | Portable readable application wiring and revision traceability, not workflow checkpointing |
| S44 | Controlled provider accepts then connection/process dies; recovery holds and reconciles | Honest ambiguous-effect handling, not arbitrary provider exactly-once |
| S51 | Full obligation fixture with two workers/crashes, joins/waits and live recovered progress | Qualification of the supported durable profile, not already an application-specific migration |

## Application pilot for one durable obligation

Yes, this architecture is aimed at this class of work, subject to evidence. The opportunity is replacing scattered orchestration with explicit, inspectable owed work—not merely drawing the old worker in a box. The graph should show business revision, required steps, safe progress, blocked provider uncertainty and why the UI has reached its current state.

Candidate flow, to validate against **current** application code later:

1. Commit person/relationship revision and durable obligation intent in the same application transaction.
2. Claim the exact obligation generation; reconcile obsolete/current revision before effects.
3. Synchronize provider state under a stable business operation key and per-party ordered resource slot.
4. Conditionally perform required KYC/AML work under existing domain rules and authorization.
5. Refresh authorized linked-account evidence/projection using canonical application rules.
6. Persist outcomes/progress so view models/UI can converge after disconnect or worker restart.

The existing rule functions/DB/provider adapters can remain reused. The selected path counts as replaced only when the graph host owns sequencing, obligation/attempt/lease/recovery state, conditional steps, failure disposition and progress. Calling the entire old obligation worker from one node does not meet that criterion. No duplicate account-status business rules in graph metadata; reuse canonical projection logic for any 3093-related path.

Future adoption investigation must first inventory current application contracts, domain transaction boundary, DB/ORM semantics, unique generation keys, authorization and provider guarantees. Prior chat descriptions are not current source verification. If domain and host cannot share a transaction, plan a separately proved outbox bridge before claiming atomicity. No access to other chats/repositories is assumed by this artifact.

**Qualification conditions:** selected old orchestration path disabled in the spike; domain mutation/obligation rollback together; missed notifications swept; stale revision/lease cannot overwrite current; provider accepted/result lost does not repeat; competing same-party revisions serialize; independent parties progress; joins do not reopen; ambiguous provider outcomes visibly held; UI reconnect produces no command; all existing selected domain/side-effect tests pass plus crash cases.

**Worth-it criteria:** measure before/after time to add a conditional step, amount of duplicated orchestration/state logic, number of places touched per rule change, fault-diagnosis time and correctness evidence. Compare throughput/latency/DB writes and operational complexity. Keep canonical business code and an escape hatch. Proceed to replacement only if maintainability/diagnosis/reliability gains justify the new host—not simply because the graph looks impressive. First discovery/spike/integration/qualification plans are separate once current source is available.

## Economic living-world simulator

A strong personal demonstration is a visible economic laboratory. Start with a small world of towns, producers, households, goods and transport routes. Each simulated day is one versioned DAG run:

`snapshot → production → transport → orders → market clearing → consumption/wages/taxes → accounting → next snapshot`

Independent regions/sectors can calculate asynchronously against the same frozen starting snapshot, then collate at explicit barriers. Market/accounting nodes own deterministic conflict/order rules; completion order must not change the economic outcome. A scenario can vary a transport shock, harvest, policy or demand assumption and compare resulting prices, shortages, wealth and production.

What makes this a Nodeflow demo is the ability to click a price/result and trace its input evidence, assumptions, transfers and scenario/code revision; test market clearing alone; inspect where conservation failed; change one graph section and compare outcomes. A chart by itself would not demonstrate the framework.

Domain prerequisites: seeded/versioned RNG streams, recorded input facts, deterministic phase ordering, immutable day snapshots, explicit money/goods conservation and bounded histories. Replaying yesterday’s run uses yesterday’s facts, not fresh API calls. Repeated DAG runs advance days; cyclic graphs or deterministic frame execution are not required or silently enabled. The simulator owns economic validity—durability does not make an economic model realistic.

Small first story: two towns, two goods and one route; one blocked route causes a price/supply change that is fully explainable. Next: multiple regions and async policy experiments. Later: durable campaigns/checkpoints and comparative scenario branches. High-frequency renderer frames remain outside the workflow host.

## Resistance: a fictional campaign simulator

Control a resistance group through abstract campaign decisions: allocate members, manage morale/fatigue/supplies, evaluate uncertain intelligence, choose fictional missions and respond to evolving world events. A turn can run:

`player order → validate campaign revision/resources → assign members → resolve abstract mission outcomes → collate delayed returns/world events → campaign ledger → view model/UI`

The framework’s value is inspectable causality: why a mission outcome occurred, which intelligence/version it used, why a member became unavailable, which costs were committed and what is waiting on a future turn. Keep game mechanics in individually testable nodes. The UI shows campaign state and fictional narrative, while a developer view can explain decisions without exposing hidden information to players.

Domain tests: deterministic seeded replay, action-point/resource conservation, mutually exclusive assignments, stale-turn CAS refusal, one committed order, delayed-event dedup and consistent saves. Authorized game queries decide which hidden information is visible; diagnostic capture must not leak it to player clients. Mission computation can be parallel, but resolution order/policy is explicit.

Start turn-based with one cell, a few characters, abstract rescue/supply scenarios and an event deck. Add faction AI/world events and durable delayed returns later. The rendering/animation loop owns frames; the graph coordinates coarse turns/events. No need for core cycles or a graph node per animation frame. Save/export graph revisions describe rules; saved campaign data is separate domain state.

## Other well-suited challenge classes

| Challenge | Meaningful graph | Why visibility/testing/change trace matter |
| --- | --- | --- |
| Personal research digest | retrieve sources in parallel → normalize → classify → collate → review → publish | Trace each statement to source/retrieval revision; test classifier alone; approval/retry boundary explicit |
| Photo/audio/media library | import → metadata → thumbnail/transcription → tag → index | Isolate failed stages and rerun approved safe work, inspect intermediate artifacts; rich binary references need a later payload/storage contract |
| Data import and repair | parse → validate → partition → enrich → reconcile → transactional write → report | Show exact rejected rows/rules, rate-limit adapters, test transformations and prevent duplicate writes |
| Search/projection rebuild | source snapshot → partition → compute → validate → atomic generation swap | Partial progress and safe generation publication visible; canonical projection rules remain ordinary functions |
| Home/environment history | collect readings → normalize → compare → aggregate → dashboard/notification | Explain derived alerts and test thresholds; simple low-risk observation workflow can stay in-memory |
| Experiment/batch runner | parameter sets → bounded async experiments → score → collate comparison | Trace seed/code/input/output per experiment and inspect outliers without callback bookkeeping |
| Approval/publication workflow | prepare draft → validate → wait review → authorized publish → refresh view | Human wait and external uncertainty are explicit; UI reload never republishes |
| Everyday edit form | query → view model → edit command → validate/write → refresh projection | Same inspectable contracts from surface query/command to UI; use a graph where coordination is meaningful |

An ordinary function is preferable for a local calculation with no useful composition, lifecycle or diagnostic boundary. Framework value grows with branching, independent async work, resumable obligations, multiple consumers and frequent wiring changes. Do not claim business correctness simply from drawing nodes.

## Later seams, deliberately not included

Rich packet values/custom objects need codecs, ownership/serialization/diagnostic/export contracts; begin with JSON plus reviewed storage references only when separately specified. Cycles need termination/backpressure/checkpoint rules. Agent-assisted arbitrary application discovery/rewrite needs source mapping, edit ownership, sandbox/test/review and rollback guarantees (F03). Deterministic game ticks need a separate clock/budget/order profile. These can benefit from this foundation, but none is delivered by the four extension plans.
