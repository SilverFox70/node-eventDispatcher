# Decision register

This is a status/routing register, not proof of an implemented feature or user approval of every proposed interface. Update with explicit authority and evidence; preserve superseded records.

| ID | Topic | Status / authority | Concrete source / next owner |
| --- | --- | --- | --- |
| D01 | Modernize runtime on latest LTS, not necessarily Current | User direction | Master runtime policy; S01 verifies/pins actual LTS at execution |
| D02 | Installable library usable with Next.js | User direction | Master R9/R13; S16 package, S17 Next boundary |
| D03 | Typed contracts and runtime schema enforcement; TypeScript-first dual builds/Zod | Proposed architecture, not implemented | Master §§4/5; S01/S05, approved slice revision required |
| D04 | Easy human/agent node authoring and end-user node/graph tests | User direction; exact API proposed | Master R11/R12; S13–S14 |
| D05 | FIFO transport plus job/correlation/packet/lineage identity | [IC1-r1](../cursor_plans/fbp-identity-contract.md) concrete proposal delivered by S00; human acceptance pending | Root/derived envelopes, (jobId,key) joins, separate runId and no base lookup/store; S04 onward release remains gated |
| D06 | Rich/custom packet types and controlled cycles eventually | User extension goals; not current support | Master §13; S04 generic seam and S06 cycle-profile boundary |
| D07 | Graphical graph/event/subscription inspection | User requirement; API/rendering proposal | Master §14; S03/S12/S18 |
| D08 | JSON-only admission, acyclic topology, no automatic retry/persistence initially | Proposed initial-profile constraints | Master §§3/6/13; amendment required to enable broader behavior |
| D09 | One feature branch per slice; order/merge receipts | User requested bounded branch stories; SP1 proposes strict sequential default | Slice INDEX/manifest; current statuses not-started |
| D10 | Repository rules, architecture, runbooks and local skills | User-authorized guidance setup | AGENTS.md and AGENT_FILES map; no implementation authorization implied |
| D11 | Optional database-backed durable/resumable graph execution | User roadmap direction; exact design/store/failure model unresolved; outside current slices | [F01 roadmap](roadmap.md); separate future contract and branch plans |

No numbered ADR is accepted merely because this register exists. [ADR procedure/template](decisions/README.md) is used when a concrete proposal is approved. S00 now links its concrete proposal; record actual acceptance before releasing downstream slice statuses/conditions; do not turn this summary into a guessed Packet interface.
