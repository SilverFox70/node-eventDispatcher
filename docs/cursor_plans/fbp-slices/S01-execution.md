# S01 execution receipt

User authorization: proceed with S01 slice,2026-10-29. Tasks S01.A–C only. Branch codex/fbp-01-lts-typescript-build; base4f350668083fe02c10ce53492d409e7c5c4adf8b, verified S00 PR4 merge. Unrelated .DS_Store and .feedback-log/ preserved.

## Delivered outcome

Project pins Node26.13.0/npm11.20.0, strict TS dual ESM/CJS/declaration/source-map builds, conditional root/model/testing entries, reproducible lock, offline tests, lint/typecheck/check/coverage gates. Empty entries intentionally export no future graph APIs. Legacy CommonJS source and dependencies remain. No shim is delivered until S02; its owner must extend the coverage scan to that delivered shim. No CI workflow is introduced by this allowlist; pins/scripts are ready for CI consumption, not proof of a hosted run.

Versions: TypeScript6.0.3, @types/node26.6.6, ESLint10.13.0/@eslint/js10.0.1/typescript-eslint8.72.1, c8 12.0.0, Zod4.6.7, exact pins in lock. TypeScript7.0.2 was rejected by npm peer resolution; selected6.0.3 matches lint support (<6.1). No force/legacy-peer bypass. Final lock SHA256:d30f5dece45dc27f1f34e88f0186870713899dec585c674ae55451f4e6234ea0.

## Proof and conditions

- C00: runtime pins test checks actual Node/npm, both pin files, engines, packageManager and lock engines. npm ci with normal lifecycle policy succeeds. Packed tarball extracted into isolated node_modules consumer; both ESM/CJS root/model/testing load. Generated declarations checked in .mts and .cts consumers, including expected rejection of unavailable startNetwork. No source aliases or future implementations.
- C31: disposable copied source/build config plus never-imported unexecuted.ts; c8 maps to source-only paths, includes unused module at0%; actual threshold CLI exits1. Fixture cleans in finally. Source extension omission initially failed this assertion, then corrected; no denominator exclusion workaround.
- Deliberate wrong .node-version produced named runtime-pin failure, exit1; restored byte-for-byte. Removing @ts-expect-error produced TS2339 for unavailable startNetwork, exit2; restored byte-for-byte.
- Per-file coverage covers the three delivered empty TS entry modules; final report has exactly those source paths, no generated duplicates.100% scaffolding coverage is not FBP functionality proof. Runtime algorithms remain future work.
- scripts/coverage-thresholds.mjs additionally exercised for empty report, fully covered data and missed branch. Build/check scripts are tooling, not production-framework denominator.

## Verification and retained evidence

Commands use PATH=/tmp/node-v26.13.0-darwin-arm64/bin:$PATH in repository root. Baseline details: [record](../../agent-baselines/records/fbp-pre-modernization-r2.md). Local transient logs: /tmp/fbp-s01-evidence/check.log, test.log, coverage.log, wrong-pin.log, invalid-type.log. Coverage JSON/HTML under ignored coverage/. Installation reports18 inherited vulnerabilities; no new audit count, no unsolicited dependency remediation. Tests are offline; package packing uses private temporary npm cache and --offline. Global runtime untouched.

Final gates and publication recorded below after verification. No Next/browser/provider test applies. S02 must preserve these tests and can only start after this branch merges.

## Readability review

Build, threshold policy and test fixtures have clear separate owners; handwritten files are below200 lines. No size exception, wrapper forest or miscellaneous utility bucket. Source entries are deliberate packaging scaffolds. No dispatcher behavior change or public future API added.

## Final verification

Normal npm ci, npm run check, npm test and npm run coverage each exit0 on the final source/config candidate;3 tests pass, none skipped. A separate clean copy at /tmp/fbp-s01-clean also passed npm ci --offline --cache /tmp/fbp-npm-cache, check and test. The offline install's zero-vulnerability summary is not fresh security evidence; the online install reports the inherited18. Guidance link/order check and git diff --check pass. Only documentation/formatting changed after these outputs; final lint rechecked before commit. Publication follows on this branch; merge remains pending.
