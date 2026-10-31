# S08 execution receipt

Scope: user authorized S08.A–C with “proceed”,2026-10-30. Branch codex/fbp-08-stream-runtime starts from actual S07/master merge528e1aa1de176291c2adfe1f681b6b4981510a8a (PR14). S00/S04/S05/S06/S07 identity, packet, contract, compiler and builder interfaces are delivered. Existing .DS_Store and .feedback-log/ are preserved; no S09 execution or merge is implied.

## Contract readiness and bounded decisions

The execution request adopts IC1-r2's concrete S08 settings: executionRecordLimit default65536, integer1–1048576; reserve node/packet identity synchronously before queue/handoff, retain while live, duplicate before capacity, no rollback for consumed work, no automatic retries and no global/cross-run history. Terminal/name/closed-channel/exclusivity/envelope/schema guards precede reservation. Cancellation disables public/context sends and input exposure before clearing records. These are now the reviewed implementation contract for this bounded slice; S11 completed-group settings remain separate. Prior blanket pending text does not invalidate actual merged predecessors or this explicit request.

Backend verdict transport is frozen here as RuntimeValidationError.validation and optional bounded diagnostic validation metadata: runId, nodeId, port/direction, componentId/version, versioned contractId/representationId, code/path issues and explicit truncation. Limit16 issues/64 segments/128 code units per string segment/64 per code; no raw values/messages. Each run privately retains its canonical immutable GraphDefinition identity for S12; runId binds the verdict to that exact definition. Application graph-release/request attribution and current-response display remain the owning transport/UI slices; no fictional persistent graph revision is allocated by S08. Diagnostics are historical bounded events, not a replacement for current request state.

S08 exposes signal/executionRecordLimit/diagnosticLimit only. timeoutMs is rejected/not typed until S09. Snapshot provides the planned baseline status, node/channel counters and sequenced bounded diagnostics. S09 still owns deadline implementation and adversarial lifecycle/resource proof expansion, not a second orchestrator.

## Implementation and ownership

runtime.ts owns startNetwork, deferred independent process startup, graph-definition association, ingress/egress wiring, process completion and sole orchestration. Public types remain at this facade; an initial separate type-only source emitted an unused coverage artifact, so declarations were colocated with the API rather than changing exclusions/thresholds. runtime/state.ts owns first-terminal transition, parent listener cleanup, abort and bounded immutable snapshot metadata. runtime/ports.ts owns synchronous admission/reservation and guarded async reads. runtime/validation.ts owns actual S05 schema verdicts and bounded safe error metadata. No packet/channel/compiler changes or new dependencies.

Channel capacity is edge capacity/default16, exposed boundaries16. Per-node/packet reservation spans every input; queued/parked/executing/completed work keeps protection through the live run. External refusal leaves the run usable; uncaught internal errors fail it. Factories run once per node/run, never per packet. Each run has fresh state/queues/controller/UUID while immutable dependencies/definitions remain shared by application authorship rules.

Normal process return requires input EOF and no parked sends, then closes outputs. A thrown loop-body error must retain its cause: node iterator return does not preempt the process rejection with abandonment; normal return without EOF still fails. External output iterator abandonment fails immediately. Failure/cancel aborts owned waits without awaiting user promises; future sends/exposure are gated and late outcomes cannot replace terminal. Owned ignored read/send promises have rejection observers.

## Conditions and red/green evidence

- C12: runtime.test.js::ingress refusal leaves live run usable and forwarding preserves identity asserts terminal/name/raw-envelope/duplicate/closed refusal, valid recovery and unchanged forwarded packet ID; finish/done identity and repeated closure/cancel preserve terminal.
- C13/C14/C63: streaming pipeline drains and independent runs preserve identities sends1/2/3 through real raw double→plus processes, gets3/5/7 twice, with separate local counts/factories/run IDs and fresh derived outputs; same job/key and immediate parents retained. Collector runs concurrently.
- C15: runtime-lifecycle.test.js factory/sync/async/invalid-process failures assert COMPONENT_FAILED/nodeId and one factory call, with no raw error leakage or retry. Loop-body regression preserves failure cause. Pre-abort zero factories, late sends disabled, ignored reads and parked sends settle safely.
- C34: contract-runtime.test.js actual S05 schemas reject invalid public input without admission, accept later valid input, and reject output before egress delivery with OUTPUT_CONTRACT and attributed safe details. Count/path truncation and numeric paths are asserted; a trusted-parser fault injection checks defensive overlong code/path limits without claiming that mutation is a supported schema feature.
- C49: independent process startup blocks a source until its sink has started; no topological batch wait. S06 cycle refusal proof reused.
- C57: runtime-identity.test.js covers queued/cross-input/processed duplicates, duplicate precedence at capacity, parked reservations and overlap precedence, fatal internal duplicate/capacity refusal before extra downstream exposure, and abort discard/settlement. Same root across runs proven by C63 fixture; no global history.

Initial implementation/scaffold preceded general new assertions; no missing-module result counted as semantic red. Actual failing-before-fix fixtures retained:

1. for-await body/output-contract throw was masked by iterator cleanup as INPUT_ABANDONED. Focused iterator-red.log exit1 and first focused output captured the wrong code. Process settlement now preserves COMPONENT_FAILED/OUTPUT_CONTRACT; normal breaks still fail abandonment.
2. Ignored pending input read rejected unhandled during abort. read-red.log exit1 records the exact RUN_TERMINATED unhandled rejection; owned read promises now have observers while callers still receive their rejection.

Initial lint failures (prefer-const setup and test global naming) were fixed, not counted as behavioral proof. One full-suite run used an empty accidental npm cache and failed the existing offline package installation; the correct populated cache was restored for the subsequent green run. This is environment evidence, not a behavioral or dependency regression.

Focused tests are split into runtime.test.js, runtime-identity.test.js, runtime-lifecycle.test.js and contract-runtime.test.js, with a short shared runtime-fixture.cjs. All sibling tests match existing test/*.test.js discovery; the split follows shared readability rules and adds no second executor. Necessary packed/declaration consumer edits prove the new root exports. No browser/Next/provider checks claimed.

Final gates and publication follow.

Final close/drain regression: a closed full ingress with an already parked send incorrectly preferred CONCURRENT_SEND for a new call. The close-red.log fixture failed exit1 with expected CHANNEL_CLOSED. Admission now preserves S04's close-first refusal while draining the earlier parked send before EOF; the real runtime fixture asserts17 accepted packets consumed and no new admission. Invalid-schema/envelope ingress with a one-record ledger also proves rejected packets consume no protection slot.

## Final gates and handoff

Final source candidate uses the unchanged Node26.13.0/npm11.20.0 pins, build/type/lint/coverage configuration and lock (SHA256 bf9c99a9567367299e8e5f4afb613fe457a513ad43d1513594af781f2f862bbd). Existing S01 historical baseline applicability retained; no capture/threshold/exclusion or dependency change. Commands run from the repository root with command-local PATH=/tmp/node-v26.13.0-darwin-arm64/bin:$PATH:

- npm run check → exit0: dual build, strict source and generated-declaration consumers, lint. check.log retained in /tmp/fbp-s08-evidence/. Final test-only additions separately linted, exit0 (lint-final.log).
- node --test --test-timeout=5000 test/runtime*.test.js test/contract-runtime.test.js → exit0:21 focused tests,0 failures/skips (focused-final.log). Timeout is a test watchdog, not an advertised run deadline option.
- npm_config_cache=/tmp/fbp-npm-cache npm run coverage → exit0:93 tests,0 failures/skips. All delivered production files100% statements/lines/branches/functions, including runtime.ts and all private modules; full log coverage-final.log and mapped coverage-final.json retained locally. Full suite includes real packed offline install and actual ESM/CommonJS execution with stdout asserted as stream:4, avoiding false success from an unresolved promise/process exit.
- Documented runtime.md example executed: [3,5,7] then {status:'completed'}; demo.log retained. Guidance integrity passed69 Markdown files/401 local links/20 slices/66 condition owners (links/order only); git diff --check passed.

Additional exact assertions: contract-runtime.test.js::invalid internal output reaches no downstream process effect verifies a real two-node graph has0 consumer effects/edge admissions after OUTPUT_CONTRACT. runtime-lifecycle.test.js::failure preserves previously consumed output without replay observes output1 before releasing a controlled failure, then asserts failed/COMPONENT_FAILED,1 factory invocation and1 received packet. No result rollback or hidden retry.

Red fixtures ran against the initial uncommitted S08 build atop the recorded S07 merge; each log retains its named intended failure/exit. Final source after the corrections is the publication candidate below. No new production changes after the final gates. Public declarations reject forged compiled-handle startup, raw nonpacket sends, readonly snapshot mutation and premature timeoutMs in both module consumers.

Readability: public facade163 lines (types plus orchestration), ports56, state59, validation32; focused test files remain under100 lines with one19-line test fixture. The facade keeps startup/terminal ordering visible together while private modules own admission, state and safe verdicts. No wrapper forest, global run inventory, second scheduler, comments narrating ordinary statements, or files over200 lines introduced.

Implementation complete; C12/C13/C14/C15/C34/C49/C57/C63 proof contributions verified; quality and coverage passed. Runtime/contract tests and packed consumers are actual execution evidence. Hosted CI, Next/browser/provider/durable recovery not claimed. S09 requires the real S08 merge and retains deadline/adversarial resource proof work. Publication follows; local success is not merge evidence.
