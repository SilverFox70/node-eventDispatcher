# Extension execution and proof handoff — EXT1-r2

Planning contract only. Existing [repository rules](../../agent-rules/scope-and-handoff.md), [readability](../../agent-rules/readability-and-structure.md), [verification](../../agent-rules/verification.md) and [foundation SP1](../fbp-slices/shared-execution.md) apply; this document adds extension-specific gates without granting execution/publication.

## Before a feature branch

1. Read AGENTS, documentation map, current architecture, this index/domain contract, selected slice and canonical condition rows.
2. Inspect dirty state/HEAD/remote and preserve unrelated user files. Reuse an appropriate checkout; do not reset/stash other work. Fetch/verify predecessor merged to master (explicit stacking amendment is the only exception). Proposed `codex/` branch names are in the extension manifest.
3. Verify accepted contract revision and D1–D5 decisions for the selected slice. S20/design review is independently executable only when requested. Unsettled APIs/SQL/ownership block affected implementation, not unrelated investigation.
4. Before first extension implementation, make a bounded docs amendment to the execution runbook/repository slice skill so named S20+ discovery reads this separate index/manifest rather than assuming the foundation manifest includes it. Preserve the historical foundation order and receipts; run the guidance checker. This is a required S20 handoff, not a global agent installation.
5. Trace current producers/consumers; confirm permitted file/symbol ownership. Files in plans are proposed destinations, not claims they exist. A bigger current-source change requires re-slicing/contract amendment before coding.

## Existing commands — verified from package.json, not run in this planning pass

Use checked-in exact Node/npm pins; at planning time Node26.13.0/npm11.20.0. Existing commands:

```sh
node scripts/check-agent-guidance.mjs
npm run check
npm test
npm run coverage
npm run test:package
npm run test:next
```

`npm run check` builds/typechecks/lints; `npm test` is the delivered offline suite, despite historical placeholder notes in older rules. `coverage` enforces per-file source coverage. `test:package` proves installed consumers; `test:next` is production packed Next/HTTP/browser proof. The public API demo is explicitly opt-in; stress uses an owned loopback provider. None of these currently proves SQL persistence or editor interactions that do not exist.

Baseline reference: [baseline index](../../agent-baselines/INDEX.md) plus [S19 receipts](../fbp-slices/S19-execution.md). Historical pre-modernization failures are not current green results. Reuse a receipt only when ancestry, runtime, lock/config and changed scope remain applicable. Capture missing diagnostics instead of rerunning every expensive suite for each task.

## New package and database gate ownership

| Owner | Must introduce before claiming relevant proof | Required real boundary |
| --- | --- | --- |
| S26 | editor build/type/lint/test/coverage and isolated pack/install integration, hooked into final gates | browser/client Next production build and assets |
| S32 | artifact package build/type/lint/test/coverage and packed consumer command | canonical model fixtures plus installed ESM/CJS/types |
| S33 | SQLite repository test command with temporary database/process crash harness | actual disk transactions/CAS/reopen; no in-memory repository substitute |
| S39 | durable package build/type/lint/test/coverage and shared-kernel parity | eligible and ineligible real production tasks |
| S40 | PostgreSQL migrations and explicit DB integration command/CI service | real supported PostgreSQL, transaction rollback/isolation |
| S42 | multi-process worker runner and barrier/crash fixture protocol | two OS processes, not two mocked promises |
| S43 | controllable local provider endpoint/call ledger and crash injection | actual HTTP accept/response/result-loss boundaries |
| S50–S51 | composed qualification and isolated packed durable adoption commands | real DB/process/provider plus clean consumer |

Exact new script names/config/files are frozen in the owning contract/preflight, then implemented and proved by that slice. **Unavailable now**: workspace/editor/artifact/durable/SQL qualification scripts. A future command name in a plan must never be reported as an available passing gate. Root/core-only gates remain available and independent of SQL/editor installation; optional-package suites are required when their code changes.

The first package slice must add source-mapped all-files coverage over its production source, including never-imported files; generated code and tests are excluded from the denominator with documented rationale. Every changed production file targets statements/lines/branches≥95% plus assertions for100% of meaningful reachable conditions. No suite-total substitution. Unreachable exceptions require branch-specific evidence. Browser UI needs DOM/keyboard/event assertions as well as line coverage; SQL needs transaction effects, not only adapter-line execution.

## Task proof and acceptance

The [ledger](conditions.md) is the only condition/result map. Each row has one slice/task owner; prior task fixture authorship is not competing proof ownership. Preserve existing suitable tests and add only meaningful missing assertions. Refine exact test file/name/assertion at implementation preflight; do not claim future file guesses as existing evidence.

A task A contract fixture can already pass for preserved behavior. New behavior B needs a valid fixture reaching the intended production guard, meaningful red, then green. Missing imports/undefined exports or a failure at an earlier unrelated guard are not behavioral red. Design/documentation tasks have red N/A, with explicit source/decision walkthrough instead. Where a new boundary cannot produce pre-change runtime red, record the existing-behavior contrast and nearest executable seam honestly.

Use deferred operations, controlled clocks and process IPC barriers. Crash injection labels concrete boundaries: before/after intent commit, provider accepted, before/after outcome commit and before/after notification. Restart inspects actual persisted rows and actual provider call count. Wrong resource/tenant/fingerprint/version/epoch tests assert **zero forbidden calls/writes**, not just a refusal code. Clean up only owned processes/ports/temp files/connections.

Final feature gates include applicable core checks, per-package all-files coverage, installed package/type proof, Next/browser proof for UI/server changes and real database/process tests for storage/recovery. Do not defer all downstream proof to the final acceptance slice. Reuse still-valid expensive receipts; repeat when changes invalidate them. A public endpoint being up is demonstration evidence, not a correctness test.

## Handoff format

Create `SNN-execution.md` in this directory at actual execution start. Record contract revision, approved scope, base/HEAD/dirty paths, decision/predecessor receipt, task state, commands/exits, precise assertion pointers for XNN rows, coverage denominator/exceptions, known/not-run/unavailable results, cohesion review and next action. No payloads/secrets in logs. Link raw receipts in safe local evidence or CI artifact locations.

Distinguish implementation complete, behavioral proof, quality/coverage, publication and actual merge. A future journal/merge receipt establishes completion; plan status never does. Update only the selected manifest entry with verified facts when authorized; never mark all future slices ready from one green suite.

Commit/push/PR/merge/deployment remain governed by the current user’s scope, repository hooks and protections. This planning pass saves local documents only. No release/npm publication or Realberry change is implied.

## Explainability insertion proof ownership

S24A–S24F use existing core/testing/Next acceptance paths, extended by each owning slice. No SQL/editor/artifact package dependency is introduced early. Current scripts do not yet prove these new features. S24C owns generated offline fixture installed proof; S24D same-fixture semantic comparison; S24E real application/browser/effect counters; S24F executable parity protocol and honestly labeled usability evidence. Record the S24F checkpoint before S25.
