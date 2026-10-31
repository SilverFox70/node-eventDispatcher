# Collating asynchronous results

`joinByKey(inputContracts, options)` waits for one packet from each named input with the same exact `(jobId, key)`, then emits one combined result on `out`. It uses the existing graph compiler/runtime and the same bounded readiness reader as merge. No positional pairing or global result store is involved.

```js
const signupResult = joinByKey({
  profile: profileResultContract,
  settings: settingsResultContract,
}, {
  outputId: 'signup-result@1',
  maxKeys: 32,
  completedGroupLimit: 1000,
});
```

The output contract is the strict object `{ profile: profileResult, settings: settingsResult }`. Every property is required, extra properties refuse, and each property uses its original contract validator. Types retain the exact names and individual value types. The output schema is composed from trusted contract descriptors; it does not interpret schemas or convert them back into Zod. Built-in jsonContract may be a member: its property descriptor is `{}`, while the product itself remains strict. Browser metadata accepts this composition but still does not evaluate application payloads.

outputId is required, versioned and subject to the same identity/consistency rules as other contracts. Do not reuse it for a different product shape. The component definition's default ID is join-by-key@1; use the existing defineComponent({...joinByKey(...),id:'signup-join'}) pattern for distinct joins in one registry.

## Correlation and lineage

All matching results must share an explicit jobId and key. Calling packet() independently without jobId starts independent jobs, even if the key is equal. A broadcast followed by maps preserves the shared job/key automatically.

For inputs a/b, arrivals a:x1, a:y2, b:y20, b:x10 yield y{a:2,b:20}, then x{a:1,b:10}. Output order is completion order. Parent IDs follow input declaration order (JavaScript's own property enumeration order), regardless of arrival. Each output has a fresh packet ID, the shared job/key and exactly those immediate parents. Inputs may number2–256.

Different jobs with the same key remain separate. Different revision keys also remain separate; correlation text is not a database revision check. Duplicate delivery of the same packet to one node is refused by runtime admission before the join sees it. A distinct packet targeting an occupied input/group is a separate duplicate-key error.

## Bounds and failures

| Setting | Default | Allowed values | Counts |
| --- | --- | --- | --- |
| maxKeys | 128 | Integer1–4096 | Incomplete job/key tuples |
| completedGroupLimit | 65536 | Integer1–1048576 | Completed tuples retained for this join node/run |

A group releases its partial-payload storage when it completes. Its completion marker is reserved before output validation/derivation/delivery, and remains until terminal cleanup. A blocked or failed output cannot reopen that group. There is no live-run marker eviction, automatic expiry or workflow retry. Bounds count groups rather than total bytes; choose application payload sizes and limits together.

| Condition | Result |
| --- | --- |
| Missing key | INVALID_PACKET |
| Distinct packet for an occupied input of an incomplete tuple | DUPLICATE_KEY |
| New tuple when incomplete capacity is full | JOIN_CAPACITY |
| Fresh packet for a completed tuple | JOIN_GROUP_COMPLETED |
| Final member when completion history is full | JOIN_HISTORY_CAPACITY, before accepting that member/output |
| All inputs EOF with any incomplete group | JOIN_INCOMPLETE; no partial result |
| Combined value exceeds JSON packet limits | OUTPUT_CONTRACT with safe attributed validation details; no output admission |

These failures terminate the run. Already delivered complete groups remain delivered; there is no rollback. One input EOF alone does not finish the join. The overall flow timeout/cancellation owns an indefinitely missing branch; join transport waits do not start an operation timer. Business failures must be declared as result data if the graph should collate them rather than fail.

State is fresh per node/run and cleared on termination. Another run may legitimately use the same job/key. Restart-safe deduplication and durable workflow recovery remain the optional durable-host roadmap.

## Run it

```sh
npm run build
node examples/03-keyed-collation.cjs
```

[The demo](../../examples/03-keyed-collation.cjs) splits one request into asynchronous profile/settings operations with different result contracts and emits one collated object. These operations are local stand-ins; no external database or service is contacted. See [the examples guide](../../examples/README.md), [stream components](stream-components.md) and [S11 receipt](../cursor_plans/fbp-slices/S11-execution.md).
