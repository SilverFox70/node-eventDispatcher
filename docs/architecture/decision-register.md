# Decision register

This is a status/routing register, not proof of an implemented feature or user approval of every proposed interface. Update with explicit authority and evidence; preserve superseded records.

| ID | Topic | Status / authority | Concrete source / next owner |
| --- | --- | --- | --- |
| D01 | Modernize runtime on latest LTS, not necessarily Current | User direction | Master runtime policy; S01 verifies/pins actual LTS at execution |
| D02 | Installable library usable with Next.js | User direction | Master R9/R13; S16 package, S17 Next boundary |
| D03 | Typed contracts and runtime schema enforcement; TypeScript-first dual builds/Zod | Proposed architecture, not implemented | Master §§4/5; S01/S05, approved slice revision required |
| D04 | Easy human/agent node authoring and end-user node/graph tests | User direction; exact API proposed | Master R11/R12; S13–S14 |
| D05 | FIFO transport plus job/correlation/packet/lineage identity | [IC1-r2](../cursor_plans/fbp-identity-contract.md) concrete proposal delivered by S00; human acceptance pending | Root/derived envelopes, (jobId,key) joins, separate runId and no base lookup/store; S04 onward release remains gated |
| D06 | Rich/custom packet types and controlled cycles eventually | User extension goals; not current support | Master §13; S04 generic seam and S06 cycle-profile boundary |
| D07 | Graphical graph/event/subscription inspection | User requirement; API/rendering proposal | Master §14; S03/S12/S18 |
| D08 | JSON-only admission, acyclic topology, no automatic retry/persistence initially | Proposed initial-profile constraints | Master §§3/6/13; amendment required to enable broader behavior |
| D09 | One feature branch per slice; order/merge receipts | User requested bounded branch stories; SP1 proposes strict sequential default | Slice INDEX/manifest; current statuses not-started |
| D10 | Repository rules, architecture, runbooks and local skills | User-authorized guidance setup | AGENTS.md and AGENT_FILES map; no implementation authorization implied |
| D11 | Optional database-backed durable/resumable graph execution | User roadmap direction; exact design/store/failure model unresolved; outside current slices | [F01 roadmap](roadmap.md); separate future contract and branch plans |
| D12 | Human-readable, human-reasonable code and folder structure | Explicit user development direction,2026-10-29; strong small-file guideline with sensible exceptions | [Readability rules](../agent-rules/readability-and-structure.md); applies across planning/implementation/review, not a hard line-count gate |

No numbered ADR is accepted merely because this register exists. [ADR procedure/template](decisions/README.md) is used when a concrete proposal is approved. S00 now links its concrete proposal; record actual acceptance before releasing downstream slice statuses/conditions; do not turn this summary into a guessed Packet interface.

D13 — User accepted on 2026-10-29: prevent repeated packet delivery to the same node within one run; reject completed join tuple reuse; retain bounded protection records without live-run eviction; no automatic retry; restart-safe protection remains a future durable extension. See [IC1-r2](../cursor_plans/fbp-identity-contract.md). Exact ledger settings/integration remain proposed; no implementation or merge is claimed.

S04 readiness update,2026-10-30: the explicit execution request adopts IC1-r2 packet/factory/admission rules following accepted identity principles and the actual S00/S03 merges. See [S04 receipt](../cursor_plans/fbp-slices/S04-execution.md). This does not settle the later execution-ledger/join-history configuration notes or authorize successor implementation.

D14 — S08 execution adoption,2026-10-30: the explicit runtime-slice request adopts IC1-r2's proposed executionRecordLimit (default65536, range1–1048576), synchronous reservation/refusal order and no-live-eviction cleanup protocol. S08 also fixes bounded authoritative validation report transport and baseline run/snapshot behavior. [Runtime contract](runtime.md) and [S08 receipt](../cursor_plans/fbp-slices/S08-execution.md) own concrete behavior/proofs; S11 join-history settings remain proposed and S09 still owns deadlines. Implementation/review publication is distinct from merge evidence.

D15 — User accepted active discrete-operation deadlines and requested the next slices, then explicitly requested0-default/configurable1–5 retries and execution. [NT1-r2](../cursor_plans/fbp-node-timeout-contract.md) freezes static flow/node compatibility, remaining-flow precedence, operation leases and explicit safe retry/settlement policy. S09A owns runtime policy; S09B owns automatic function adaptation; S10/S13 consume those owners. No retry safety is inferred from a timeout alone.

D16 — S11 execution adoption,2026-10-30: after actual S10 merge, the explicit S11 request adopts IC1-r2's completedGroupLimit/default65536/range1–1048576, maxKeys/default128/range1–4096, reservation-before-output, no live-run eviction and terminal cleanup for the typed keyed join. [Join guide](keyed-joins.md) and [S11 receipt](../cursor_plans/fbp-slices/S11-execution.md) own concrete behavior and proof. The product descriptor can contain built-in JSON {} properties; server contract validators stay authoritative. No persistent/cross-run protection or next-slice implementation is authorized by this adoption.

D17 — User direction, 2026-10-31: graphical relationship changes must appear automatically without refreshing the display. [S18 LV1](../cursor_plans/fbp-slices/18-graphical-inspector-plan.md#lv1--automatic-relationship-updates-user-direction-2026-10-31) supersedes the manual-refresh workflow in C54/T11. Notification producer, scoped delivery and lifecycle require an explicit design checkpoint; no live API or S18 implementation is claimed.

D18 — S18 execution design,2026-10-31: the explicit continuation adopts [LV2](../cursor_plans/fbp-slices/18-graphical-inspector-plan.md#lv2--execution-design-checkpoint-2026-10-31) for a bounded disposable dispatcher change observer and request-owned SSE delivery. It preserves synchronous dispatch semantics and the sampling-only inspection scope. Implementation/proof/publication are recorded separately in [S18 receipt](../cursor_plans/fbp-slices/S18-execution.md).
