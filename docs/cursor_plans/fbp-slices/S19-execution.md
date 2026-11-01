# S19 — foundation adoption acceptance

User authorized S19.A–C on2026-10-31. Branch codex/fbp-19-adoption-acceptance from actual S18B merge8693131dc50222b67ea4da1bea282aa68790728d (PR #30). Initial dirty artifacts .DS_Store/.feedback-log remain untouched. No extension execution, package publication or automatic merge authorized here.

## Candidate and contract readiness

S00–S18B are merged with IC1-r2/NT1/EX1/HTTP1. Original S19 pending-identity and S18-only prerequisite prose is historical; its execution checkpoint records actual readiness and the additional documentation allowlist. C47 owns the integrated acceptance, with C00–C80 and NT01–NT18 reconciled by [delivered proof pointers](S19-condition-evidence.md), not a second behavior specification.

Documentation-only adoption scope: no src/fixture/dependency/config changes. Existing package, public-harness, author-template and production Next suites already exercise the delivered journey; adding an aggregate test/acceptance.test.js would duplicate those boundaries. Behavioral red is N/A for characterization; existing wrong-type/runtime-refusal, server-only, capability and all-files negative controls remain required.

Pinned Node26.13.0/npm11.20.0. Node reports Lithium LTS; official release history confirms26.13.0 is the latest LTS as of2026-10-31: [Node release](https://nodejs.org/en/blog/release/v26.13.0), [release list](https://github.com/nodejs/node/releases). No toolchain upgrade is needed. No global Node/npm/Git/keychain configuration is changed. GitHub polling stays off; Git transport uses command-local noninteractive SSH with keychain lookup disabled.

## Work and evidence

S19.A: predecessor/contract readiness verified; reviewing actual tests against all99 assigned conditions and updating misleading current-status summaries while preserving historical receipts. S19.B/C acceptance commands, artifact identity, limits and publication outcomes follow. Failed/not-run/unavailable gates are recorded separately; no passing/merge inferred from plan prose.

## Developer journey and retained boundaries

The accepted path is an installed event-driven-design package, generated CJS/ESM declarations, contract/defineFunction or defineComponent, createGraph/compileGraph, the production runtime or /testing helpers, createInspectionScope and the /model presentation boundary. Existing installed recipes deliberately break a return type and bypass TypeScript to prove useful type/runtime refusal. Production Next uses its actual vendored tarball rather than checkout aliases. Run npm run demo:next for localhost:54545; home links to explicit live Pokémon work, node dialogs and selectable output stages. Public origin requests are manual opt-in; automatic stress uses owned HTTP only.

Scope limits remain explicit:

- In-memory, single-process, acyclic execution; public packets are immutable JSON. Internal generic channels do not enable rich public values, cycles, distributed workers or persisted execution.
- Duplicate protection is bounded/non-evicting per node/run. Stable job identity does not provide cross-run deduplication, result lookup or crash recovery.
- Abort/deadline scopes revoke owned capabilities and suppress late delivery; they cannot forcibly terminate arbitrary JavaScript or roll back an external side effect. Application I/O must cooperate. Explicit retry/idempotent acknowledgement is an application responsibility, not a provider guarantee.
- GraphSpec/catalog JSON and Mermaid export exist; visual selection/configuration/wiring, saved drafts/locked revisions and generated TypeScript are future work. Browser checks metadata/wiring, not application payload schemas; runtime admission stays authoritative.
- Default inspection snapshots have no payload history. Optional EX1 trace has finite event/payload bounds; dialogs/stage browsing show retained observations, not durable results or proof of business success. Per-node logging policy/adapters remain future work.
- The Next fixture demonstrates explicit owned integrations, not arbitrary application discovery or production authorization/routing. Benchmark/load figures are machine observations, not service SLAs.
- No npm publish, deployment, durable Realberry replacement or extension execution is part of S19. The current package name/version and legacy shim remain unchanged.

Readability review: no executable modules changed; the99-row evidence index is intentionally one navigable table separate from the short receipt and canonical condition definitions. Historical slice receipts remain append-only evidence rather than being rewritten into current-state claims.

Initial install/check/pack pass. Initial full coverage run passes228/229 runtime/package cases but fails the guidance fixture: I began the suite while the condition-evidence file was still being added, so the isolated documentation copy omitted its new link target. Staging the completed documentation tree before rerun fixes candidate discovery; this is a documentation snapshot/setup failure, not a runtime pass. Preserve /tmp/fbp-s19-hyvfja/coverage.log and commands.json; final coverage/guidance and Next gates follow. No test/threshold changes.

## Final local acceptance — S19.A–C complete for review

All commands ran from the repository root with pinned toolchain and npm_config_cache=/tmp/fbp-npm-cache. Retained local evidence: /tmp/fbp-s19-hyvfja; commands.json records each invocation/exit/duration, config-identity.json the exact lock/tool/build/lint/coverage inputs, ancestry.json all23 predecessor ancestry checks. No raw reports, tarball or payloads are committed.

| Gate | Actual outcome / evidence |
| --- | --- |
| npm ci --offline --no-audit --no-fund | exit0; install.log |
| npm run check | exit0; build, generated declaration consumers, types and lint; check.log |
| npm run coverage | Initial docs-copy failure preserved above; final exit0,229 tests/0 failures; coverage-final.log. All delivered library per-file statement/line/branch gates pass; no threshold changes |
| npm run test:next | exit0,32 tests/0 failures/skips; next.log. Production install/build, HTTP/browser/node-dialog/stage/load tests, server-only import refusal, capability guards, all-files0% canary and restored coverage pass |
| npm pack / npm pack --dry-run | both exit0; pack.log/inventory.log,548 files,146911 compressed bytes. Public CJS/ESM/model/testing entries/declarations/maps, source, cookbook/templates and allowed guides present; no test/cache/node_modules/.next/local-feedback artifacts |
| Installed same-artifact adoption | exit0; adoption.cjs/adoption.log runs authored function→public runNode/runGraph→runtime→scope/Mermaid/trace using the actual Next-installed package, no checkout source alias. Result4, three expected handler calls, correct immediate lineage and four payload-free transfer observations |
| Documentation | integrity check passes100 Markdown/717 links/24 slices/99 owners;99 unique condition pointers equal the manifest owner set; git diff --check passes |

npm test and npm run test:package were not redundantly run as separate commands: coverage runs the same test/*.test.js glob, including all four installed package/recipe/example suites. The final candidate tests satisfy those assertions; this is reuse, not a fabricated separate command exit. No new aggregate test was necessary. The merged S18B explicit public API smoke remains applicable to unchanged executable code; S19 adds no public provider traffic.

### Exact artifact identity

Saved tarball, final dry-run inventory and production Next vendor/install manifest have identical SHA512 integrity:

`sha512-4PPs2b6nIJGDUbkBgWee48NH7B/7dEWsd62LI+A6kRAY6x+UC06vGAMe7t9FodBLurGrqc4azKq0r4ZHNHmlww==`

Tarball SHA256: `a289d994b54a19a8e4f1f9e7321c856fa17e6b330013343bf133d0b170f388a3`; SHA1: `191d4a2bc6e028222ebac8959ae62d5b4eb08f1f`. Exact manifests: artifact-identity.json, pack.log and /private/var/folders/s7/ycx3c31d7tl_xw7ykf3p9ym40000gs/T/fbp-next-ASnF2z/evidence/artifact.json. Root/model/testing adoption resolves into that same app/node_modules/event-driven-design/dist tree. README was finalized before packing; later edits only affect documentation outside the archive allowlist. Root source, schemas, lockfiles, configuration and Next fixture are unchanged from the accepted base.

Implementation: complete (adoption documentation and reconciliation). Behavioral proof: verified through existing integrated suites plus same-artifact installed characterization. Quality/coverage: passed as above; documentation changes add no executable coverage denominator. Publication: ready for authorized review; not merged, published to npm or deployed. Hosted CI is not inferred from local results and will not be polled automatically. Extension planning/execution remains a separate next request.

## Publication

Acceptance commit 0e2e3b27a021600ce88931f3f932ea652b874e3b pushed on codex/fbp-19-adoption-acceptance. [PR #31](https://github.com/SilverFox70/node-eventDispatcher/pull/31) created against master and attached to the task; title/body/base/head verified. This follow-up records review metadata only, outside the shipped archive, so the exact tested artifact remains applicable. No merge/npm publish/deployment occurred. Hosted CI is not polled or claimed green; local acceptance is complete and review/merge remain pending.


## Windows CI remediation — user authorized

Run41264903863 on d765826: Linux/macOS/Next pass; Windows coverage227/229, failing author-recipe and package-contracts during isolated npm ci. Both return status=null around66–68 seconds with a60-second child budget. The previous assertion drops subprocess error/signal, so timeout is strongly indicated rather than proven by that old log. Saved /tmp/fbp-s19-windows-ci.log. Current acceptance is not claimed hosted-green.

Bounded S16-owned fixture amendment: install-only budget180000ms; all ordinary process/type/runtime command budgets remain60000ms. No retries, skipped assertions, threshold or shipped-code changes. Factor the existing runner within the same fixture and expose it only to internal tests. Real child timeout/nonzero/launch-failure cases fail meaningful diagnostic assertions before the fix (/tmp/fbp-s19-package-process-red.log); final focused/package/coverage proof follows. Future failures retain actual error code/signal and configured budget instead of only null != 0.

Local remediation verification: targeted process cases3/3 pass (/tmp/fbp-s19-package-process-green.log); final lint exits0 (/tmp/fbp-s19-package-lint.log); full npm run coverage exits0 with232/232 tests and unchanged production coverage gates (/tmp/fbp-s19-windows-fix-coverage.log). npm pack --dry-run integrity exactly matches the original S19/Next artifact (/tmp/fbp-s19-windows-fix-pack.json), so production Next/browser proof remains applicable and is not redundantly rerun. Guidance/diff checks pass. Hosted Windows verification pending after push; no green claim from local results.
