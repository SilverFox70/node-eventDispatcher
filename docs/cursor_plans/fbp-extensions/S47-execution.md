# S47 execution preflight

PR #65 passed the Next.js consumer, PostgreSQL and all three OS verification jobs. GitHub squash-merged it to master at `03d4a9b6ed812a925d4b0e31a036b512044ea3db`. The S47 branch starts at that commit.

The user approved this RC1-r1 storage and retention design, including retaining completion records for the lifetime of the run, and authorized opening a PR after PostgreSQL crash recovery and duplicate delivery passed.

## Pin the existing join

Accept the built-in join-by-key through its actual factory identity, using the same registration pattern as S46. Pin the ordered input names and existing normalized join configuration in the durable adapter digest. Reuse the existing validation for unique input names, the 2–256 input bound and options. Preserve the existing per-node limits of 128 partial groups and 65,536 completions by default, including their configurable ranges. Reject an absent packet key before changing join state.

## Persist slots and completion separately

Proposed migration 008 adds three tables in `nodeflow_durable`.

| Table | Key | Stored state |
| --- | --- | --- |
| join_groups | run_id, node_id, job_id, group_key | Ordered expected port names with a 2–256 cardinality check. Run foreign key. |
| join_slots | run_id, node_id, job_id, group_key, input_port | Original packet ID. Foreign keys to the partial group and to the packet in the same run. |
| join_completions | run_id, node_id, job_id, group_key | Final step ID and creation timestamp. Foreign key to the final step in the same run. |

Group identity columns are required. Index the partial and completion keys in that order so capacity checks can scope counts to the run and node. A completion has no foreign key to the partial group. Remove slots with their group after completion or terminal cleanup. Keep completion keys for the entire retained run. S47 adds no completion deletion or namespace reuse operation.

## Transaction and refusals

Use the S46 run lock, pinned profile and lease/epoch checks. Within that transaction, resolve an existing commit for the same step first. For a new step, check for a completed group, validate the declared input port, then check for a filled slot and available capacity. Preserve the existing JOIN_GROUP_COMPLETED, DUPLICATE_KEY, JOIN_CAPACITY and JOIN_HISTORY_CAPACITY codes. An identical commit retry returns the original status. A different delivery to the same group slot refuses.

For a partial group, commit the packet reference and acknowledge the incoming edge together so the slot survives restart without occupying the edge. On the last input, order parents by declared port names and build the existing join payload and lineage. Insert the completion key, remove the partial state and save the output to S46's routing commit in the same transaction. When downstream capacity is available, admit it immediately. When capacity is full, the persisted routing batch is the sole continuation and the group is already closed. The S46 sweep can admit that batch later without running the join again.

When the finite run has no further work and a partial group remains, fail with JOIN_INCOMPLETE. On terminal failure or cancellation, release partial group state under the run lock. Retain completion markers. Stale claims and terminal runs cannot create new slots.

## Proof to run

- X47.1 uses the actual compiler to reject invalid port counts and duplicate names, then verifies separate slot and completion identities.
- X47.2 kills a worker after the stats transaction commits. A replacement handles species and emits one packet with the two immediate parents. Interleave a second job with the same key to check isolation.
- X47.3 exercises filled slots, completed groups, capacity and terminal cleanup against PostgreSQL. Add a full outgoing edge case to verify that the final packet can remain pending while the completion key still prevents reuse.

## Implementation and verification

Migration 008 adds the partial and completion tables. PostgreSQL stores keys as JSON strings in the index to preserve the full packet key domain, including characters SQL text cannot store directly. The routed worker submits an empty output record for a join delivery. The store uses the pinned built-in policy, builds the joined packet from the stored inputs, and uses the same admission machinery as other routed outputs. Existing runnable functions and linear/provider profiles keep their prior paths.

- X47.1 passed the profile fixture for two and 256 ports, one and 257 refusals, duplicate graph admission, and resume refusal after changing port order or capacity.
- X47.2 passed against PostgreSQL 16. The child process committed only stats, exited via SIGKILL, and left one slot and zero outputs. Replacement workers finished two jobs with the same key and verified each result against its own ordered parent IDs.
- X47.3 passed against PostgreSQL 16. Duplicate and completed-group deliveries returned explicit refusals, identical claim retries preserved the receipt, and the full-edge case retained the completion while its sole output awaited delivery. Capacity, malformed persisted delivery and incomplete terminal paths verified rollback or partial cleanup.

On Node v26.13.0, `npm run test:postgres` passed 31 tests with the per-file gate and repeated the integration checks in an installed tarball consumer. `npm run test:durable` passed the five profile cases with its coverage gate and installed consumer. Local raw results are in `/tmp/s47-pg-final.log` and `/tmp/s47-durable.log`. The scope excludes changes to the existing precommit claim recovery budget. An expired claim with no remaining allowance can still hold the delivery before it has committed a slot.
