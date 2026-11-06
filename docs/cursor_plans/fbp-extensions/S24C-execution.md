# S24C execution receipt

2026-11-05. User requested S24C. PR38 merged into master at 17633bca95ccdbe9be0ff037d6e856acb6ada4e9, confirmed on GitHub and fetched. Feature branch codex/fbp-24c-run-to-test.

## EV1 fixture contract

One fixture represents one job in one completed graph run. The host supplies the selected run evidence, compiled graph, input/output capture references and reviewed replacement values. Captured records must cover every admitted input and exposed output for the job. Missing, dropped or truncated required evidence refuses. Generated packet IDs are fresh, with one stable case job and the reviewed optional join keys.

The fixture contains only reviewed packet values, logical decision expectations, bounded dependency scripts and source run/sequence provenance. It requires a verified execution identity and a host review callback that validates the complete sanitized document against its field allowlist and confirms the review ID. The host supplies its trusted graph builder and an exact dependency role list at execution. Script values/errors are consumed in order and unused entries fail the test. The fixture cannot name files, modules or executable callbacks.

The existing runGraph helper owns execution. A narrow opt-in decision snapshot option supplies decision evidence for fixture assertions without changing default TestResult shape. The generator writes a new case-specific test file with exclusive creation, containing passive JSON and a fixed reference to the caller-owned fixture-bindings.mjs. No automatic code import happens during fixture validation or generation. The caller owns trusted code in the local binding module and its use of injected service roles.

### EV1-r4 interface details

- `validateRegressionFixture` accepts a passive, exact version 1 fixture, capped at 256 KiB, with up to 64 inputs and 64 expected output packets, 32 dependency roles with 64 ordered calls each and up to 64 declared decision assertions. Input/output maps include every exposed port. Order within each port is preserved. Dependency results are JSON and error steps are safe codes.
- `prepareRegressionFixture(graph,evidence,jobId,candidate,{roles,approve})` checks a completed same-run snapshot with verified identity and no evidence loss, exact capture references, current port contracts, declared decision expectations and an exact host role match. Differences between retained payloads and reviewed payloads must be covered by declared JSON Pointer substitutions. The host callback applies the field allowlist to the immutable candidate and confirms the review ID. Common credential shapes and unresolved placeholders refuse independently.
- `writeRegressionTest(directory,fixture)` accepts an object prepared in this module instance. It creates a single exclusive `case-id.test.mjs` with only reviewed JSON and a fixed local module name. Fixture data cannot select a directory, module or executable command. The generated test checks Node network permission before importing the local binding module.
- `runRegressionFixture(value,bindings)` revalidates a passive fixture and review, matches the host identity and roles, and checks output values, per-port order/multiplicity and exact declared decisions. Runtime IDs are freshly generated and do not enter the assertions. Trusted caller code supplies a compiled graph and receives only scripted services. Node's network permission applies when running the generated scaffold. Direct callers own their process permissions.
- The only change outside the original implementation modules is the explicitly recorded opt-in `runGraph` decision observation and the public testing barrel. The existing Next demo uses unverified build identity. The export workflow is programmatic through the public testing API.

### Condition proof

- X24C.1: strict fixture schema, unresolved pointers/placeholders, credential shapes, port contract checks, immutable review and independent approved dependency roles in `test/regression-fixture.test.js`.
- X24C.2: an actual captured input/output containing a private placeholder name is reviewed and replaced, written as an ordinary test, and run from an isolated installed tarball with Node network permission disabled. Changing a result deliberately makes the generated assertion fail. Changing the expected decision fails through the existing harness. The first successful packed execution verified the same runtime seam before the permission guard was added, and the final proof covers the fail-closed guard.
- X24C.3: missing/truncated captures and wrong provenance refuse; non-approved roles stop before the graph build callback; no module is needed to refuse a test run without the permission restriction; existing handwritten content survives exclusive file creation. Ordered script tests cover a consumed error/result, unconsumed step, exhausted script and rejected runtime decision.

### Verification and handoff

- Pinned Node 26.13.0 / npm 11.20.0 from command-local paths. Core lock SHA256 `7a72e97113003c27a10944f869b802f0d43474198662b7d0d2cdeffac49dac01`. Coverage configuration SHA256 `a51b73a30558dee8669138729a50ea64d2e5591f0b8c48a20f449b11a124c787`.
- `npm run coverage` exited 0 with 294/294 tests and every configured file over its 95% thresholds. This run used the pre-final substitution comparator. After the comparator began checking own properties on both sides, `npm run check` and the five focused fixture tests, including a fresh packed installation, exited 0 on the final source. The final comparator reports 100% statements, lines and branches. All other production sources and coverage settings are identical to the full gate. Logs `/tmp/fbp-s24c-coverage.log`, `/tmp/fbp-s24c-final-check.log`, and `/tmp/fbp-s24c-final-fixtures.log`.
- Installed replay passed with Node's network permission disabled and failed with the intentionally changed result. The generated test also refused an unrestricted process before loading the fixture binding file. No consumer writes reach the checkout or production services.
- Guidance integrity and whitespace checks passed. No Next UI/server code changed. The owned downstream boundary is the generated test in a clean packed consumer. The existing production Next receipt remains scoped to S24B.
- Readability review separates passive schema, capture authorization, substitution comparison, scaffold writing, runtime contract checks and fixture replay. No new dependencies, manifest entry points, CI commands or competing executor.
- Implementation complete and verified for X24C.1–3. Publication open for review. S24D requires the actual S24C merge.

Publication receipt: implementation commit `0021737d80c5d7860933b1f395059de45bbbb81d` pushed. GitHub confirmed [PR39](https://github.com/SilverFox70/node-eventDispatcher/pull/39) open against master. The follow-up records documentation only. User-local .DS_Store and .feedback-log remain uncommitted.

Merge receipt: GitHub confirmed PR39 merged. Fetched origin/master contains `c46582a0059ca1f4ff2d5b6ae190d79761e3b332`, the S24D branch base.
