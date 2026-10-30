# S06 execution receipt

Scope: S06.A–C authorized by user “proceed”,2026-10-30. Branch codex/fbp-06-graph-compiler starts at master b2a60e6 (roadmap PR12 merged), containing S05 merge134a9b66664c5591bc62c870c0f1111aae210dd2. S00 merge4f350668 and accepted S04/S05 identity/contract interfaces release this metadata-only feature; old blanket pending text in historical proposals does not require packet/runtime decisions here. No S07/S08 execution or merge authorized by this slice.

## Scope and implementation

Public GraphSpec/Endpoint, browser-safe validateGraph, server compileGraph and opaque CompiledGraph. Shape checks, exact registry/version/port resolution, contract/representation compatibility, cardinality, capacities/limits and acyclic topology precede factories. Compiler retains immutable source snapshots and definition identity in a private WeakMap. Internal getGraphDefinition admits only actual local handles; not a root export. Caller changes cannot replace frozen graph/factory references. Absent edge capacity remains absent in GraphSpec and means16 to the later runtime; boundaries remain16.

Source responsibilities: model/graph.ts owns validation/topology; model/graph/structure.ts owns exact shape checks; graph.ts owns executable registry authority, snapshots and opaque handle admission. No scheduler, second validator, runtime process calls, builder, editor, payload-schema browser evaluator, packet ledger or persistence. API declaration and packed import fixture changes are necessary delivered-export consumer updates within the slice's shared boundary. Feature docs link the runnable compile-only example.

## Conditions

- C08: graph.test.js rejection table asserts exact code presence, client/server issue equality and zero factories. Dedicated cases assert exact paths/order for mismatch, cycle, graph limit and malformed shape; invalid node/component/port/name/capacity, extra/missing fields, cardinality and cycles covered.
- C09: compile snapshots definitions asserts original node/endpoint mutation and registry replacement cannot change the compiled spec or captured component. Nested objects/handle frozen; forged handle refused.
- C10: own identity and contracts asserts __proto__ node/port, numeric-to-JSON wildcard success and numeric-to-text mismatch. Own safe maps/Map avoid prototype lookup.
- C49 contribution: two-node cycle with otherwise valid endpoints/contracts refuses CYCLE before factory. DAG with shared paths succeeds. Process scheduling proof remains S08.
- C46/C50 contributions: same validateGraph used server/client, catalog serialization and unsupported representation/version refusal; executable registry derived from actual branded definitions, descriptor-only registry rejected, contract conflict retained. Next/browser integration and author recipe remain their owners.
- Boundaries:1000-node and4096-boundary-channel graphs succeed;1001/4097 refuse. Exposed channels count toward total. Generated declarations reject forged handles and mutation of readonly GraphSpec in both module modes. Packed CJS/ESM consumers compile real registered components and use /model validation.

## Proof and verification status

No missing-module result counted as semantic red. Initial implementation preceded the new assertions; recorded controlled mutation proof instead of claiming test-first history. A disposable copy of the built distribution bypassed the compiler's validateGraph result; the otherwise valid cyclic fixture failed the assertion “compiler must reject cyclic wiring”, exit1. Harness verified that exact failure; candidate source/build was untouched. Local evidence /tmp/s06-red.log.

First full coverage run inside the sandbox failed existing localhost HTTP tests due bind permissions; this was a verification-environment failure, not accepted behavior. Authorized rerun with localhost permissions passed60 tests and coverage thresholds at the then-current candidate. Additional boundary tests and comparator simplification invalidate that earlier receipt for final acceptance; final results follow below. Node26.13.0/npm11.20.0 pins, lock/config and coverage denominator unchanged. Historical S01 baseline remains applicable to old-source characterization; no recapture needed. No Next/browser/provider checks claimed.

All new source/test files remain under200 lines. Shape helper is a cohesive separate boundary; no artificial one-line wrappers. Definition/factory snapshot ownership is explicit; callbacks/services themselves are not cloned. Final gates and publication pending.

Final review found and reproduced a registry snapshot regression: S05 accepts nonenumerable data-property entries, but object spread dropped them after successful compilation. The focused “registry snapshot preserves nonenumerable definition entries” fixture failed with actual undefined versus the expected captured component, command exit1 (/tmp/s06-registry-red.log). Compiler now snapshots through the existing descriptor-safe readRecord before deriving its authoritative catalog, preserving every accepted entry and rejecting accessors/proxies at the same boundary. No S05 source change needed. Final gates were refreshed after this correction.

## Final gates and handoff

At the final source candidate, from the repository root with command-local PATH=/tmp/node-v26.13.0-darwin-arm64/bin:$PATH:

- npm run check → exit0: dual build, strict source/declaration consumers and lint. Final log /tmp/fbp-s06-evidence/s06-check-final.log.
- npm_config_cache=/tmp/fbp-npm-cache npm run coverage → exit0 with65 tests,0 failures/skips; all delivered production files100% statements/lines/branches, including graph.ts, model/graph.ts and model/graph/structure.ts. Localhost fixture permissions supplied explicitly; no thresholds/exclusions changed. Full log and mapped coverage-final.json retained in /tmp/fbp-s06-evidence/.
- node --test test/graph.test.js test/model.test.js → exit0 with16 tests before the final additional registry regression fixture; final full suite above includes that fixture. Mutation red exit1 and actual regression red exit1 retained alongside green evidence.
- Documented compile-only example ran with output true, then exact UNKNOWN_PORT and PORT_CARDINALITY issues. Guidance checker passed65 Markdown files/381 local links/20 slices/66 condition owners; git diff --check exit0. Guidance checks establish links/order only.

Toolchain/config/lock unchanged; lock SHA256 bf9c99a9567367299e8e5f4afb613fe457a513ad43d1513594af781f2f862bbd. Existing isolated package tests prove both distribution formats and /model graph validation from the installed tarball; both generated declaration consumers pass. No source changes after these final gates. Untracked .DS_Store and .feedback-log/ remain untouched.

Implementation complete; S06 behavioral proof verified; quality and per-file coverage gates passed. Runtime scheduling, durable state, actual browser/Next build and hosted CI are not claimed. S07 must start from the real S06 merge, not this branch. Publication follows; green local evidence does not claim a merge.
