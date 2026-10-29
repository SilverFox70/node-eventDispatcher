# FBP identity contract IC1 — S00 proposal

Revision: IC1-r2, 2026-10-29. IC1-r1 is preserved in Git history.
Status: identity distinctions and duplicate-protection principles accepted by the user on 2026-10-29. The concrete ledger interfaces and integration details below remain a design proposal for review; no implementation or merge is claimed.
Architecture: SC-FBP-4 amended by IC1; parent plan r6 / slice partition SP1-r2.
Scope: freeze interfaces and downstream proof ownership only. No runtime, store, dependency or future durable scheduler is implemented here.

## 1. Chosen semantics and rationale

FIFO is a connection-local delivery rule. It neither identifies a job nor imposes one global completion order across independent processes. Preserve bounded FIFO and add explicit identity in the packet envelope.

| Identity | Meaning | Allocation / lifetime |
| --- | --- | --- |
| jobId | Caller-defined logical operation; shared by related packets/branches and possibly distinct runs | Caller supplies a valid ID or packet() generates a UUIDv4 when creating a new root; survives derivation unchanged |
| packetId | One immutable logical information packet | Every factory-created root or derived output gets a fresh UUIDv4; transmission/copy/forward preserves it |
| parentPacketIds | Immediate causal parents declared when deriving a new packet | Nonempty for derived packets, empty for roots; ordered unique list, never an unbounded ancestor history |
| runId | One in-memory execution of a compiled graph | Runtime allocates a fresh UUIDv4 per startNetwork; separate from envelope identity |
| key | Optional application-owned item/group/version correlation within a job | Inherited by normal transformations; required by joinByKey; not a substitute for jobId or a database revision check |

A send or memory copy is not a new information packet; changing/deriving a value is. A routing merge forwards an existing packet; a map/function transformation creates a child. Broadcast creates one child per branch so separately processed branches have distinct packet identities and the same parent/job.

Decision: **no base result-index, getResult(id), replay or persistence API; bounded per-run duplicate protection is required**. The caller can collect/retain outputs under its own policy; /testing retains only its bounded TestResult. Snapshot remains bounded metadata without packet history/payload lookup. [Optional durable execution](../architecture/roadmap.md) must define persisted lookup/retention/recovery separately. No speculative adapter/store flag is frozen now.

## 2. Exact public envelope and factory proposal

```ts
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

type PacketMetadata = Readonly<{
  version: 1;
  packetId: string;
  jobId: string;
  parentPacketIds: readonly string[];
  key?: string;
}>;

type Packet<T = Json> = Readonly<PacketMetadata & { value: T }>;

type PacketOptions = Readonly<{ jobId?: string; key?: string }>;
type DeriveOptions = Readonly<{ key?: string }>;

function packet<T extends Json>(value: T, options?: PacketOptions): Packet<T>;
function derivePacket<T extends Json>(
  value: T,
  parents: readonly Packet[],
  options?: DeriveOptions,
): Packet<T>;
```

These are proposed exported signatures, not code delivered in S00. Generic Packet<T> remains unconstrained for future representations. Only initial public factories/admission require JSON. Parent values in derivePacket's type are JSON-compatible packets in this initial profile; transport never serializes payloads itself. Contract invariance and the typed component/port interfaces remain as in the parent design.

### Validation, limits and errors

- Envelope is a plain data-property object with exactly version, packetId, jobId, parentPacketIds, value and optional key. All required fields must exist. Unknown fields, accessors, symbols, wrong version or malformed raw metadata reject INVALID_PACKET. The public send accepts a structurally valid deserialized envelope; no module-local factory brand is required.
- packetId and each parent ID use canonical lowercase UUIDv4 text: `xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx`, hexadecimal digits only. Run IDs follow the same format. No public ID-generator injection option or packetId override in packet()/derivePacket(). Tests may control the internal UUID source through a test-local seam without adding public API.
- jobId is 1–128 ASCII characters, matching `[A-Za-z0-9][A-Za-z0-9._:-]{0,127}`. Generated default is UUIDv4; caller IDs such as `job-42` are valid. Explicit undefined/null/empty/whitespace is not an omitted ID. An ID is correlation metadata, not authorization or a provider idempotency key.
- key is absent or a nonempty string up to128 Unicode code points, preserving the parent's nonempty-key rule. Explicit undefined/null/empty is invalid. No implicit normalization, case folding or stripping.
- parentPacketIds is an ordered array of at most256 distinct valid packet IDs and cannot contain packetId itself. Roots have []; derived packets have1–256 parents. Metadata is deep-copied/frozen just like payload. Caller mutation after send/factory cannot change the admitted packet.
- JSON payload limits remain finite-number/plain-data/dense-array policy, maximum nesting64 and UTF-8 JSON size1MiB. These limits are for value; the independently bounded metadata is not silently charged against an application's payload limit.
- packet() wrong/unknown options or invalid option jobId/key throw INVALID_ARGUMENT; invalid value throws INVALID_PACKET. It creates a fresh packetId, default fresh jobId if absent, empty parent list and supplied optional key. Job and packet IDs are separately allocated, not assumed equal.
- derivePacket() wrong options throw INVALID_ARGUMENT. A non-array/empty/over256 parent collection, duplicate parent IDs or impossible generated self-parent throw INVALID_LINEAGE. Each parent must first be a valid JSON-profile envelope or INVALID_PACKET. Differing parent jobIds throw JOB_MISMATCH; no child ID/value is emitted. With omitted options.key, all parent keys (including absence) must agree or CORRELATION_MISMATCH. A supplied valid key explicitly rekeys the output; it does not change jobId. Clearing a key is not an option in this revision.
- A valid derivation creates a fresh packetId, preserves the common jobId, records parent packet IDs in supplied order and uses the inherited/explicit key. Invalid derived value throws INVALID_PACKET. No fallback to creating a new job or losing parents.

Derivation check order: options/parent-collection shape → each parent envelope → duplicate parent IDs → common jobId → key inheritance/rekey → output value validation/copy → allocate/freeze child. A parent envelope containing its own packetId is malformed before cross-parent checks. UUID uniqueness is the allocation contract; no global UUID history is kept.

## 3. Admission, forwarding and run separation

`run.send(name, packet)` and `ctx.send(port, packet)` keep their parent API shape, now receiving the complete IC1 envelope. Validate/copy without regenerating IDs or lineage. Failed admission enqueues/delivers nothing. For public ingress, check run terminal state, input name and endpoint exclusivity before envelope/payload/schema checks; errors respectively RUN_TERMINATED, UNKNOWN_PORT, CONCURRENT_SEND, INVALID_PACKET, INPUT_CONTRACT. Invalid live input does not fail the run. An uncaught internal send/contract failure is fatal under the existing runtime rules; bad schema output remains OUTPUT_CONTRACT before downstream effects.

Duplicate protection is scoped to (runId, node instance ID, packetId), across all inputs of that node. Forwarding the same packet through different nodes is valid. Before exposing a packet to node code, atomically reserve its execution identity; retain the reservation for the entire run, including while queued, running, completed, failed or cancelled. A competing or later delivery to that node fails DUPLICATE_PACKET before another invocation or input exposure. No silent suppression and no automatic retry. This governs runtime delivery, not arbitrary effects a raw process chooses to perform inside its own code.

The execution ledger is bounded, retains IDs/status only, and never evicts during a live run. Proposed startNetwork option executionRecordLimit defaults to65536, accepts integers1–1048576; invalid configuration fails INVALID_ARGUMENT before processes start. Each first node/packet admission consumes one record. Exhaustion fails EXECUTION_CAPACITY before reserving/enqueueing/exposing additional work; records already admitted stay protected. Existing terminal/port/exclusivity/envelope/schema checks precede reservation; duplicate detection precedes capacity refusal. External admission refusal leaves a live run usable; uncaught internal refusal follows fatal-run rules. S08 must integrate reservation with channel admission/cancellation atomically, without reserving invalid inputs or allowing a race around backpressure. Terminal cleanup releases the ledger only after delivery/invocation has stopped.

There is no global or cross-run duplicate registry. New runs, including after a crash, have independent ledgers. No cross-restart or external-effect exactly-once guarantee is made. Intentional repetition must have a fresh packet/execution identity with lineage to the original; no bypass flag is introduced. A first-class retry/attempt API is deferred rather than inferred from another send. Completed joins still require a new key for a new group.

Factory-created identities are consistent by construction. Syntactic validation of a hand-built/deserialized envelope does not prove historical authenticity or detect a forged reused UUID with different data. Callers must not reuse packetId for another logical packet. Metadata does not grant authority and is not an event-sourced audit log. Cross-run uniqueness/deduplication/authentication would require an explicit later store/protocol.

Each startNetwork creates a fresh runId. Re-admitting root P to R1 and R2 preserves P's job/packet/parents/key while process state and outputs belong to separate runs; derived outputs get fresh packet IDs in each run. runId is on NetworkRun/Snapshot, not added to or overwritten inside Packet. This permits a future durable execution/attempt model without equating a job with one live process.

No root/ancestor lookup, ancestry traversal or payload-history registry exists in the base. Keeping only immediate parent IDs bounds packet metadata. A reference to an absent ancestor is not an admission failure and does not imply the framework can retrieve it.

## 4. Producer/consumer propagation contract

### Raw components

ProcessContext inputs and send retain their typed port signatures, using Packet<T> above. An advanced source uses packet(value,{jobId,key}); a transform uses derivePacket(output,[input]); a router forwards the input packet. Runtime validates sends but does not infer a causation relationship from arbitrary closure behavior or rewrite a caller's valid IDs. Declared lineage is inspectable information, not a security proof that the process consumed every named parent.

### Function helper

```ts
type FunctionContext = Readonly<{
  signal: AbortSignal;
  packet: PacketMetadata;
}>;

function defineFunction<I, O>(spec: {
  id: string; version: number; title: string; description: string;
  input: Contract<I>; output: Contract<O>;
  handler(value: Readonly<I>, ctx: FunctionContext): O | Promise<O>;
}): Component<{ in: Contract<I> }, { out: Contract<O> }>;
```

The helper validates handler output, derives one child from its input and awaits the output send before reading another packet. ctx.packet is immutable metadata without value. There is one key location, ctx.packet.key; the earlier shorthand ctx.key is replaced, not retained as a competing alias. Handler cannot override output metadata through its return value. Effects, cancellation and fatal/business-error policies are unchanged.

### Built-in nodes

| Node | Value behavior | Identity and key behavior |
| --- | --- | --- |
| map | One validated transformed output per accepted input | Derive child from that input; preserve jobId/key |
| filter true | Pass accepted input | Forward original packetId/metadata/value; no artificial child |
| filter false | Consume/drop by predicate | Emit nothing; not transport discard/retry |
| broadcast | Send a separate logical branch packet to each named output | Derive child per branch in declared output order, same job/key, parent=[input.packetId]; await each send; partial delivery on failure remains possible |
| merge | Select ready input respecting existing FIFO/tie rule | Forward exactly its envelope; no ID allocation or lineage rewrite |
| joinByKey | Emit strict-object value keyed by declared input port names | Group by exact tuple(jobId,key), derive one child with parent IDs in input-port declaration order; same job/key |

Broadcast sends to each branch with an isolated value copy. An allocated but undelivered child after cancellation is not recorded as completed work. No rollback or automatic retransmission is introduced.

### Join bounds and refusal semantics

key remains mandatory for join; absent key fails INVALID_PACKET. A jobId/key pair never matches another job even when key text is equal. Root packets intended for the same join group must share an explicit jobId as well as key; independently calling packet() with no jobId starts distinct jobs. Distinct incomplete tuples count toward maxKeys (default128, integer1–4096). Same input/tuple before its group completes fails DUPLICATE_KEY. Over-capacity fails JOIN_CAPACITY before retaining a new tuple. EOF with incomplete tuples fails JOIN_INCOMPLETE; no partial result.

Before emitting a completed group, retain a completed (jobId,key) marker for that join node/run. Later input for that tuple fails JOIN_GROUP_COMPLETED; it cannot reopen the group, even with fresh packet IDs. Reserve the marker before output delivery; output failure cannot make the group reusable. Partial group payloads are released after completion, while the marker remains until run cleanup. Proposed join option completedGroupLimit defaults to65536, accepts integers1–1048576; invalid configuration fails INVALID_ARGUMENT. If no marker slot remains, fail JOIN_HISTORY_CAPACITY before accepting the final member or emitting that group. Never evict completed markers during a live run. maxKeys remains the separate incomplete-group bound. Duplicate packet delivery is rejected by runtime admission first; DUPLICATE_KEY applies to distinct packets targeting an occupied input of an incomplete tuple.

Join factory accepts2–256 named inputs; over256 refuses INVALID_ARGUMENT rather than truncating parent lineage. Other graph size limits remain unchanged. Applications needing larger aggregates can propose bounded hierarchical composition rather than silently dropping parents. Neither ledger stores queryable payload history. Unbounded continuous streams need a future explicit retention/durable profile; finite ledger exhaustion must never silently weaken duplicate protection.

Freshness/revision meaning is application-owned. For example, keys `person-a@r6` and `person-a@r7` are distinct groups. They cannot be joined accidentally. A stale payload with a syntactically matching key still requires application validation/authoritative revision checking before domain writes; core does not invent a STALE_PACKET policy. jobId/key are insufficient to authorize a write or repeat a provider call.

## 5. Exact trace fixtures and counterexamples

Fixture aliases below are shorthand for legal complete envelopes, not literal IDs passed to validators:

- P0 = `00000000-0000-4000-8000-000000000001`; P1/P2/P3 use trailing002/003/004 with the same valid prefix.
- A1/B1 use trailing005/006 for branch function outputs; R1/R2 use trailing101/102; job J=`job-42`; key K=`person-a@r7`.
- Tests assert format/distinctness/relationships; fixture UUID sequences may be provided only by a private test seam, never a deterministic production generator.

### Success: branch and join with out-of-order arrival

1. packet(2,{jobId:J,key:K})→P0, parents=[], value2.
2. broadcast derives A=P1 and B=P2 with jobJ/keyK/parents=[P0]. A and B have distinct packetIds and isolated copies, even though values are equal.
3. Branch functions return20 and200, creating fresh A1/B1 with parents=[P1]/[P2]. B1 may arrive first. Arrival position cannot pair it with another job/key.
4. Join with inputs declared [a,b] produces value{a:20,b:200}, jobJ/keyK, fresh packetId and parents=[A1.packetId,B1.packetId] even if b arrived first.
5. Final output is consumed; normal terminal/queue semantics apply. No queryable result survives unless the caller chooses to retain it.

### Rejection and stale/duplicate examples

- derive from two valid parents with jobs job-42/job-43→JOB_MISMATCH, no generated child/delivery. Parent validation succeeds first; tests do not mask the job guard with malformed UUIDs.
- public raw packet with version1 but packetId=`bad`→INVALID_PACKET/no enqueue; a following valid packet succeeds in the same live run.
- same complete root P0 delivered twice to one node/run→DUPLICATE_PACKET, one input exposure/invocation, including concurrent delivery and delivery after failure. P0 may traverse different nodes. A different packet on an occupied join input/tuple→DUPLICATE_KEY. A fresh packet for a completed tuple→JOIN_GROUP_COMPLETED, zero additional joined output.
- a(job-42,keyx)=1, b(job-43,keyx)=10→two incomplete groups; at EOF JOIN_INCOMPLETE and zero joined output. Four inputs completing both jobs yield two correctly separated values.
- a(job-42,person-a@r6), b(job-42,person-a@r7)→no completed group, then JOIN_INCOMPLETE at EOF. This catches mismatched correlation, not a false promise of database freshness.
- derivePacket(value,[P0,P0])→INVALID_LINEAGE even though parents have identical valid metadata; nothing silently deduplicates lineage.
- one root P0 into R1 and R2→unchanged ingress identity, distinct run IDs/fresh derived outputs and independent state. This is not durable replay or cross-run exactly-once behavior.
- process crash after output consumed→base has no getResult(jobId) or checkpoint to resume. Calling a nonexistent API is not a promised `not-found` service. Caller-retained outputs or the future durable add-on own retrieval semantics.

## 6. Handoffs and proof ownership

Master conditions C55–C65 are the authoritative executable proof obligations, planned for implementation rather than falsely reported passed by this design. Reuse assertions across related rows instead of adding duplicate suites.

| Producer → artifact → consumer | Implementing slice / condition |
| --- | --- |
| S00 → exact envelope/factories → admission | S04 / C55,C56 |
| S04 → immutable Packet → run ingress and re-admission | S08 / C57,C63 |
| S00 → metadata/derive semantics → map/filter/function helper | S10 + S13 / C58 (S13 final owner) |
| S00/S04 → derivation → branch/merge | S10 / C59,C60 |
| S00 → job-scoped key/parent order/bounds → join | S11 / C61,C62 |
| S08/S13 → actual envelope outputs → bounded test SDK | S14 / C64 |
| Packet identity → metadata-only inspection boundary | S12 / C65 |
| Whole candidate → consumer/Next acceptance | S19 accepts all identity receipts with existing C47 |

S05/S06/S07 adopt Packet/metadata declarations and representation invariants without implementing identity allocation. S16 consumer recipe uses ctx.packet metadata and actual factory output, not handcrafted shorthand aliases. S17/S18 continue publishing only safe descriptor/snapshot data and explicitly selected result values. No public payload-history trace is added.

## 7. Readiness and review focus

The user accepted separate packet/job/run identities, caller-supplied operation IDs, immediate-parent lineage, duplicate prevention per node/run, no automatic completed-group reuse,2–256 join inputs, and initial protection limited to one in-memory run. This supersedes IC1-r1 duplicate-forward/reuse defaults. Payload lookup, global deduplication and persistence remain deferred.

Exact ledger option names/defaults, refusal ordering and raw-process integration in this revision are concrete proposed engineering details, not additional user-approved promises. S08/S11 own their executable proofs. Downstream implementation remains gated on contract review and normal predecessor merges; this amendment does not start another slice. No runtime assertions have passed merely because this design is written.
