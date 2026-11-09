# S51 — Install and operate an optional durable host with honest recovery guarantees.

Plan revision EXT1-r3. Status **approved-for-execution**. See the [approved design and execution receipt](S51-execution.md).
Phase: durable. Proposed branch: `codex/fbp-51-durable-installed-adoption`.
Order: S50 → S51 → future application-specific pilots.

## Story and boundaries

Install and operate an optional durable host with honest recovery guarantees.

Ship packed durable consumer, migrations/backups/retention/upgrade runbooks and small obligation demo; record support matrix and artifact/handler version policy. Application production changes require separate approval.

Contract: [durable-contract.md](durable-contract.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).
Prerequisites: S50 merged and its proof handoff verified; D1 pinned artifacts; D3 PostgreSQL; D4 shared kernel/provider safety accepted for this slice. No unreviewed public signatures.
Read predecessor journal/merge receipt at execution time; this plan is not that receipt.

Consumption contract: [local workspace](local-workspace.md). Also prove local npm workspace host composition; rebuilds cannot silently replace pinned running code and core-only dependency isolation remains intact.

## Tasks

### S51.A — Contract and regression fixtures

- Allowed: focused test/type fixtures adjacent to the owned modules below; no production changes in this task.
- Prerequisite: slice prerequisites above and current source/caller inventory.
- Obligation: Add or extend the focused contract/type characterization for the reviewed schema and refusal rules before implementing behavior. Pin the exact fixture and expected result from the ledger.
- Condition: [X51.1](conditions.md); Load retention/backup compatibility policy with unresolved operation and completed join tombstone → unsafe delete refuses; missing pinned code/schema version refuses resume. A successful migration never rewrites immutable historical graph content.
- Verification/red: Type/contract tests must reach the intended validation boundary; preserve existing v1/EX1 and public package fixtures. A missing export alone is not behavioral red.
- Complete when: fixture/proposal and exact assertions are recorded with current HEAD and ledger pointer; gaps remain named.
- Stop: a schema, authority or lifetime choice differs from the accepted domain contract; amend it before dependent tasks.

### S51.B — Implement the bounded feature

- Allowed: packages/durable/** packaging/docs/retention only; examples/durable/**; templates/**; scripts/** installed acceptance; docs/**; README.md.
- Prerequisite: S51.A evidence; meaningful red where feasible, and accepted interfaces.
- Obligation: Ship packed durable consumer, migrations/backups/retention/upgrade runbooks and small obligation demo; record support matrix and artifact/handler version policy. Application production changes require separate approval.
- Condition: [X51.2](conditions.md). Clean-install core/artifacts/durable packages, migrate a fresh DB, submit and recover a fixture obligation, back up/restore and resume a compatible pinned revision; core-only consumers need no database packages.
- Verification: focused production-path assertions red→green, current check/coverage gates and owning package suite as defined in execution.md.
- Preserve: packet/job/run identities, no implicit duplicate execution, explicit retry policy, JSON/DAG limits, browser/server isolation and existing in-memory consumers.
- Exclude: later-slice features, global dedup/payload lookup, arbitrary source evaluation, rich codecs/cycles, deployment and application-specific production migration.
- Complete when: the story is proved through its real owning boundary, scope remains bounded and no unsupported package is introduced.
- Stop: an implementation requires a second interpreter, weakens validation, silently replays an uncertain effect, or expands outside the allowlist; record the smallest amendment.

### S51.C — Composed acceptance and handoff

- Allowed: focused tests, owning adapter/fixture integration, package acceptance scripts and relevant docs within the scope above; no unrelated fixes.
- Prerequisite: S51.B; immutable candidate identity before final receipts.
- Obligation/condition: [X51.3](conditions.md). Attempt deletion of unresolved operation/tombstone data or resume on incompatible code: retention guard/version refusal prevents unsafe replay; missing backup or provider evidence is reported as a recovery limit, never masked as success.
- Verification: the proof level in the authoritative ledger and execution.md, including real browser/installed consumer or real DB/process/HTTP boundaries where specified.
- Complete when: commands, exits, condition assertions, per-file coverage, resource cleanup, remaining limits and predecessor/next handoff are recorded separately from publication.
- Stop: a mock/helper is the only proof for a downstream guarantee, a stale receipt is reused, or no reproducible controlled fixture reaches the intended case.

## Scope and review

Implementation destinations above are proposed cohesive ownership roots; create only the modules this feature needs, roughly a couple of hundred lines per handwritten file where reasonable. Keep named responsibilities, selective JSDoc and no miscellaneous utilities bucket. New paths are not claimed to exist. Root package/build edits require D2 agreement; keep optional dependencies optional. Task scope includes the minimal owning package build/test configuration when first introduced, never global machine configuration.

The user approved S51.A–C and authorized a review PR after installed and workspace adoption, native backup and restore, pinned resume and retention refusal pass.
