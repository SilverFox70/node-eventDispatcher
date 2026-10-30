# Packets and internal channels — S04

The root exports `packet(value, options?)`, `derivePacket(value, parents, options?)`, their types and `FlowError`. Internal `admitPacket` validates/copies raw envelopes for the future contract/runtime layers; neither it nor `createChannel` is a supported package-root API. S04 does not execute nodes or implement duplicate-execution protection.

## Packet ownership and identity

Each packet has version1, a fresh canonical lowercase UUIDv4 packetId, jobId, ordered parentPacketIds, optional key and value. A root has no parents. Default job IDs are separately generated UUIDv4s; a caller may supply a1–128-character ASCII operation ID matching the IC1 pattern. Related roots intended to join must share an explicit job ID.

Derivation validates1–256 parents, preserves their common job ID, allocates a fresh result ID and records immediate parents in supplied order. Parent keys must match, including absence, unless an explicit valid key rekeys the result. Keys are nonempty strings of at most128 Unicode code points; no normalization is applied. Duplicate parent IDs, mixed jobs and conflicting inherited keys are separate refusals. Parent references do not provide lookup or authenticate historical lineage.

Internal admission accepts structurally valid serialized envelopes without a private brand, preserving identities while copying/freeze-isolating metadata and payload. Unknown fields, accessors, symbols, bad IDs, duplicate/self parents and explicit invalid optional fields are refused. It does not retain a result index or detect historical reuse of a forged identity.

## Initial JSON profile

Values allow finite numbers, strings, booleans, null, dense ordinary arrays and plain data objects. Objects may have Object.prototype or null as their prototype. All own string data properties are copied as ordinary JSON members; descriptor flags and null-prototype identity are not retained. Arrays allow only indices and length. Accessors, symbols, sparse/extended arrays, proxies, classes, functions, cycles and undefined values are refused without invoking getters/toJSON.

Factories deep-copy/freeze accepted data. Nesting is limited to64 containers (a primitive leaf may sit beneath64 containers). UTF-8 serialized value size is at most1MiB, including JSON quoting/escaping; independently bounded metadata does not consume that value budget. Repeated references to a shared acyclic object are copied independently.

`Packet<T>` remains generic for future representations. Initial public factories constrain T to Json; an internal rich-value channel fixture does not enable public rich-packet admission or codecs.

Factory option errors use INVALID_ARGUMENT; malformed values/raw envelopes use INVALID_PACKET. Derivation validates options/parent collection, individual envelopes, duplicate identities, common job, inherited key, then output data before allocating its child ID. Refusals use INVALID_LINEAGE, JOB_MISMATCH or CORRELATION_MISMATCH at their corresponding boundary. Errors contain codes and categorical messages, not payloads.

## Internal FIFO contract

`createChannel<T>(capacity)` accepts a positive safe-integer capacity, transports T unchanged and exposes send/receive/close/abort/stats to runtime internals. No JSON, clone, schema, identity-allocation or deduplication policy is inside it.

- Capacity bounds queued values, with at most one additional parked send. A second overlapping parked send/read rejects CONCURRENT_SEND/CONCURRENT_READ without failing the channel.
- send resolves when admitted to the queue or handed to a waiting reader, not when a downstream effect completes. receive returns `{done:false,value}`; EOF is `{done:true,value:undefined}`, distinct from null or even a transported undefined.
- close is idempotent, refuses new sends with CHANNEL_CLOSED, admits a previously parked send as space becomes available, then drains to EOF. Waiting empty readers receive EOF immediately.
- abort is idempotent, clears queues/waits and refuses pending/future operations with RUN_TERMINATED, including while previously draining. Admitted queued values count as discarded; an unadmitted rejected parked send does not count as sent/discarded.
- Immutable stats report capacity, queued/pending state and sent/received/discarded counts without values. No timers, listeners or unbounded promise lists are created.

Runtime endpoint admission, per-node execution records, cancellation ownership and iterator-abandonment handling belong to S08/S09. S04's raw channel permits repeated transport; it cannot execute a packet. Persistence and restart-safe guarantees remain separate extensions.
