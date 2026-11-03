# S24D — Compare two graph/code revisions against the same fixed test case.

Plan EXT1-r2. Status **blocked-on-decision**; execution approval **none**.
Branch `codex/fbp-24d-revision-comparison`. Order is authoritative in [manifest](manifest.json) and [index](INDEX.md).
Prerequisites: predecessor merged/receipt verified, accepted D1/D5 interfaces and existing diagnostic bounds. No editor, GraphSpec v2 or artifact/SQL storage prerequisite.
Contract: [explainability](explainability.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).

## Feature obligation

Run reviewed fixtures against two explicit registry/graph snapshots using production test helpers; correlate by fixture case and logical origin, report changed outputs/decisions/paths and absent evidence, never by random packet IDs.

Success scenario: Change one tax node from rate0.10 to0.20 for input amount100: report output10→20 on that path, sibling unchanged, recorded rule revision changed. Repeating identical revisions/fixtures yields no semantic differences despite fresh runtime IDs/timings.

## Tasks

### S24D.A — Contract fixtures

- Allowed: focused test/type fixtures and planned schema examples only; no production changes.
- Prerequisite: accepted D5/API contract and source/caller preflight.
- Obligation: Validate comparison pair with identical fixture hash, dependency script and explicit code/graph digests; fresh runtime IDs are ignored, but mismatched fixtures produce NOT_COMPARABLE and no semantic verdict.
- Condition: [X24D.1](conditions.md). Use the exact ledger setup/action/assertion and forbidden effects.
- Preserve: existing function/filter signatures, EX1 metadata defaults, business outcomes, bounded observers, no implicit duplicate execution, no-reuse joins and browser/server separation.
- Exclude: future editor/artifact/durable implementation, global packet lookup, arbitrary code execution, automatic production replay, guarantees about unrecorded node reasoning or external rollback.
- Verification/red: Contract and real-boundary fixtures; characterization may pass; meaningful red must reach intended behavior, not missing exports.
- Complete when: exact assertion/test pointers, candidate scope, command exits and applicable per-file ≥95% coverage plus condition proof are recorded. Docs-only evidence is not runtime green.
- Stop: missing evidence is presented as complete; recorder changes business retry/outcome; comparison lacks equivalent fixtures; required behavior needs an unaccepted API or out-of-scope module. Return the smallest amendment to planning.

### S24D.B — Implement the story

- Allowed: src/testing/comparison/**; src/model/diagnostics/**; src/diagnostics/fixture-export/**; fixtures/next-consumer/**; focused packed/browser/type tests.
- Prerequisite: S24D.A fixtures and meaningful red where practical.
- Obligation: Run reviewed fixtures against two explicit registry/graph snapshots using production test helpers; correlate by fixture case and logical origin, report changed outputs/decisions/paths and absent evidence, never by random packet IDs.
- Condition: [X24D.2](conditions.md). The success scenario above is part of this production-boundary proof.
- Preserve: existing function/filter signatures, EX1 metadata defaults, business outcomes, bounded observers, no implicit duplicate execution, no-reuse joins and browser/server separation.
- Exclude: future editor/artifact/durable implementation, global packet lookup, arbitrary code execution, automatic production replay, guarantees about unrecorded node reasoning or external rollback.
- Verification/red: Focused production tests red→green; npm run check/coverage and owning installed/browser tests per execution.md.
- Complete when: exact assertion/test pointers, candidate scope, command exits and applicable per-file ≥95% coverage plus condition proof are recorded. Docs-only evidence is not runtime green.
- Stop: missing evidence is presented as complete; recorder changes business retry/outcome; comparison lacks equivalent fixtures; required behavior needs an unaccepted API or out-of-scope module. Return the smallest amendment to planning.

### S24D.C — Composed adversarial acceptance

- Allowed: focused owning integration/packed/browser tests and relevant docs within the scope above.
- Prerequisite: S24D.B integrated implementation.
- Obligation: Change fixture/service facts or omit one revision binding: comparison refuses comparable verdict; no fresh external calls or invented outputs. Passing captured fixtures is reported as tested impact, never proof all future behavior is unchanged.
- Condition: [X24D.3](conditions.md). Use the exact ledger setup/action/assertion and forbidden effects.
- Preserve: existing function/filter signatures, EX1 metadata defaults, business outcomes, bounded observers, no implicit duplicate execution, no-reuse joins and browser/server separation.
- Exclude: future editor/artifact/durable implementation, global packet lookup, arbitrary code execution, automatic production replay, guarantees about unrecorded node reasoning or external rollback.
- Verification/red: Real installed/runtime/browser assertions; actual effect counters and controlled failures; never only helper mocks.
- Complete when: exact assertion/test pointers, candidate scope, command exits and applicable per-file ≥95% coverage plus condition proof are recorded. Docs-only evidence is not runtime green.
- Stop: missing evidence is presented as complete; recorder changes business retry/outcome; comparison lacks equivalent fixtures; required behavior needs an unaccepted API or out-of-scope module. Return the smallest amendment to planning.

## Handoff

Follow execution.md for existing commands and current S19 baseline applicability. Extend existing public runtime/testing/inspector paths; a new competing executor is forbidden. New package commands are not assumed. Keep modules cohesive and normally around200 lines, with reasoned exceptions. Record source/revision/fixture provenance and evidence gaps. Review the following product milestone before editor execution; disappointing results trigger a roadmap amendment, not falsified success.
