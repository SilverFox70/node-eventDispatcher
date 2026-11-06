# S24B execution receipt

2026-11-05. User requested S24B after PR37 merged. Verified GitHub merge and fetched origin/master at 618b65bf439c4723347fef847caf64ed1193b68e. Branch codex/fbp-24b-causal-inspection. S24A implementation receipt is the predecessor evidence.

## S24B.A interface freeze

EV1 causal query takes a same-run diagnostics/decisions envelope, a subject identified by input or output packet ID and job ID, and a bounded record budget. The host identifies public outputs from the selected GraphSpec's exposed output endpoints and retained sent records. Inputs are admitted records. Browser transport composes evidence from the same session snapshot. No cross-run or global lookup.

Packet links come from immediate parent IDs. Operations attach to explicitly bound input packets. Existing sends have no operation ID, so the result never claims a specific task produced a packet merely because its timing or node matches. Node-scoped tasks cannot be attributed to jobs. Attempts and their durations are resolved by exact node/operation/attempt identities. No runtime policy change is needed.

A drop is attributed only from retained runtime filter evidence. An application report remains a separate record, and a reason is available only when it references the same attempt and input. Eviction, missing admission or parents, cycles, missing attempt endpoints, disconnection, query limits, and unavailable identity are represented explicitly. Missing payloads are shown separately from the lineage coverage status.

Build identity comes from the host manifest and supplied graph/contract bindings. Missing host provenance leaves identity unverified. The passive evidence format carries no automatic payload lookup.

### EV1-r3 selected surface

- Passive envelope `{format:'nodeflow.evidence',version:1,runId,diagnostics,decisions,identity}` validates existing stream schemas, same-run ownership, a combined retained ceiling of 1024 records and a 10 MiB serialized cap. Identity is `{status:'unverified'}` or `{status:'verified',digest}`. Verified identifies trusted host provenance under EV1, not a cryptographic attestation of runtime code.
- `explainCausal(evidence,{runId,subject,maxRecords},outputSequences,connected?)` is a browser-safe model query. The host supplies authorized same-run evidence and the output sequences mapped to the selected graph's exposed ports. It returns an explanation with stream-tagged exact records, immediate parent links and explicit gap codes, or INVALID_QUERY / INVALID_EVIDENCE / WRONG_RUN / UNKNOWN_SUBJECT. Each traversal and returned record list is bounded by maxRecords (1–1024). Transfer capture remains optional. Stream-local sequences never stand in for causation.
- `implementationIdentity(manifest,requiredFiles)` validates sorted emitted-file paths against the independently supplied host closure, then hashes the canonical EV1 implementation preimage. `executionIdentity(input)` checks one binding per graph component, sorts bindings and hashes the canonical EV1 execution preimage. Missing or malformed data returns unverified. The shipped demo passes unverified identity because it provides no build manifest.
- Only the public root/model barrels were added to the original source allowlist for API wiring. No changes to execution policy, diagnostics recording, DG1/EX1, dependencies or package export paths.

## Behavioral proof

- X24B.1: `test/causal-evidence.test.js` exercises a real joined run, bounded ancestry, refusal of wrong run and unknown output, structurally valid cyclic and missing-parent evidence, malformed evidence, and a changed transitive emitted helper plus incomplete host closure.
- X24B.2: the real fork and join test verifies the exact two immediate parent IDs, shared original admission, two distinct bound attempts and actual durations. The compiled-only installed CJS/ESM consumer runs a declared filter drop and queries the passive envelope through the public model. The Next browser runs the local eligibility example and selects the admitted drop and joined output.
- X24B.3: tests cover evicted parents while the output is retained, corrupted bindings, missing drop reason/disposition, capture off, retained and truncated captures, run failure, a disconnected stale view, selection eviction, and a replacement run with no old selection. The browser test dispatches an EventSource error on the live connection to exercise the disconnect callback deterministically. Existing held-HTTP tests independently exercise real source disposal and cancellation.

## Verification

Repository root, pinned Node 26.13.0 and npm 11.20.0. Core lock SHA256 `7a72e97113003c27a10944f869b802f0d43474198662b7d0d2cdeffac49dac01`. Next fixture lock SHA256 `012f813907a2c430e3775595b2241051b6cc2d8f6be3480c3ef39505f204f8c1`. Coverage configuration SHA256 `a51b73a30558dee8669138729a50ea64d2e5591f0b8c48a20f449b11a124c787`.

- `npm run check` and `npm run coverage` exited 0. Core, installed consumers and stress tests passed 289/289. Every changed core production file met the unchanged per-file thresholds. Local logs `/tmp/fbp-s24b-check-final.log` and `/tmp/fbp-s24b-coverage.log`.
- Initial production Next build exposed a packet selector generic inference error. After correction, production build and the expected server-only refusal passed. The first full browser run on the corrected artifact passed the new causal scenario and timed out on an existing inspector Space-key interaction. That interaction and all three tests in its file passed on an isolated rerun. Expanded diagnostic browser assertions passed 4/4 on the same build, and the existing fixture coverage gate passed with causal panel statements/lines 98.8% and branches 96.66%. No denominator or threshold changes.
- Evidence remains local. Production Next fixture `/private/var/folders/s7/ycx3c31d7tl_xw7ykf3p9ym40000gs/T/fbp-next-546weF`; raw logs `/tmp/fbp-s24b-next-final.log`, `/tmp/fbp-s24b-inspector-retry.log`, `/tmp/fbp-s24b-diagnostics-retry.log`, and `/tmp/fbp-s24b-next-measure-final.log`.
- Readability review: passive envelope, lineage traversal, query assembly, server identity hashing and the inspector panel are separate modules under 100 lines each. Existing demo/transport changes are limited to the evidence seam and local sample. The previous implementation has no causal selector, so no pre-change test is reported as a meaningful behavioral red for the new API.
- Final rerun of the complete production Next suite on the same built artifact passed 44/44 with `node --test --test-concurrency=4 --test-reporter=tap` and the same ten suite files used by test-next. `/tmp/fbp-s24b-next-suite.log`. The existing coverage verifier rejected an unexecuted fixture canary, the canary was removed, and final measurement passed. `/tmp/fbp-s24b-next-gate-final.log`.
- Guidance integrity and git diff whitespace checks passed. Extension order and condition owners are unchanged. Only the implementation branch and its review publication are authorized. S24C waits for the actual S24B merge.

Publication receipt: implementation commit `245b09ccd138a5e05cbf7b326ddcb6f0e8d3a59f` pushed. GitHub confirmed [PR38](https://github.com/SilverFox70/node-eventDispatcher/pull/38) open against master at the verified S24A merge. This follow-up changes documentation only. User-local .DS_Store and .feedback-log remain uncommitted.

Merge receipt: GitHub confirmed PR38 merged. Fetched origin/master contains `17633bca95ccdbe9be0ff037d6e856acb6ada4e9`, the S24C branch base.
