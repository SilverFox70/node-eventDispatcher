# S24E execution receipt

Verified PR #40 merged at bd0302b5de986dfd2ffcc3903a9c666ff3264770 after all four CI jobs passed on ff762cc. Next browser setup timed out on the first attempt and passed on retry. User authorized S24E. Branch codex/fbp-24e-application-proof.

S24E starts from the verified S24D merge. Keep the existing Next fixture as the installed consumer, add a content review route and page, and keep all domain code in the application. Provide a separate npm workspace acceptance command to verify source consumption with a fresh install and rebuild. Reuse the public runtime, causal model and reviewed fixture helpers.

Contract specimen: one product with title, description, altText, archived and a stable slug; finite bounded strings and a boolean. Missing business text is a valid structural input, empty at the domain checks. Malformed JSON or wrong primitive types reject before graph construction or service calls. Form and uploaded JSON submit the same object to the same route.

Execution specimen: eligibility filter reports ARCHIVED with a fact reference and consumes the input; active products fan out into independent content, media and publication checks and join by the stable job/key. A report carries actionable missing fields, and a preview is emitted only when all checks pass. Media work has a cooperative signal and an idempotent single retry for a named transient error. Invalid output terminates the run. Request cancellation reaches the graph. Expose observed states and run-scoped causal evidence without claiming unobserved reasons.

Proof: browser chair preview and joined paths; table actionable findings; lamp observed drop and ARCHIVED; malformed input no external work; controlled service effect counts for retry, timeout/failure and cancellation. Isolate the check nodes and prove reviewed fixture export on an installed consumer. Keep workspace source/rebuild proof independent of the packed consumer. Exclude future editing/storage and the deferred multi-ingress ordering investigation.

## Ownership and proof

Application files live in the existing Next fixture under app/content-review, app/api/content-review and lib/content-review. The API bounds UTF-8 JSON before schema admission. Invalid input is rejected before the media service can be invoked. Both UI entry points use that API. Active products split into content, media and publication checks plus an original-product branch, collate by job/key and produce either actionable findings or a preview. Archived products record ARCHIVED and produce no output. The explanation uses retained packet parents and recorded decisions. The live app does not assign a verified build identity or export arbitrary input.

Media services are injected and run inside the production task context. One named retryable failure uses the configured idempotent single retry. Invalid node output preserves the runtime's failed terminal and no preview. Cancellation reaches the active service signal. The app handles channel closure as a consequence of the run terminal. The media task timeout is within the existing regression harness ceiling, allowing the captured graph to replay without a second executor.

X24E.1 is covered by the packed route tests and the injected service effect counter for malformed root. X24E.2 uses the packed browser chair/table/lamp cases, isolated authored nodes, actual captured and reviewed chair fixture generation/replay, and the independent workspace command. X24E.3 uses the browser failure and cancellation states and controlled service attempt/cancellation counters. Existing framework tests own the built-in fork/join internals.

The workspace proof materializes fresh manifests and a lockfile from the pinned core and app package inputs, installs the workspace and resolves one local framework package instance. It builds before app startup. A temporary framework edit changes the result from chair preview to no output after rebuilding and restarting; application node source is byte-identical. The build script resolves the pinned TypeScript CLI through Node package resolution so npm can hoist it. No package publication is involved.

Initial acceptance isolated channel abort handling, strict capture selectors, the replay timeout ceiling and the workspace compiler path. The corrected behaviors are exercised through the same app and public testing entry points. No missing-module failure is treated as behavioral red for a new route.

## Verification and handoff

- Pinned Node 26.13.0 and npm 11.20.0. Core build, types and lint passed. Final lint also passed for the changed tests, app and scripts. All 300 core tests and core coverage passed in /tmp/fbp-s24e-core.log. Framework runtime sources, lockfile and thresholds are unchanged.
- Packed Next production build and all 49 suite tests passed in /tmp/fbp-s24e-next-acceptance.log. Its initial coverage measurement identified one missing direct input-contract refusal assertion. Five owning tests, including that assertion, passed on the same production fixture in /tmp/fbp-s24e-next-focused.log. The original fixture coverage verifier then passed all per-file gates. It refused the unexecuted canary and passed again after removal. Content review run module branches reached 97.29%; its one unobserved generated async region does not reduce the gate below threshold. Logs /tmp/fbp-s24e-next-coverage.log and /tmp/fbp-s24e-next-canary.log. The focused rerun changed tests only.
- npm run test:content-workspace passed in /tmp/fbp-s24e-workspace-proof.log with a fresh workspace install and two production builds. The post-proof application changes only expose the authored summary component for isolated tests and render existing packet links. The workspace command asserts the unchanged application API and framework edit/rebuild path.
- Documentation link and whitespace checks passed. No CI workflow changes. Implementation and X24E.1–3 proof complete; S24F follows the actual S24E merge.
