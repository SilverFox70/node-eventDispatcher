# S29 — Run explicit test inputs against the graph being edited.

Plan revision EXT1-r2. Status **approved-for-execution**. See the [execution receipt](S29-execution.md).
Phase: editor. Proposed branch: `codex/fbp-29-editor-test-runs`.
Order: S28 → S29 → S30.

## Story and boundaries

Run explicit test inputs against the graph being edited.

Provide a host-owned test-run adapter using the production compiler/runtime, fixture/service capability allowlists, active-run quotas, input validation and owned cancellation. No general remote-code endpoint.

Add a short test-run walkthrough with fixture inputs and an expected result. Explain which draft snapshot the run uses, where to see results, and what Cancel does. Starting the fixture run requires the user to choose Run test.

Contract: [editor.md](editor.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S28 merged and its proof handoff verified; D1 model compatibility; D2 package/canvas compatibility accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

## Tasks

### S29.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X29.1](conditions.md); Host receives valid test input and allowed fixture dependency role → run admission validates both; excess active-run quota and unapproved role refuse before handler/fetch counters increase. One cancellation closes its own run only.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S29.B — Implement the bounded feature

- Allowed: packages/editor/src/runs/**; fixtures/next-consumer/app/api/**; fixtures/next-consumer/lib/**; src/testing/** only if existing public harness needs an approved adaptation. The existing editor shell and initial draft state wire the run controls and separate sample draft.
- Prerequisite: S29.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Provide a host-owned test-run adapter using the production compiler/runtime, fixture/service capability allowlists, active-run quotas, input validation and owned cancellation. No general remote-code endpoint.
- Condition: [X29.2](conditions.md). Wire split→two async transforms→join, send three named inputs and observe three correctly collated results with job/packet lineage; compiled revision/hash is the exact editor snapshot tested.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S29.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S29.B; immutable candidate identity before final receipts.
- Obligation/condition: [X29.3](conditions.md). Send an unauthorized registry binding, stale graph hash or invalid input: zero external calls. Edit during a run: the active run keeps its pinned snapshot and later Run uses the new snapshot.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

The user authorized S29.A–C after the S28 merge. This slice uses the installed fixture registry and existing public runtime harness.
