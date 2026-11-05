# S24A execution receipt

2026-11-05 user explicitly requested S24A.A–C. Branch codex/fbp-24a-decision-evidence from actual S24 merge bb0ad50c1392d4730992469b0a959d840f604590, fetched ancestry verified. Preserve .DS_Store/.feedback-log. Existing CI pipeline retained; no CI redesign or S24B execution.

## S24A.A declaration freeze — EV1-r2

Adopt EV1-r1's S24A subset with these exact owning-slice declarations:

- ComponentSpec/FunctionSpec optional decisions array≤32. Each `{code,ruleVersion,outcomes,facts}` uses unique `(code,ruleVersion)`, unique allowed outcomes keep/drop/route/wait/business-result and≤16 unique fact names. Identifiers are ASCII1–256 `[A-Za-z0-9][A-Za-z0-9._:-]*`. Copy/freeze on definition; malformed declarations refuse INVALID_ARGUMENT before factory entry. Original catalog1 remains strict and unchanged. Root describeDecisions(registry) returns separate `{format:'nodeflow.decision-catalog',version:1,components:[{component,decisions}]}`, passive max1024 entries; /model validates its exact schema.
- TaskContext.recordDecision({code,ruleVersion,outcome,facts}) returns boolean, never throws. Facts≤16 unique declared names, optional sourcePacketId must name an actual bound input; fieldPath≤256 UTF-16 code units is a valid JSON Pointer and requires sourcePacketId. Node-scope facts may omit packet/path. No raw values/errors, getters, proxies or arbitrary serialization. Invalid, stale, cross-attempt or per-attempt over32 reported calls increment rejected and returnfalse. Evidence failure does not alter retry/business result.
- A separate DecisionSnapshot `{format:'nodeflow.decisions',version:1,runId,total,dropped,rejected,events}` holds EV1 reported nodeflow.decision records and runtime-only `{format:'nodeflow.filter',version:1,...correlation,outcome:'keep'|'drop'}` observations. Both carry node/operation/attempt IDs/count, input metadata, sequence/time. Only reports include declared code/rule/facts; absent reason is never invented. Filter observation means actual boolean predicate result, not successful downstream forwarding. Reports and observations may disagree visibly.
- Root decisionSnapshot(run), onDecisions(run,listener) use the real run's existing diagnostic owner; no new NetworkRun signature or DG1/EX1 variant. DG1 and decision records share the existing `diagnostics.limit` option's1–1024 aggregate retention ceiling, newest observations evict oldest across streams; each stream retains independent monotonically increasing sequences and dropped counts. The unrelated lifecycle diagnosticLimit is unchanged. Shared owned change notifications; S23 sinks/export stay DG1-only until S24B evidence integration.
- Preserve actual AsyncLocal attempt ownership. Minimal private plumbing expands the proposed allowlist to runtime.ts (pass the registered component to createTasks) and runtime/task-scope.ts (check current lease identity). This is necessary authority/liveness plumbing, not a new runtime policy or inferred packet binding. No alternate executor, latest-input guess or public raw packet store.

S24B owns digests/explanations/UI integration; no identity/reproducibility guarantee is claimed here. Implementation and proof are recorded below; publication state is explicit below.


## Implementation and condition proof

S24A.A–C are implemented on the selected branch, with EV1-r2 above. The condition ledger now points to actual assertions:

- X24A.1: `test/decision-model.test.js`, `test/types/decisions.ts`, invalid-report assertions in `test/decision-evidence.test.js`, and foreign asynchronous-attempt refusal in `test/decision-lifecycle.test.js`. Declarations are copied/frozen before factory execution; separate strict catalog and decision validators preserve catalog1/DG1/EX1.
- X24A.2: `test/decision-evidence.test.js` runs amount4/threshold5 to no output, with BELOW_THRESHOLD/rule-v1 and exact packet/job/node/operation/attempt attribution. Legacy boolean-only predicates retain an observed drop with no invented reason. Reported drop versus actual keep remains visibly distinct and forwarding follows the actual predicate. Installed CJS/ESM proof is in `test/package-contracts.test.js`.
- X24A.3: `test/decision-lifecycle.test.js` proves distinct retry attempts, foreign lease refusal, timeout/late callback rejection, observer detachment, and actual report/filter-record allocation failures without changing business output. `test/decision-evidence.test.js` proves shared retention eviction does not relax execution duplicate protection. Failure injection uses a restored test-scoped Object.freeze interception only for the actual record format; production source is never bypassed.

Meaningful red: `/tmp/fbp-s24a-evidence/red.log` reaches a completed real false-predicate graph with no outputs, then fails the missing observed-disposition assertion. This is not a missing-export/setup red. Final tests use the implemented public API directly.

## Verification environment and evidence

Working directory: repository root `/Users/william.brinkert/Desktop/projects/node-eventDispatcher`. Node26.13.0/npm11.20.0, pinned executables under `/tmp/node-v26.13.0-darwin-arm64/bin` and `/tmp/fbp-s21-tools/node_modules/.bin`; cache `/tmp/fbp-npm-cache`. No global configuration/keychain change. Lock SHA256 `7a72e97113003c27a10944f869b802f0d43474198662b7d0d2cdeffac49dac01`; .c8rc SHA256 `a51b73a30558dee8669138729a50ea64d2e5591f0b8c48a20f449b11a124c787`.

Local raw receipts live in `/tmp/fbp-s24a-evidence/`; they are local evidence, not committed artifacts. No payload/credential dump is committed. The first complete coverage run's tests passed but its gate failed at decision-api.ts branches85.71%: the actual >1024 registry refusal was untested. Added a real1025-entry refusal plus1024-entry accepted boundary, without changing the denominator or thresholds. Final complete coverage below supersedes that failed measurement.

Human readability: declarations, passive schemas, attempt-bound stream and public API have separate cohesive modules (17–79 lines). Shared retention remains with the existing diagnostic owner; existing task scope owns lease authority. No alternate executor or duplicated payload store. Larger pre-existing component/runtime/model files receive only the minimal integration plumbing.

Not delivered: inspector decision explanation, combined evidence export, trusted build/digest provenance, replay, editor, persistence or SQL. S24B owns causal inspection and integration. Existing S23 JSONL remains DG1-only. No explanation is inferred from absent data.


Final gates (exit0):

| Gate | Evidence / result |
| --- | --- |
| npm run check | check.log; final build, types and lint passed |
| npm run coverage | coverage-final.log; 282/282 tests, unchanged all-files per-file thresholds passed |
| npm run test:package | package.log; 9/9 isolated installed CJS/ESM/type/example checks. Final full coverage reruns these tests against the failure-isolation fix. |
| npm run test:next | next.log; 43/43 production Next tests, browser/model coverage passed. Reused after the final internal filter-observation catch: no browser/model/transport/API or normal filter result changed; the added allocation-failure path is proved by the final complete runtime suite. |
| node scripts/check-agent-guidance.mjs | guidance.log; local links and historical foundation order passed |
| extension integrity | integrity.log; 38 ordered slices and114 unique condition owners |
| git diff --check | passed |

Final source-tree SHA256 (sorted src/**/*.ts path + NUL + bytes): `d1df5db11adf9fbeeab4a5a0ed238cc758d31be974f01e6e9331f186a914500d`. Coverage is source-mapped over all configured production files, including never-imported files; generated declarations/tests excluded by unchanged .c8rc. Every changed production file meets statements/lines/branches≥95%; no new exclusions or unreachable exceptions. Test-scoped failure injection restored automatically; no production bypass was applied.

Implementation: complete. Behavioral proof: verified for X24A.1–3. Quality and coverage: passed. Publication: ready for commit/push/PR; not merged. S24B remains unstarted and requires this branch's actual merge plus its own request.
