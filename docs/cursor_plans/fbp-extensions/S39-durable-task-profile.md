# S39 — Identify which graphs can recover and share task semantics with the in-memory runtime.

Plan revision EXT1-r2. Status **approved-for-execution**. See the [execution receipt](S39-execution.md).
Phase: durable. Proposed branch: `codex/fbp-39-durable-task-profile`.
Order: S38 → S39 → S40.

## Story and boundaries

Identify which graphs can recover and share task semantics with the in-memory runtime.

Introduce reviewed durable task/operator adapters and extract the minimum common invocation/validation/identity kernel. Keep one compiler; durably ineligible arbitrary async-iterator closures fail preflight.

Contract: [durable-contract.md](durable-contract.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S38 merged and its proof handoff verified; D1 pinned artifacts; D3 PostgreSQL; D4 shared kernel/provider safety accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S39.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X39.1](conditions.md); Register bounded pure function with adapterVersion1 and pinned implementation → eligible; arbitrary create() async iterator with no state adapter refuses PROFILE_INELIGIBLE before task entry. Replay safety does not imply automatic retries.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S39.B — Implement the bounded feature

- Allowed: src/runtime/tasks.ts; src/runtime/** minimal shared kernel; src/component.ts eligibility integration; packages/durable/src/profile/**; durable package manifests/exports.
- Prerequisite: S39.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Introduce reviewed durable task/operator adapters and extract the minimum common invocation/validation/identity kernel. Keep one compiler; durably ineligible arbitrary async-iterator closures fail preflight.
- Condition: [X39.2](conditions.md). Run a pure eligible function through the in-memory runtime and the durable task invocation adapter against identical input/config (the SQL scheduler arrives in S40–S42): same validated result, error category, lineage and retry accounting; an ordinary streaming closure without an adapter is refused before effects.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S39.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S39.B; immutable candidate identity before final receipts.
- Obligation/condition: [X39.3](conditions.md). Change task implementation/contract version for a pinned graph: resume refuses VERSION_UNAVAILABLE and does not run a replacement handler. Compute replay is distinguished from one committed outcome.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

The user approved S39.A–C after PR #57 merged with green CI. The initial profile accepts reviewed pure bounded functions. PostgreSQL scheduling, provider effects, and stateful operators remain in their assigned later slices.
