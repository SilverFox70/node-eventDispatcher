# S24A — Record explicit decisions, including inputs that intentionally produce no output.

Plan EXT1-r2. Status **blocked-on-decision**; execution approval **none**.
Branch `codex/fbp-24a-decision-evidence`. Order is authoritative in [manifest](manifest.json) and [index](INDEX.md).
Prerequisites: predecessor merged/receipt verified, accepted D1/D5 interfaces and existing diagnostic bounds. No editor, GraphSpec v2 or artifact/SQL storage prerequisite.
Contract: [explainability](explainability.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).

## Feature obligation

Add bounded decision records to the task/function context and built-in filter outcome observations without changing predicate signatures or port behavior. Separate runtime-observed disposition from application-authored business reason.

Success scenario: Run input amount4 through an eligibility predicate threshold5, record reason BELOW_THRESHOLD/rule-v1 and return false: one correlated drop decision, zero outputs, exact input/job/attempt attribution. Legacy boolean-only predicate emits observed drop with reason unavailable.

## Tasks

### S24A.A — Contract fixtures

- Allowed: focused test/type fixtures and planned schema examples only; no production changes.
- Prerequisite: accepted D5/API contract and source/caller preflight.
- Obligation: Validate declared reason code BELOW_THRESHOLD, rule-v1 and bounded fact references against trusted definition metadata; reject undeclared code, raw Error and cross-attempt context before observation, with business execution unchanged.
- Condition: [X24A.1](conditions.md). Use the exact ledger setup/action/assertion and forbidden effects.
- Preserve: existing function/filter signatures, EX1 metadata defaults, business outcomes, bounded observers, no implicit duplicate execution, no-reuse joins and browser/server separation.
- Exclude: future editor/artifact/durable implementation, global packet lookup, arbitrary code execution, automatic production replay, guarantees about unrecorded node reasoning or external rollback.
- Verification/red: Contract and real-boundary fixtures; characterization may pass; meaningful red must reach intended behavior, not missing exports.
- Complete when: exact assertion/test pointers, candidate scope, command exits and applicable per-file ≥95% coverage plus condition proof are recorded. Docs-only evidence is not runtime green.
- Stop: missing evidence is presented as complete; recorder changes business retry/outcome; comparison lacks equivalent fixtures; required behavior needs an unaccepted API or out-of-scope module. Return the smallest amendment to planning.

### S24A.B — Implement the story

- Allowed: src/runtime/diagnostics/**; src/runtime/task-attempt.ts; src/runtime/tasks.ts; src/component.ts; src/function.ts; src/components/filter.ts; src/model/diagnostics/**; public export barrels; focused runtime/type tests.
- Prerequisite: S24A.A fixtures and meaningful red where practical.
- Obligation: Add bounded decision records to the task/function context and built-in filter outcome observations without changing predicate signatures or port behavior. Separate runtime-observed disposition from application-authored business reason.
- Condition: [X24A.2](conditions.md). The success scenario above is part of this production-boundary proof.
- Preserve: existing function/filter signatures, EX1 metadata defaults, business outcomes, bounded observers, no implicit duplicate execution, no-reuse joins and browser/server separation.
- Exclude: future editor/artifact/durable implementation, global packet lookup, arbitrary code execution, automatic production replay, guarantees about unrecorded node reasoning or external rollback.
- Verification/red: Focused production tests red→green; npm run check/coverage and owning installed/browser tests per execution.md.
- Complete when: exact assertion/test pointers, candidate scope, command exits and applicable per-file ≥95% coverage plus condition proof are recorded. Docs-only evidence is not runtime green.
- Stop: missing evidence is presented as complete; recorder changes business retry/outcome; comparison lacks equivalent fixtures; required behavior needs an unaccepted API or out-of-scope module. Return the smallest amendment to planning.

### S24A.C — Composed adversarial acceptance

- Allowed: focused owning integration/packed/browser tests and relevant docs within the scope above.
- Prerequisite: S24A.B integrated implementation.
- Obligation: Throw or overflow diagnostic recorder, retry an operation, and deliver a late callback: business result unchanged; decisions stay attached to their own attempts and stale attempt records cannot masquerade as current results.
- Condition: [X24A.3](conditions.md). Use the exact ledger setup/action/assertion and forbidden effects.
- Preserve: existing function/filter signatures, EX1 metadata defaults, business outcomes, bounded observers, no implicit duplicate execution, no-reuse joins and browser/server separation.
- Exclude: future editor/artifact/durable implementation, global packet lookup, arbitrary code execution, automatic production replay, guarantees about unrecorded node reasoning or external rollback.
- Verification/red: Real installed/runtime/browser assertions; actual effect counters and controlled failures; never only helper mocks.
- Complete when: exact assertion/test pointers, candidate scope, command exits and applicable per-file ≥95% coverage plus condition proof are recorded. Docs-only evidence is not runtime green.
- Stop: missing evidence is presented as complete; recorder changes business retry/outcome; comparison lacks equivalent fixtures; required behavior needs an unaccepted API or out-of-scope module. Return the smallest amendment to planning.

## Handoff

Follow execution.md for existing commands and current S19 baseline applicability. Extend existing public runtime/testing/inspector paths; a new competing executor is forbidden. New package commands are not assumed. Keep modules cohesive and normally around200 lines, with reasoned exceptions. Record source/revision/fixture provenance and evidence gaps. Review the following product milestone before editor execution; disappointing results trigger a roadmap amendment, not falsified success.
