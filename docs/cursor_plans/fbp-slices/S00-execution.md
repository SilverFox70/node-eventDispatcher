# S00 execution — identity contract design

Date:2026-10-29. Branch: codex/fbp-00-identity-contract.
Plan executed: S00 r1 tasks A–C (design deliverable and review preparation).
User authority: “execute on the first plan slice … create the branch, execute the plans submit for review”. Authorizes this branch, design work, commits/push/PR; does not imply acceptance of unwritten IC1 semantics or successor implementation/merge.
Status: design complete; IC1-r1 ready for human review, not accepted/merged. S01–S19 not started. S04–S19 remain blocked-on-decision.

## Checkout and prerequisite receipt

Base verified: master/origin/master9cb666dc6c846512d64edd39770b7eb2f213256c, zero ahead/behind after fetch. Default remote master verified with authenticated gh repo view. Initial tracked dirt was our earlier README/master updates; untracked planning/guidance resources were also prepared in this same chat. Unrelated .DS_Store and local .feedback-log remain uncommitted.

Those required plans/runbooks/local skill did not yet exist on origin/master. Included them in separate prerequisite commit6ad3760 (`docs: establish ordered FBP slices and agent guidance`) before S00 changes. This makes the review self-contained without mixing a source runtime implementation into a design branch. Existing guidance integrity script is the only maintenance-code addition in that prerequisite commit; no server/src/package/lock/runtime feature changes.

No expensive baseline/dependency installation: S01 owns the modernization baseline. The existing npm test is a recorded placeholder, not an applicable S00 behavioral suite. S00 design code coverage is N/A; runtime/type assertions below are future obligations, not executed tests. The prerequisite script has explicit positive/negative fixture verification, not a fabricated feature coverage claim.

## Task receipts

| Task | State | Concrete output / evidence | Limits |
| --- | --- | --- | --- |
| S00.A — inventory decisions | complete | IC1 §§1–3 separates root/job/packet/run/parents/key, repeated admission, job-scoped join, retention and provider semantics; source/master key-only envelope and FIFO discussion were inspected | No inference that ID supplies durability or authorization |
| S00.B — one proposed contract | complete | [IC1-r1](../fbp-identity-contract.md) exact factory/envelope/context/forward/derive/refusal rules, walkthroughs and alternatives; master r6 C55–C65, SP1-r2 and downstream r2 plans | Chosen for review; not approved public API or source implementation |
| S00.C — consistency and review preparation | complete for submission | Same proposal applied to S04/S08/S10/S11/S13/S14 and safe inspection/package/Next consumers; manifest assigns each new condition one final owner; review gates below | Human acceptance/merge pending; no successor release |

## Cross-boundary design walkthroughs

1. Root→broadcast→two async functions→join: IC1 §5 gives legal UUID aliases, values2→20/200, shared job/key, distinct immediate children and final parent order[a,b] despite reversed arrival. Queue send/merge preserve existing identities. S04 creates, S08 admits, S10 branches, S11 joins, S13 derives helper output, S19 accepts integrated receipts.
2. Mixed jobs: valid same-key packets from job-42/job-43 produce separate join groups, not one combined result; EOF remains JOIN_INCOMPLETE until both jobs' groups complete. Direct cross-job derivation is JOB_MISMATCH after legal parent validation. No domain write or provider replay follows a correlation refusal.
3. Stale/malformed/duplicate: bad UUID→INVALID_PACKET with no enqueue and live-run recovery; mismatched revision keys never pair; repeated input/tuple before group completion→DUPLICATE_KEY; same root transmitted twice outside join is two deliveries with no global dedup. Freshness of a matching payload is application-owned, not inferred from metadata.
4. Two runs: same immutable root keeps job/packet identity; new start owns new runId/state/output IDs. No runId mutation of envelope, hidden registry, or durable replay claim.
5. After crash: base has no promised payload lookup; TestResult is bounded caller-owned collection. Durable host/store/recovery remains F01 roadmap, including ambiguous provider outcomes.

These are document/interface consistency walkthroughs. No runtime, compiler or TypeScript test was executed for APIs that do not yet exist.

## G1–G7 design review

| Gate | Verdict | Evidence |
| --- | --- | --- |
| G1 settled proposal | PASS for review | IC1 §§2–4 exact fields, factories, metadata context, refusal precedence and (jobId,key) scope; no optional A-or-B interface |
| G2 single ownership | PASS | IC1 §6 and SP1 ownership table; S04 factory, S08 admission, S10/S11 propagation, S13 helper, S14 collectors |
| G3 concrete future conditions | PASS as plan | Master C55–C65 exact legal fixture/order/value/error/forbidden-effect rows; no present runtime-green claim |
| G4 effects/recovery | PASS within base scope | Explicit duplicate forwarding, no retries/store/lookup; external uncertain outcomes deferred to durable profile |
| G5 bounded slice | PASS | Documentation contract/downstream amendment only; prerequisite commit clearly isolated; no application implementation |
| G6 actual available checks | PASS for documentation | guidance integrity, source-syntax for existing maintenance utility, controlled negative fixture checks; runtime gates/coverage N/A for S00 |
| G7 whole flow assigned | PASS as design | success/refusal/two-run traces above; S19 final identity acceptance remains future implementation proof |

Two-executor check resolved: root versus derived ID allocation, immutable transfer versus new value, forwarding duplicate versus dedup, jobId versus runId, branch identities, ordered immediate parents, joint(job,key) grouping/reuse, helper metadata access and no base lookup are all specified. Implementation may choose equivalent algorithms but cannot pick different behavior from these alternatives.

## Available check receipts

- `node scripts/check-agent-guidance.mjs`: passed on prerequisite (49 Markdown files/254 local links/20 slices/55 conditions); re-run on final amendment for current counts below. Checks links/order/owner integrity only, not semantic correctness.
- `node --check scripts/check-agent-guidance.mjs`: exit0; unchanged prerequisite utility only.
- Isolated temporary copy using the same script: valid accepted; broken local link, wrong S02 predecessor and missing C54 owner each exited1 with the intended message. Temporary files removed; active source untouched.
- Final amendment checks, PR details and candidate commits are recorded in the final handoff section below after they actually occur.

## Handoff / publication state

Design implementation: complete. Behavioral runtime proof: N/A (not implemented); future C55–C65 remain planned. Documentation integrity: final receipt below. IC1 acceptance: pending human review. Publication: branch/PR submission authorized, no merge requested for this slice. Next action after review: record accepted revision and actual S00 merge, then consider S01; no automatic successor execution.


### Final pre-submission verification (2026-10-29)

- `node scripts/check-agent-guidance.mjs`: exit0;53 Markdown files,298 local links,20 slices,66 condition owners. Metadata/link/order integrity only.
- Local Python assertion receipt: all C00–C65 ordered/uniquely assigned; S00 execution complete but acceptance null/merge null; all successor execution not-started; all S04–S19 decision gates retained; Packet/FunctionContext master matches IC1; join-input bound aligned; r5 archive byte-for-byte prerequisite master; no server/package/lock diff against origin/master. Exit0.
- `git diff --check`: exit2 for intentional existing Markdown two-space hard-break metadata formatting. No source whitespace/config is changed to conceal it; preserved plan archives retain their original bytes. This formatting diagnostic is recorded separately from the passing document-integrity check.
- Pre-submission review inspected the current dispatcher logger IDs (not workflow IDs), obsolete package scripts and all added public-envelope consumers. No runtime tests/coverage/typecheck claims; unavailable future toolchain commands were not run.

### Actual review submission

- [PR #4](https://github.com/SilverFox70/node-eventDispatcher/pull/4): OPEN, non-draft, base master, head codex/fbp-00-identity-contract; submission verified through gh pr view.
- Prerequisite commit:6ad3760. Design/amendment commit:614bff7efb6ac42ae9e3e96ed327c86b9f35819d. This final receipt update is separate documentation metadata; no new design/source behavior.
- GitHub mergeStateStatus=CLEAN at verification; statusCheckRollup=[] (no configured PR checks reported, not a claimed CI pass).
- Title/body/branch verified after write. PR attached to the originating chat. User/maintainer identity acceptance and merge remain pending; no review approval or later slice is inferred.
- Validation receipts stay tied to the design/metadata scope; this PR link adds no runtime proof. Local .DS_Store and .feedback-log stay untracked.


### User-directed readability follow-up (2026-10-29)

Added the canonical human-reasonable code/structure rules and routed them through AGENTS, architecture/development docs, planning/execution/review runbooks and SP1. Relevant future slice allowlists now permit cohesive private capability modules behind their public entries; no new public behavior or orchestration owner. Around 200 lines is a strong readability guideline with useful exceptions, not a hard gate or artificial-splitting target. Shared utilities and JSDoc must add clarity; line-by-line narration is a refactoring signal. Documentation integrity passes for 54 Markdown files/337 local links/20 slices/66 condition owners, and this follow-up diff passes whitespace validation. No application code, runtime contract acceptance or successor state changed.

## Accepted direction amendment — 2026-10-29

The user accepted the follow-up recommendations. [IC1-r2](../fbp-identity-contract.md) supersedes the duplicate-forwarding and completed-group-reuse defaults recorded above; earlier walkthroughs remain historical design evidence. Same packet/node/run delivery is refused before a second invocation, including concurrent/in-flight/failed cases. Completed job/key groups cannot reopen. Both ledgers are bounded with explicit capacity errors and no live-run eviction. No automatic retry or restart-safe guarantee; global deduplication, payload lookup and persistence remain deferred. The 2–256 join bound stays.

Updated master C20/C57/C62 and downstream S08/S11 handoffs. Exact proposed ledger settings and integration need design review; user acceptance of principles is not approval of every newly written interface. No runtime implementation/tests or merge claimed. Guidance integrity check passes; it checks links/order only.
