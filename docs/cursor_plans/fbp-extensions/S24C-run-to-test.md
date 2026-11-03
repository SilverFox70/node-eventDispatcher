# S24C — Export a reviewed, sanitized observed case as a regression fixture.

Plan EXT1-r2. Status **blocked-on-decision**; execution approval **none**.
Branch `codex/fbp-24c-run-to-test`. Order is authoritative in [manifest](manifest.json) and [index](INDEX.md).
Prerequisites: predecessor merged/receipt verified, accepted D1/D5 interfaces and existing diagnostic bounds. No editor, GraphSpec v2 or artifact/SQL storage prerequisite.
Contract: [explainability](explainability.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).

## Feature obligation

Export bounded fixture-v1 evidence plus ordinary public runNode/runGraph test scaffold; require explicit redaction and dependency fixture bindings, refuse incomplete essential inputs, and never execute captured commands/services.

Success scenario: Capture one complete fixture case, replace sensitive fields with reviewed synthetic values, generate a test scaffold, install public package in a fresh project and run it offline with injected fixture services; expected output/decision assertions fail on a deliberately changed result.

## Tasks

### S24C.A — Contract fixtures

- Allowed: focused test/type fixtures and planned schema examples only; no production changes.
- Prerequisite: accepted D5/API contract and source/caller preflight.
- Obligation: Validate fixture-v1 input/expected-output/service-script fields after explicit redaction review; unknown format, unresolved placeholders and unapproved dependency bindings refuse before scaffold generation or external effects.
- Condition: [X24C.1](conditions.md). Use the exact ledger setup/action/assertion and forbidden effects.
- Preserve: existing function/filter signatures, EX1 metadata defaults, business outcomes, bounded observers, no implicit duplicate execution, no-reuse joins and browser/server separation.
- Exclude: future editor/artifact/durable implementation, global packet lookup, arbitrary code execution, automatic production replay, guarantees about unrecorded node reasoning or external rollback.
- Verification/red: Contract and real-boundary fixtures; characterization may pass; meaningful red must reach intended behavior, not missing exports.
- Complete when: exact assertion/test pointers, candidate scope, command exits and applicable per-file ≥95% coverage plus condition proof are recorded. Docs-only evidence is not runtime green.
- Stop: missing evidence is presented as complete; recorder changes business retry/outcome; comparison lacks equivalent fixtures; required behavior needs an unaccepted API or out-of-scope module. Return the smallest amendment to planning.

### S24C.B — Implement the story

- Allowed: src/testing/fixtures/**; src/diagnostics/fixture-export/**; src/model/diagnostics/**; public testing exports; fixtures/next-consumer/**; scripts/** packed acceptance; docs/node-authoring.md.
- Prerequisite: S24C.A fixtures and meaningful red where practical.
- Obligation: Export bounded fixture-v1 evidence plus ordinary public runNode/runGraph test scaffold; require explicit redaction and dependency fixture bindings, refuse incomplete essential inputs, and never execute captured commands/services.
- Condition: [X24C.2](conditions.md). The success scenario above is part of this production-boundary proof.
- Preserve: existing function/filter signatures, EX1 metadata defaults, business outcomes, bounded observers, no implicit duplicate execution, no-reuse joins and browser/server separation.
- Exclude: future editor/artifact/durable implementation, global packet lookup, arbitrary code execution, automatic production replay, guarantees about unrecorded node reasoning or external rollback.
- Verification/red: Focused production tests red→green; npm run check/coverage and owning installed/browser tests per execution.md.
- Complete when: exact assertion/test pointers, candidate scope, command exits and applicable per-file ≥95% coverage plus condition proof are recorded. Docs-only evidence is not runtime green.
- Stop: missing evidence is presented as complete; recorder changes business retry/outcome; comparison lacks equivalent fixtures; required behavior needs an unaccepted API or out-of-scope module. Return the smallest amendment to planning.

### S24C.C — Composed adversarial acceptance

- Allowed: focused owning integration/packed/browser tests and relevant docs within the scope above.
- Prerequisite: S24C.B integrated implementation.
- Obligation: Try missing/oversized payload, unknown dependency, credential-containing fixture or unsafe output path: no runnable fixture until reviewed completeness/redaction succeeds, no network/module loading during import, and no overwrite of handwritten tests.
- Condition: [X24C.3](conditions.md). Use the exact ledger setup/action/assertion and forbidden effects.
- Preserve: existing function/filter signatures, EX1 metadata defaults, business outcomes, bounded observers, no implicit duplicate execution, no-reuse joins and browser/server separation.
- Exclude: future editor/artifact/durable implementation, global packet lookup, arbitrary code execution, automatic production replay, guarantees about unrecorded node reasoning or external rollback.
- Verification/red: Real installed/runtime/browser assertions; actual effect counters and controlled failures; never only helper mocks.
- Complete when: exact assertion/test pointers, candidate scope, command exits and applicable per-file ≥95% coverage plus condition proof are recorded. Docs-only evidence is not runtime green.
- Stop: missing evidence is presented as complete; recorder changes business retry/outcome; comparison lacks equivalent fixtures; required behavior needs an unaccepted API or out-of-scope module. Return the smallest amendment to planning.

## Handoff

Follow execution.md for existing commands and current S19 baseline applicability. Extend existing public runtime/testing/inspector paths; a new competing executor is forbidden. New package commands are not assumed. Keep modules cohesive and normally around200 lines, with reasoned exceptions. Record source/revision/fixture provenance and evidence gaps. Review the following product milestone before editor execution; disappointing results trigger a roadmap amendment, not falsified success.
