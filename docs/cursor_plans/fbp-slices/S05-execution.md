# S05 execution receipt

Authority: user requested S05 execution on2026-10-30, then asked for displays to echo actual backend/runtime evaluation. Branch codex/fbp-05-port-contracts; base bf147e54e0c2065feea3aa5b7aea5509d235336b, verified S04 PR10 MERGED. Packet identity/admission rules were adopted in S04; S05 consumes that actual implementation, not old key-only drafts. Later execution-ledger settings remain outside this slice. .DS_Store and .feedback-log/ preserved.

## Delivered story

A developer declares schema-inferred invariant contracts and reusable components with exact named ports, then exports immutable catalog metadata. contract/jsonContract enforce JSON-profile validation; defineComponent captures port/factory identity and authored metadata/examples without calling create; describeRegistry enforces componentId@version and local contract meanings. /model provides pure metadata types, canonical compatibility and catalog validation; it contains no Zod/application validators or Node imports.

Source owners: contracts.ts opaque contract branding/validation and internal compatibility/issues; contracts/schema.ts documented core allowlist; contracts/formats.ts native format-option/pattern parity; component.ts typed context/definition/registry metadata; model/contracts.ts pure canonical/schema/metadata helpers; model/catalog.ts safe catalog structure/identity validation. Public factory types remain constrained to JSON; generic Contract<T>/Packet<T> retain later representation seams. No compiler, typed builder, function helper, process scheduler or runtime send implementation.

## Conditions and proof strength

- C33: same contract ID/different assertions refuses CONTRACT_ID_CONFLICT locally before factory invocation; equivalent independent contracts coexist; internal conservative matcher refuses string-to-number CONTRACT_MISMATCH, JSON destination accepts JSON contract but reverse narrowing fails. Unsupported schemas/checks/coercion/defaults/transforms/custom or async refinements refuse.
- C32 contribution: generated declarations reject unknown send/input ports, wrong numeric payload, widened invariant Contract union and non-JSON schemas; component.in/out retain literal names and create returns a typed process. Builder/function cases remain S07/S13; final owner unchanged.
- C46 contribution: real authored examples validated and copied before export, caller mutation cannot change metadata, catalog JSON contains no validators/factories/services, structure/representation/identity error tables run in /model. Browser payload/graph integration remains S17; /model does not evaluate application payloads.
- C50 contribution: versioned contract/representation/component identities, declared effects/dependency names and safe descriptors are exposed without executable capability grants. Compile/recipe refusal proofs remain S06/S13/S16.
- User display direction: internal getContractIssues returns frozen code/path data over the same authoritative validator as validate; no rejected inputs or raw Zod messages. Model ContractIssue type is safe data. Runtime/inspection/Next slices now record producer/consumer/UI requirements; report transport/lifecycle and actual display are not delivered in S05.

## Failure evidence and refinements

A controlled source mutation bypassed local identity enforcement; the valid one-contract-meaning test failed with a missing expected CONTRACT_ID_CONFLICT, exit1. Source restored byte-for-byte and rebuilt. /tmp/fbp-s05-evidence/identity-red.log retains evidence; this was explicit mutation verification, not a claim of test-first history. Initial compiler/setup errors were not counted as semantic red.

Removed only the wrong-port/payload expect-error directives: tsc exited2 with named TS2345 failures for missing port and string-to-number payload. Restored byte-for-byte; standalone typecheck passed. Evidence: /tmp/fbp-s05-evidence/types-red.log and typecheck.log. Normal fixtures also test invariance, optional object fields and typed factory return/port maps. No any widening or source aliases.

Only documented Zod core def/type/check traversal, constructors and safeParse/export APIs are used. Canonicalization retains assertions even for property names description/examples, sorts object keys and preserves array order. Native check gates/custom patterns are refused rather than guessed; matching module format/Zod installation is required. RFC3339-compatible datetime options only; local/minute-only options refuse. Schema author code may materialize shape getters; recursive/lazy schemas refuse before any process factory. Library/schema methods must remain native and immutable; failure tests deliberately inject parser failures to verify propagation, not endorse application mutation.

Zod4.6.7 JSON Schema includes a nonenumerable Standard Schema helper; JSON serialization drops it before data freezing, with unrepresentable/cyclic conversion configured to throw. Global Zod metadata is not exported; descriptions/examples are explicit component metadata. Metadata cloning has a separate256-level depth guard and does not charge surrounding metadata against a valid1MiB example's payload budget. A boundary fixture proves that example remains exportable.

Packed consumer proof now performs a real offline npm install of the tarball and declared runtime dependencies, using the cache populated by npm ci. Both ESM/CJS author contracts/components and expose catalog metadata; generated declaration fixtures compile. Test command-local npm_config_cache=/tmp/fbp-npm-cache matches this host's earlier installs; default consumer tests query npm's configured cache. No dependency version or lock change (SHA256:bf9c99a9567367299e8e5f4afb613fe457a513ad43d1513594af781f2f862bbd). No global config/lifecycle-script approval added.

## Verification and readability

Final npm run check (build/typecheck/lint) exits0; npm run coverage exits0 with54 tests, none skipped. Per-file statements/lines/branches are100% for delivered source, including all /model code. Coverage JSON retained at /tmp/fbp-s05-evidence/coverage-final.json; detailed command results are in this execution's tool outputs. No threshold changes/exclusions or unreachable-code exemptions. Guide example ran via ESM and exported one component without starting a graph. Hosted browser/Next/provider execution not claimed.

Every new source/test file is under200 lines; contract, schema traversal, format parity, component and browser metadata responsibilities remain cohesive. No second validator/compiler runtime or miscellaneous utility dump. Consumer/type fixture updates and future display handoff notes are bounded necessary amendments to the saved allowlist.

Implementation and S05 proof contributions are complete for review. S06 has not started and requires actual S05 merge and its own contract readiness. Publication receipt follows; green branch is not merge evidence.

Final review correction: metadata snapshot copying preserves nonenumerable data members that S04 admission/contract validation treats as JSON data; a dedicated example-export fixture proves that the exported example still satisfies its real contract. Final check/focused/coverage logs are retained in /tmp/fbp-s05-evidence/. No source changes follow these gates.

Publication: implementation commita9f050c pushed; [PR #11](https://github.com/SilverFox70/node-eventDispatcher/pull/11) created against master. Final receipt pushed before marking ready for review. No merge claimed. Documentation-only updates after the recorded final gates do not invalidate source/config proof.
