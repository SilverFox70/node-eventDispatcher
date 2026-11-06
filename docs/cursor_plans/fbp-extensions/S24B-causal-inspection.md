# S24B — Explain an output or a missing output using retained run-scoped evidence.

Plan EXT1-r2. Status **approved for execution**. The user requested S24B after the S24A merge. See [execution receipt](S24B-execution.md).
Branch `codex/fbp-24b-causal-inspection`. Order is authoritative in [manifest](manifest.json) and [index](INDEX.md).
Prerequisites: predecessor merged/receipt verified, accepted D1/D5 interfaces and existing diagnostic bounds. No editor, GraphSpec v2 or artifact/SQL storage prerequisite.
Contract: [explainability](explainability.md), [shared rules](shared-contract.md), [verification/handoff](execution.md).

## Feature obligation

Build bounded run-scoped causal queries over diagnostic transfers, operations and decisions, plus result/input selection in the existing inspector. Traverse full retained ancestry, detect gaps, and attribute version/timing/wait reasons.

Success scenario: Fork input A through two transforms then join: select final result and show both immediate parents, original A, actual node/attempt path and durations; select filtered input B and show its recorded drop reason rather than infer absence means failure.

## Tasks

### S24B.A — Contract fixtures

- Allowed: focused test/type fixtures and planned schema examples only; no production changes.
- Prerequisite: accepted D5/API contract and source/caller preflight.
- Obligation: Query a result ID in run A with a known retained parent; accept bounded ancestry. Unknown result, cyclic corrupted evidence or run B reference returns explicit issue/gap, never cross-run lookup or a guessed root.
- Condition: [X24B.1](conditions.md). Use the exact ledger setup/action/assertion and forbidden effects.
- Preserve: existing function/filter signatures, EX1 metadata defaults, business outcomes, bounded observers, no implicit duplicate execution, no-reuse joins and browser/server separation.
- Exclude: future editor/artifact/durable implementation, global packet lookup, arbitrary code execution, automatic production replay, guarantees about unrecorded node reasoning or external rollback.
- Verification/red: Contract and real-boundary fixtures; characterization may pass; meaningful red must reach intended behavior, not missing exports.
- Complete when: exact assertion/test pointers, candidate scope, command exits and applicable per-file ≥95% coverage plus condition proof are recorded. Docs-only evidence is not runtime green.
- Stop: missing evidence is presented as complete; recorder changes business retry/outcome; comparison lacks equivalent fixtures; required behavior needs an unaccepted API or out-of-scope module. Return the smallest amendment to planning.

### S24B.B — Implement the story

- Allowed: src/diagnostics/causal/**; src/model/diagnostics/**; src/index.ts and src/model/index.ts (public export wiring); fixtures/next-consumer/app/**; fixtures/next-consumer/lib/**; focused causal/browser tests.
- Prerequisite: S24B.A fixtures and meaningful red where practical.
- Obligation: Build bounded run-scoped causal queries over diagnostic transfers, operations and decisions, plus result/input selection in the existing inspector. Traverse full retained ancestry, detect gaps, and attribute version/timing/wait reasons.
- Condition: [X24B.2](conditions.md). The success scenario above is part of this production-boundary proof.
- Preserve: existing function/filter signatures, EX1 metadata defaults, business outcomes, bounded observers, no implicit duplicate execution, no-reuse joins and browser/server separation.
- Exclude: future editor/artifact/durable implementation, global packet lookup, arbitrary code execution, automatic production replay, guarantees about unrecorded node reasoning or external rollback.
- Verification/red: Focused production tests red→green; npm run check/coverage and owning installed/browser tests per execution.md.
- Complete when: exact assertion/test pointers, candidate scope, command exits and applicable per-file ≥95% coverage plus condition proof are recorded. Docs-only evidence is not runtime green.
- Stop: missing evidence is presented as complete; recorder changes business retry/outcome; comparison lacks equivalent fixtures; required behavior needs an unaccepted API or out-of-scope module. Return the smallest amendment to planning.

### S24B.C — Composed adversarial acceptance

- Allowed: focused owning integration/packed/browser tests and relevant docs within the scope above.
- Prerequisite: S24B.B integrated implementation.
- Obligation: Evict a parent, disable payload capture, or disconnect live transport: return explicit incomplete evidence/uncaptured fields; do not invent a cause, query another run or claim missing result was filtered when evidence is absent.
- Condition: [X24B.3](conditions.md). Use the exact ledger setup/action/assertion and forbidden effects.
- Preserve: existing function/filter signatures, EX1 metadata defaults, business outcomes, bounded observers, no implicit duplicate execution, no-reuse joins and browser/server separation.
- Exclude: future editor/artifact/durable implementation, global packet lookup, arbitrary code execution, automatic production replay, guarantees about unrecorded node reasoning or external rollback.
- Verification/red: Real installed/runtime/browser assertions; actual effect counters and controlled failures; never only helper mocks.
- Complete when: exact assertion/test pointers, candidate scope, command exits and applicable per-file ≥95% coverage plus condition proof are recorded. Docs-only evidence is not runtime green.
- Stop: missing evidence is presented as complete; recorder changes business retry/outcome; comparison lacks equivalent fixtures; required behavior needs an unaccepted API or out-of-scope module. Return the smallest amendment to planning.

## Handoff

Follow execution.md for existing commands and current S19 baseline applicability. Extend existing public runtime/testing/inspector paths; a new competing executor is forbidden. New package commands are not assumed. Keep modules cohesive and normally around200 lines, with reasoned exceptions. Record source/revision/fixture provenance and evidence gaps. Review the following product milestone before editor execution; disappointing results trigger a roadmap amendment, not falsified success.
