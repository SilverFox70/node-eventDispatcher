# S24E — Use the framework for an understandable content-validation and preview application.

Plan EXT1-r2. Status **blocked-on-decision**; execution approval **none**.
Branch `codex/fbp-24e-application-proof`. Order is authoritative in [manifest](manifest.json) and [index](INDEX.md).
Prerequisites: predecessor merged/receipt verified, accepted D1/D5 interfaces and existing diagnostic bounds. No editor, GraphSpec v2 or artifact/SQL storage prerequisite.
Contract: [explainability](explainability.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).

## Feature obligation

Build one installed Next application using current graph APIs, not the future editor: schema admission, parallel content/media/rule checks, keyed collation, explicit eligibility filter and preview/report. Support form and JSON-upload entry points through the same graph.

Success scenario: Process three synthetic products: valid chair yields preview and checks; incomplete table yields actionable domain validation report; archived lamp is intentionally filtered with reason ARCHIVED. Click preview or missing input to inspect causal chain, isolate each node test and export a sanitized regression.

Consumption contract: [local workspace](local-workspace.md). Also prove local npm workspace consumption: clean install/build/run via public exports without publication, edit/rebuild/watch propagates the expected framework change, and application nodes remain local source.

## Tasks

### S24E.A — Contract fixtures

- Allowed: focused test/type fixtures and planned schema examples only; no production changes.
- Prerequisite: accepted D5/API contract and source/caller preflight.
- Obligation: Admit valid product JSON and malformed root using the same application contract; malformed root produces safe field errors before service calls. Domain-invalid but structurally valid content reaches check nodes as intended.
- Condition: [X24E.1](conditions.md). Use the exact ledger setup/action/assertion and forbidden effects.
- Preserve: existing function/filter signatures, EX1 metadata defaults, business outcomes, bounded observers, no implicit duplicate execution, no-reuse joins and browser/server separation.
- Exclude: future editor/artifact/durable implementation, global packet lookup, arbitrary code execution, automatic production replay, guarantees about unrecorded node reasoning or external rollback.
- Verification/red: Contract and real-boundary fixtures; characterization may pass; meaningful red must reach intended behavior, not missing exports.
- Complete when: exact assertion/test pointers, candidate scope, command exits and applicable per-file ≥95% coverage plus condition proof are recorded. Docs-only evidence is not runtime green.
- Stop: missing evidence is presented as complete; recorder changes business retry/outcome; comparison lacks equivalent fixtures; required behavior needs an unaccepted API or out-of-scope module. Return the smallest amendment to planning.

### S24E.B — Implement the story

- Allowed: examples/content-review/**; fixtures/next-consumer/**; templates/** demo only; scripts/** installed demo proof; docs/**; README.md.
- Prerequisite: S24E.A fixtures and meaningful red where practical.
- Obligation: Build one installed Next application using current graph APIs, not the future editor: schema admission, parallel content/media/rule checks, keyed collation, explicit eligibility filter and preview/report. Support form and JSON-upload entry points through the same graph.
- Condition: [X24E.2](conditions.md). The success scenario above is part of this production-boundary proof.
- Preserve: existing function/filter signatures, EX1 metadata defaults, business outcomes, bounded observers, no implicit duplicate execution, no-reuse joins and browser/server separation.
- Exclude: future editor/artifact/durable implementation, global packet lookup, arbitrary code execution, automatic production replay, guarantees about unrecorded node reasoning or external rollback.
- Verification/red: Focused production tests red→green; npm run check/coverage and owning installed/browser tests per execution.md.
- Complete when: exact assertion/test pointers, candidate scope, command exits and applicable per-file ≥95% coverage plus condition proof are recorded. Docs-only evidence is not runtime green.
- Stop: missing evidence is presented as complete; recorder changes business retry/outcome; comparison lacks equivalent fixtures; required behavior needs an unaccepted API or out-of-scope module. Return the smallest amendment to planning.

### S24E.C — Composed adversarial acceptance

- Allowed: focused owning integration/packed/browser tests and relevant docs within the scope above.
- Prerequisite: S24E.B integrated implementation.
- Obligation: Inject slow media, invalid node output, a definite retryable transport failure and cooperative cancellation: visible states match real runtime; expected domain validation is report data, contract violation follows existing first-terminal policy, no unsupported partial-success or rollback claim.
- Condition: [X24E.3](conditions.md). Use the exact ledger setup/action/assertion and forbidden effects.
- Preserve: existing function/filter signatures, EX1 metadata defaults, business outcomes, bounded observers, no implicit duplicate execution, no-reuse joins and browser/server separation.
- Exclude: future editor/artifact/durable implementation, global packet lookup, arbitrary code execution, automatic production replay, guarantees about unrecorded node reasoning or external rollback.
- Verification/red: Real installed/runtime/browser assertions; actual effect counters and controlled failures; never only helper mocks.
- Complete when: exact assertion/test pointers, candidate scope, command exits and applicable per-file ≥95% coverage plus condition proof are recorded. Docs-only evidence is not runtime green.
- Stop: missing evidence is presented as complete; recorder changes business retry/outcome; comparison lacks equivalent fixtures; required behavior needs an unaccepted API or out-of-scope module. Return the smallest amendment to planning.

## Handoff

Follow execution.md for existing commands and current S19 baseline applicability. Extend existing public runtime/testing/inspector paths; a new competing executor is forbidden. New package commands are not assumed. Keep modules cohesive and normally around200 lines, with reasoned exceptions. Record source/revision/fixture provenance and evidence gaps. Review the following product milestone before editor execution; disappointing results trigger a roadmap amendment, not falsified success.
