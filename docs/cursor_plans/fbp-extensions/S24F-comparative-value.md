# S24F — Measure whether the application is easier to diagnose, test and change.

Plan EXT1-r2. Status **blocked-on-decision**; execution approval **none**.
Branch `codex/fbp-24f-comparative-value`. Order is authoritative in [manifest](manifest.json) and [index](INDEX.md).
Prerequisites: predecessor merged/receipt verified, accepted D1/D5 interfaces and existing diagnostic bounds. No editor, GraphSpec v2 or artifact/SQL storage prerequisite.
Contract: [explainability](explainability.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).

## Feature obligation

Implement an equivalent competent plain-TypeScript application and publish a reproducible comparison protocol/results. Both versions use the same fixtures, service adapters, concurrency/rate-limit policy, abort propagation and domain assertions.

Success scenario: Run identical normal/failure/cancel/change tasks in both versions: compare semantic results/effect counts, application code/setup cost, diagnosis evidence, isolated tests and change surface; separately report measured resource/latency observations without guaranteed wins.

## Tasks

### S24F.A — Contract fixtures

- Allowed: focused test/type fixtures and planned schema examples only; no production changes.
- Prerequisite: accepted D5/API contract and source/caller preflight.
- Obligation: Verify both implementations consume byte-identical fixture/service scripts and pass the same semantic/cancel/effect-count tests before measuring; a missing abort/concurrency limit invalidates the comparison.
- Condition: [X24F.1](conditions.md). Use the exact ledger setup/action/assertion and forbidden effects.
- Preserve: existing function/filter signatures, EX1 metadata defaults, business outcomes, bounded observers, no implicit duplicate execution, no-reuse joins and browser/server separation.
- Exclude: future editor/artifact/durable implementation, global packet lookup, arbitrary code execution, automatic production replay, guarantees about unrecorded node reasoning or external rollback.
- Verification/red: Contract and real-boundary fixtures; characterization may pass; meaningful red must reach intended behavior, not missing exports.
- Complete when: exact assertion/test pointers, candidate scope, command exits and applicable per-file ≥95% coverage plus condition proof are recorded. Docs-only evidence is not runtime green.
- Stop: missing evidence is presented as complete; recorder changes business retry/outcome; comparison lacks equivalent fixtures; required behavior needs an unaccepted API or out-of-scope module. Return the smallest amendment to planning.

### S24F.B — Implement the story

- Allowed: examples/content-review/plain-typescript/**; examples/content-review/comparison/**; scripts/** comparison harness; docs/**; README.md.
- Prerequisite: S24F.A fixtures and meaningful red where practical.
- Obligation: Implement an equivalent competent plain-TypeScript application and publish a reproducible comparison protocol/results. Both versions use the same fixtures, service adapters, concurrency/rate-limit policy, abort propagation and domain assertions.
- Condition: [X24F.2](conditions.md). The success scenario above is part of this production-boundary proof.
- Preserve: existing function/filter signatures, EX1 metadata defaults, business outcomes, bounded observers, no implicit duplicate execution, no-reuse joins and browser/server separation.
- Exclude: future editor/artifact/durable implementation, global packet lookup, arbitrary code execution, automatic production replay, guarantees about unrecorded node reasoning or external rollback.
- Verification/red: Focused production tests red→green; npm run check/coverage and owning installed/browser tests per execution.md.
- Complete when: exact assertion/test pointers, candidate scope, command exits and applicable per-file ≥95% coverage plus condition proof are recorded. Docs-only evidence is not runtime green.
- Stop: missing evidence is presented as complete; recorder changes business retry/outcome; comparison lacks equivalent fixtures; required behavior needs an unaccepted API or out-of-scope module. Return the smallest amendment to planning.

### S24F.C — Composed adversarial acceptance

- Allowed: focused owning integration/packed/browser tests and relevant docs within the scope above.
- Prerequisite: S24F.B integrated implementation.
- Obligation: Add one independent check and diagnose a seeded wrong-output/missing-output defect from source plus inspector; record actual participant provenance and limitations. If no independent developer participates, usability evidence stays unverified, never fabricated or replaced by agent timing.
- Condition: [X24F.3](conditions.md). Use the exact ledger setup/action/assertion and forbidden effects.
- Preserve: existing function/filter signatures, EX1 metadata defaults, business outcomes, bounded observers, no implicit duplicate execution, no-reuse joins and browser/server separation.
- Exclude: future editor/artifact/durable implementation, global packet lookup, arbitrary code execution, automatic production replay, guarantees about unrecorded node reasoning or external rollback.
- Verification/red: Real installed/runtime/browser assertions; actual effect counters and controlled failures; never only helper mocks.
- Complete when: exact assertion/test pointers, candidate scope, command exits and applicable per-file ≥95% coverage plus condition proof are recorded. Docs-only evidence is not runtime green.
- Stop: missing evidence is presented as complete; recorder changes business retry/outcome; comparison lacks equivalent fixtures; required behavior needs an unaccepted API or out-of-scope module. Return the smallest amendment to planning.

## Handoff

Follow execution.md for existing commands and current S19 baseline applicability. Extend existing public runtime/testing/inspector paths; a new competing executor is forbidden. New package commands are not assumed. Keep modules cohesive and normally around200 lines, with reasoned exceptions. Record source/revision/fixture provenance and evidence gaps. Review the following product milestone before editor execution; disappointing results trigger a roadmap amendment, not falsified success.
