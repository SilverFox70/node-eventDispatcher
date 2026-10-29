# Change a shared contract or architectural decision

Use for new public types/identity/error mappings, ownership/effect ordering, package boundary, recovery semantics or execution profile. Equivalent internal algorithms and routine scoped fixes are not material amendments.

1. Name the existing contract/revision and source evidence that contradicts it. Distinguish observed fact from hypothesis, proposed choice and actual user instruction. Identify affected slices/consumers/conditions and what independent work remains valid.
2. Prepare a concrete proposal before asking for a consequential decision: exact types/field ownership/missing-invalid behavior, success/refusal/error results, side-effect ordering, copy/identity/lifetime/recovery rules, and one success and one rejection walked through actual producer/consumer signatures. Do not pass an A-or-B interface to implementers.
3. Record rationale and tradeoffs in the owned contract/ADR. Preserve prior history. Link it from [decision register](../architecture/decision-register.md), master, SP1/slices and any baseline applicability notes. Approval refers to a concrete revision/task set; user direction may already settle a choice, so do not ask again unnecessarily.
4. Resolve the decision at the proper authority. Record actual approval or pending status; no elapsed-time inference. Leave dependent tasks blocked if the consequential choice remains open; don't label the whole plan executable because the investigation can start.
5. Amend producer, consumer and proof owners together. Add exact meaningful conditions to the master ledger, not copies in many journals. Update manifest/index readiness consistently and preserve unaffected assertions/evidence. Accepted ADR/design status is separate from implementation/test/publication status.

## Current motivating case: S00

The optional key in r4 did not settle jobId vs packetId vs runId vs lineage, branch/join/re-admission rules or retained result lookup. FIFO per connection is compatible with job correlation. A stable identifier alone is neither persistence nor permission to retain/expose payloads. S00 owns the precise proposal and proof handoffs before dependent source implementation. Do not solve it by adding fields independently in packet, runtime, helper and join modules.
