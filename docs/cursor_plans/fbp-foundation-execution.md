# FBP execution index

Updated2026-10-29. Branch codex/fbp-00-identity-contract, based on origin/master9cb666d.

| Slice | Authorized scope | Execution result | Review / merge | Receipt |
| --- | --- | --- | --- | --- |
| S00 | Design tasks A–C, branch/commit/push/PR submission | Concrete IC1-r1 proposal and downstream amendments complete | [PR #4](https://github.com/SilverFox70/node-eventDispatcher/pull/4) open for review; human acceptance pending; no merge | [S00 journal](fbp-slices/S00-execution.md) |
| S01–S19 | Not requested | Not started | No merge; S04 onward additionally gated on IC1 acceptance | [Slice index](fbp-slices/INDEX.md) |

[IC1-r1](fbp-identity-contract.md) is a review proposal, not already accepted API or implemented source. [Manifest](fbp-slices/manifest.json) is the machine-readable order/status; the master C00–C65 ledger owns behavioral conditions. This execution index links actual evidence, not a duplicate condition matrix.

Publication preparation includes prerequisite commit6ad3760 containing the previously local slice/guidance resources. S00 contract changes are kept in the next commit so reviewers can separate setup from the proposal. Application source, package/lock and runtime remain unchanged. Local .DS_Store/feedback are outside publication scope.

## S01 — tooling implementation

User authorized S01 on2026-10-29 after S00 PR4 merged at4f350668083fe02c10ce53492d409e7c5c4adf8b. See [S01 receipt](fbp-slices/S01-execution.md) for baseline, C00/C31 proofs and verification. Latest-LTS/strict-TypeScript dual-build tooling delivered for review; no dispatcher or graph runtime implementation, no S01 merge claimed.

## S02 — independent synchronous dispatchers

User authorized S02 on2026-10-29 after S01 merged. [S02 receipt](fbp-slices/S02-execution.md) records behavioral red, C01–C05 implementation/proofs, consumer compatibility, verification and publication. No S02 merge or S03 implementation is inferred.

## S03 — event relationship metadata

User authorized S03 after S02 merged. [S03 receipt](fbp-slices/S03-execution.md) records C51 topology proof, inherited dispatcher/consumer verification and review submission. S04 implementation and identity readiness are separate prerequisites, not inferred from this feature.

## S04 — identified packets and bounded transport

User authorized S04 after S03 merged, then requested a project-purpose/roadmap README rewrite. [S04 receipt](fbp-slices/S04-execution.md) records identity readiness, C06/C07/C11/C48/C55/C56 proofs, quality gates and publication. No S05 implementation or S04 merge is inferred.

## S05 — typed contracts/components/catalog

User authorized S05 after S04 merged and requested backend evaluation to be reflected in displays. [S05 receipt](fbp-slices/S05-execution.md) records contract/port/catalog proofs, safe issue handoff and verification/publication. No S06 implementation, graph runtime or UI delivery is inferred.

## S06 — shared graph validation and compilation

User authorized S06 after S05 merged. [S06 receipt](fbp-slices/S06-execution.md) records immutable compilation, client/server wiring parity, capacity/cardinality/identity/cycle proofs and publication. S07 construction and S08 execution remain separate slices.

## S07 — typed graph construction

User authorized S07 after S06 merged. [S07 receipt](fbp-slices/S07-execution.md) records C32 builder typing, runtime handle ownership, shared compiler integration and publication. Actual streaming execution remains S08.

## S08 — streaming runtime

User authorized S08 after S07 merged. [S08 receipt](fbp-slices/S08-execution.md) records adoption of bounded per-run ledger settings, backend verdict attribution, real graph execution, baseline cancellation and proof/publication. S09 retains deadlines and expanded lifecycle/resource verification.

## S09 — deadlines and lifecycle verification

User authorized S09 after S08 merged. [S09 receipt](fbp-slices/S09-execution.md) records deadline scheduling, first-terminal cleanup, adversarial lifecycle/diagnostic proof and publication. S10 remains separate and requires the actual S09 merge.

## S09A — scoped operations and bounded opt-in retries

User inserted node/function deadline work, accepted active-operation timing and0-default/configurable1–5 retries, then requested execution. [S09A receipt](fbp-slices/S09A-execution.md) records NT1-r2, insertion-order migration, runtime policy/proofs and publication. S09B remains the next separate function-adapter branch, then original S10.
