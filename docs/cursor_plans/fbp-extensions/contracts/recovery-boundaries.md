# S20 recovery boundary RC1-r1

Status: selected design proposal for S39–S51, not implemented. Refines [durable plan](../durable-contract.md). PostgreSQL engine accepted by user; exact DDL/operator state adapters remain blocked on their named preflight designs. No Realberry adoption claim.

## Eligibility and identity

No checkpoint of arbitrary JavaScript closures/iterators. Accept only registered bounded task adapters and versioned supported operators; one shared payload/config/task-policy/identity kernel and the existing compiler. S39 must name the exact extraction symbols from current `src/runtime/tasks.ts`, task-attempt/validation modules and prove in-memory/adapter parity before SQL scheduling. Arbitrary create() streaming processes refuse PROFILE_INELIGIBLE pre-effect.

Opaque distinct IDs: job business intent, run execution instance, logical step input, attempt, immutable packet, claim epoch, provider operation. A unique `(workspaceId,jobId)` plus immutable input fingerprint identifies one submitted run; same input returns original, different input refuses INPUT_CONFLICT. Packet duplicate admission is still per logical node/run; no permission to reprocess merely because a message is redelivered. Pin graph/handler/contract/policy digests; mismatch refuses VERSION_UNAVAILABLE, never selects latest.

## Exact ordering chosen

1. Host owns one PG connection/transaction. Application mutation and `tx.stage({jobId,revisionId,input})` commit together, or neither exists. Capability expires after commit/rollback; another connection cannot stand in for the mutation transaction. Node-postgres requires [the same client for all transactional statements](https://node-postgres.com/features/transactions). Application ORM integration is still unverified.
2. Due step claim increments epoch under row lock/CAS. No provider call under SQL claim/commit transaction or generic transaction-retry closure. Lost notifications cannot lose work: persisted due state plus bounded sweep is authoritative.
3. Register exact provider business key/fingerprint/resource revision before effects. Acquire resource slot ordered across different jobs. Mismatched reuse refuses, later conflicting resource revision waits behind unresolved prior operation.
4. Commit invocation-intent and authorize one original worker before HTTP. Lease loss can fence later SQL commits but cannot retract the original process’s already-authorized external invocation.
5. Outcome/derived packets/successor readiness/notification intent commit in one transaction after schema/epoch checks. One unique committed step outcome, not exactly-once code execution or provider effects. Duplicate identical commits return same outcome; conflicting/stale ones refuse.

## Two-worker crash walkthrough X20.3

| Boundary | Persisted state / recovery action | Forbidden result |
| --- | --- | --- |
| Domain transaction rolls back | no mutation, obligation or due work | no provider call |
| Worker A dies before intent commit | work can be claimed under configured safe attempt policy | no lost committed obligation |
| A commits intent, pauses before HTTP | intent unresolved; recovery B holds operation/resource slot | B cannot assume absence means no future call by A |
| Provider accepts, A dies before local result | uncertain; B queries matching provider evidence | no automatic second non-idempotent invocation |
| A resumes after epoch takeover | provider might still receive A’s original call; local outcome commit STALE_CLAIM | no stale successor/result overwrite |
| Matching authoritative success found | validate original result, CAS resolution and commit successor once | no second provider call |
| Provider lookup absent/inconclusive | stay blocked unless final nonapplication and original invocation cannot still occur are proved | no blind replay based on absence |
| Outcome commits, notification lost | sweep finds successor; notification may repeat | no duplicate successor or lost continuation |

Reconciliation evidence includes operation/business key, fingerprint, resource/revision, provider policy/version, observed outcome and evidence reference. The selected policy must establish finality/visibility and whether original invocation remains possible. Safe replay requires definitive nonapplication plus proof no late original call, or an actual provider idempotency guarantee within its documented scope. Generic wrapper IDs cannot create provider idempotency. Manual resolution requires authorized actor, command key, expected revision and policy-valid evidence; invalid/mismatched result refuses without effects. Never let “human approved” turn uncertainty into proven fact.

## Replay, time and terminal states

Default retries0; explicit1–5 and replay policy required. Recovery recomputation consumes the same attempt allowance, not a hidden unlimited budget. Interrupted invoked task with no safe remaining attempt stays held for explicit policy-valid operator action; queued work not yet invoked can be reclaimed. A durable host can preserve an obligation without automatically finishing an inherently ambiguous effect. S45 must distinguish waiting-on-uncertainty/recovery-budget-exhausted from a lost job and from a terminal successful job.

Persist flow deadline/attempt count/notBefore against database time; local attempt budget uses monotonic time and cannot reset on restart. Existing flow/node validation remains. Cancellation revokes owned capabilities and blocks new successors, but unresolved provider intent remains for reconciliation even if the run is cancelled. No rollback promise. First terminal state wins; stale timer/signal cannot revive it.

Persist join partial slots, same-job parents and completion evidence; final-slot/output/completion atomic. Completed group not reusable, inputs2–256. Never delete dedup/completion/operation evidence while a supported late delivery could repeat an effect; retention policy either preserves horizon or permanently retires identity namespace. S47/S51 own actual SQL/retention proof.

## Design gates intentionally not discharged by S20

- S39.A kernel extraction/adapter schema and eligible operator fixtures before production durable code.
- S40.A exact SQL tables/indexes/unique/CAS and transaction capability/driver/CI service schema, including domain integration specimen; real two-connection rollback proof.
- S43.A provider-specific invocation permit/reconciliation evidence schema and finality proof; real HTTP paused-old-worker fixture. No actual North Capital contract audited here.
- S46.A exact bounded fan-out materialization cursor/transaction schema; no ad-hoc unbounded packet materialization.
- S47.A join tombstone/horizon DDL and S48.A wait/signal inbox schema/authorization.

These must be reviewed as bounded prerequisite artifacts before their B tasks. A named design gate is not a license for an implementation agent to guess. S20 records the exact boundary rules/crash outcomes, not fabricated migration/qualification success. X39–X51 remain future owned runtime/DB/process/provider proofs.
