# S07 execution receipt

Scope: user authorized S07.A–C with “proceed”,2026-10-30. Branch codex/fbp-07-typed-graph-builder starts from actual master/S06 merge de3059c0e1dbfe7bb1730a5f056d21293222f92c (PR13). S00 is merged; S04/S05 identity/contracts and S06 GraphSpec/compiler are delivered. No packet ledger, run or join decisions are introduced by this construction-only slice. Historical blanket identity-pending language is superseded for this bounded scope. S08 is not authorized here.

## Implementation and boundaries

createGraph returns add/connect/exposeInput/exposeOutput/toSpec. Private per-builder handle ownership, immutable handles with literal port types, descriptor-safe component admission, safe names/own ports, capacity guards and detached frozen GraphSpec snapshots. Invariant phantom function fields preserve port maps; compatible destination keys are selected individually so a destination union cannot hide an incompatible member. NoInfer fixes source payload/key ownership. Same representation and conservative contract identity compatibility remain the S06 compiler's decision.

Builder-local refusal codes: INVALID_ARGUMENT for invalid names/definitions/foreign or forged handles; DUPLICATE_ID for node or same-side boundary collisions; UNKNOWN_PORT for absent/wrong-direction ports; INVALID_CAPACITY for invalid explicit capacity. All guards precede graph mutation. Compiler retains sole ownership of completeness/cardinality/contract/cycle/size validation. No runtime, source discovery, schema-subtyping solver, global registry or public browser builder export. Feature docs and necessary packed/declaration consumer edits stay within the shared export-update boundary.

## Conditions, red evidence and handoff

C32 contribution: test/types/builder.ts covers compatible numeric and number→JSON connections, unknown source/destination names, wrong-direction exposures, string→number mismatch, multi-port/union inference and forged handles against generated declarations. Existing S05 port and future S13 function-return proofs remain their owners. test/builder.test.js::builder emits authoritative graph spec asserts exact JSON and real compileGraph success; foreign handle rejected before graph mutation asserts both connection ends and exposures refuse same-ID foreign and forged handles without modifying the spec. Compiler-authority test asserts exact CONTRACT_MISMATCH for different IDs with the same numeric shape, cycle refusal and cardinality ownership. Prototype names and capacity256 compile successfully.

Initial scaffold/new feature assertions passed after implementation; no missing-module result or invented test-first history claimed. Two genuine additional regression fixtures were established red before correction:

- JavaScript object port coerced through Object.hasOwn: intended UNKNOWN_PORT refusal assertion failed, command exit1 at /tmp/s07-coercion-red.log. Builder now checks string names before key lookup and primitive component ID/version before interpolation; hooks remain uncalled.
- Destination port union previously hid possible string→number mismatch: expected-error fixture was unexpectedly accepted, tsc exit2 with TS2578 at /tmp/s07-union-red.log. CompatibleInputs now selects each acceptable key independently; both uncertain source/destination fixtures pass their expected-error assertions.

Removing only expected-error directives from the final generated-declaration fixture produced named TS2345 wrong-port/payload errors, tsc exit2; log /tmp/fbp-s07-evidence/types-red.log. Fixture restored byte-for-byte in finally; typecheck green log retained alongside. Runtime foreign-handle and source/destination typing are separate guarantees.

Final checks/coverage/publication pending. Existing S01 baseline remains applicable to historical source characterization; runtime/config/lock unchanged. No source/dependency/global machine changes outside scope; .DS_Store and .feedback-log/ preserved.

## Final verification and acceptance

From the repository root, using command-local PATH=/tmp/node-v26.13.0-darwin-arm64/bin:$PATH (Node26.13.0/npm11.20.0):

- npm run check → exit0, including dual build, strict source/generated-declaration type checks and lint. Local log /tmp/fbp-s07-evidence/check.log. Generated declarations contain the exact port/payload constraints without any widening.
- npm_config_cache=/tmp/fbp-npm-cache npm run coverage → exit0:72 tests,0 failures/skips; all delivered production files100% statements/lines/branches, including src/builder.ts. Localhost permissions supplied for existing HTTP fixtures. Log and coverage-final.json retained in /tmp/fbp-s07-evidence/. No threshold/exclusion changes.
- node --test test/builder.test.js → exit0 with7 tests. Focused rerun adds explicit assertions that later connection edits leave previous edge snapshots unchanged; production/coverage denominator unchanged. npm run lint refreshed after that test-only assertion edit, exit0. Logs focused.log and lint-final.log retained alongside.
- Documented graph-builder.md example ran successfully: exact two-node JSON, capacity2 edge and Compiled: true; demo.log retained. Packed consumers construct/compile this slice's builder output in both ESM/CJS. Generated declarations are consumed through the installed package and both module entry fixtures.
- Guidance checker passed67 Markdown files/386 local links/20 slices/66 condition owners (link/order proof only); git diff --check passed.

Toolchain/build/type/lint/coverage config and dependencies unchanged. Lock SHA256 bf9c99a9567367299e8e5f4afb613fe457a513ad43d1513594af781f2f862bbd. Existing S01 baseline applicability retained. No Next/browser/provider/runtime execution or hosted CI claimed. Source/tests are cohesive: builder.ts78 lines, builder.test.js100 lines and type fixture35 lines. Private state/guard helpers stay together in one short builder module; S06 name validation and S05 descriptor/registry/metadata utilities are reused rather than duplicated.

Implementation complete; C32 builder contribution and runtime ownership/compiler integration verified; quality/coverage gates passed. Publication follows. No S07 merge claimed; S08 waits for its actual merge and independent runtime readiness. Untracked user artifacts remain untouched.

Publication: implementation commit0cd3d07 pushed on codex/fbp-07-typed-graph-builder; [PR #14](https://github.com/SilverFox70/node-eventDispatcher/pull/14) created against master. Final receipt/index/manifest pushed before marking ready for review. No merge claimed. These documentation-only publication updates leave source/config verification applicable.
