# Explainability and application proof — EXT1-r2

Proposed contract for S24A–S24F, before visual authoring S25. Scope authorized: amend plans; implementation not approved. [Order](INDEX.md), [canonical conditions](conditions.md), [execution rules](execution.md).

S20 [EV1](contracts/evidence-v1.md) selects exact identity/decision/evidence/fixture behavior and overrides inconsistent illustrative fields here. Detailed declaration/host-review fixtures remain bounded owning-slice gates.

## Promise and evidence boundary

*every result can be explained, every node can be tested alone, and every change can be traced.*

Treat this as the product’s acceptance standard. Explain retained structure, observed execution, declared decisions and tested changes. Do not infer private reasoning inside arbitrary code, correctness from schema conformity, missing-result cause from absence, or reproducibility from input capture alone. Display the boundary of available evidence alongside any explanation.

Production inspectability is a first-class proposed capability: safe metadata by default, authorized bounded evidence and opt-in payloads. Development adds fixture generation and controlled comparisons. No unrestricted production capture/replay or hidden information in client bundles. Authorization, retention and workspace separation apply to ancestry as well as payloads.

## S24A: declared decision records

Proposed addition to task/function context: `recordDecision({code,ruleVersion,outcome,facts})`. `outcome` is `keep | drop | route | wait | business-result`; `facts` is a bounded array of safe references `{name,sourcePacketId?,fieldPath?}`, not arbitrary raw values. Definition metadata declares allowed codes, safe fact names and rule versions. Host capture policy determines whether any referenced values can be displayed; a reference alone never bypasses payload denial.

Envelope adds runtime-owned run/node/job/packet/operation/attempt IDs, monotonic sequence, observation time and code/graph identity. Code/rule provenance comes from the trusted registry binding plus declaration. The recorder is nonthrowing/bounded and observer failure never changes business outcome. Invalid calls increment visible rejected-evidence count; do not execute getters/serializers on untrusted objects. Max16 fact references and256-byte code/rule identifiers; host limits may lower these. S20/D5 freezes exact metadata/API validation before implementation.

Built-in filter records actual `keep` or `drop` after its existing boolean predicate completes. Existing predicate signature/packet forwarding remains unchanged. Without explicit application reason, display “predicate returned false; business reason not recorded.” A handler’s declared decision is labeled as its report, not proof its internal rule was correct. Multiple reported decisions preserve order and attempts; outcome mismatch is visible rather than silently replaced with a fictional explanation.

Retry attempts carry distinct records. Late closed-attempt context cannot record a decision as a fresh attempt. Recording a decision does not enqueue business packets, grant retries or acknowledge a durable effect. Existing first-terminal/cancellation policy remains. An external call may have happened even if later evidence was lost.

## S24B: causal evidence and queries

Proposed browser-safe result: `Explanation = {version:1,runId,subject,coverage,nodes,links,gaps}`. Subject is an observed output packet or admitted input/job. Nodes include source, transfer, operation/attempt, declared/observed decision and terminal/wait state. Links are immediate packet-parent or explicit operation association, never guessed temporal proximity. Timing uses observed task start/end; missing endpoints produce unknown duration, not0.

`coverage` is `complete-for-recorded-scope | partial | unavailable`. Complete-for-recorded-scope requires known admission, all referenced parent/operation links retained and no session capture gaps over that subject’s interval. It is not a claim of complete business reasoning or all external history. Uncaptured payload is a separate state and does not imply missing topology. Gaps identify eviction, capture-off, oversize, disconnect, missing parent or undeclared reason. A missing output with no recorded terminal disposition remains unknown.

Host query: `explain({runId,subject,maxRecords})`, authorized against the same run/source/workspace. Max1024 records/query; cycle/repetition detection, deterministic ordering and bounded traversal. No global packet store or cross-run payload lookup. Resolve only the selected session/retained export, with no implicit database or code import. Exported evidence-v1 is passive JSON with schema/version/provenance and loss counters, max10MiB; unknown versions/ref mismatches refuse.

Before S32 registry locks exist, evidence binds `executionIdentity-v1`: canonical JSON of GraphSpec, host-provided per-component implementation/contract digests, runtime/policy version. Hash SHA256; no function.toString() or title-based identity. S20 must freeze the trusted build-digest provider. After S32 attach semantic revision and retain execution identity; no competing semantic hash recipe. Missing digest labels code identity unverified and blocks reproducible fixture/comparison claims, not ordinary in-memory execution.

UI supports click output → ancestry, select admitted input → disposition, expand both joined branches, job/attempt filtering, code/rule revision and safe input/output/contract display. Live updates reconcile without reload and mark gaps; displayed order never substitutes for causality. Reuse the current inspector, not the future canvas/editor. Explanations cite observed records; no LLM-generated unsupported narrative required.

## S24C: observed run → reviewed test

`RegressionFixture = {format:'nodeflow.fixture',version:1,caseId,executionIdentity,input,dependencyScripts,expected,redactionReview,provenance}`. Input and expected data are bounded JSON validated by current registered contracts. Scripts bind explicit trusted dependency roles to ordered recorded/synthetic result/error fixtures. They are data, never executable source, network URLs or credentials. Clock/random facts require explicit deterministic injected bindings; otherwise mark nonreproducible.

Export is user-initiated. Require complete required payloads, known implementation/contracts, explicit reviewed redactions/synthetic substitutions and a host-validated safe field allowlist. Free-text secret detection cannot guarantee safety; do not claim automatic sanitization. Unreviewed/raw capture never becomes a runnable fixture automatically. Redaction may invalidate contracts or expected results: revalidate and require reviewed expectations, never silently bless observed wrong behavior.

`expected` declares chosen output/decision assertions; generated scaffold imports public runNode/runGraph and caller-owned registered fixture bindings. Default fixture runner is offline and rejects unresolved dependencies; it never calls original production services. Node-specific export may omit unrelated branches, but labels its scope. Generated tests do not preserve runtime packet IDs; use case IDs and logical causal relationships. Refuse unsafe paths/overwrite and unknown format. Source ownership protections are local to generated files until S36 artifact export unifies them.

S24C owns actual packed-consumer test generation/build/run proof. It may add public fixture helpers to existing /testing, not another runtime or arbitrary captured-code loader. Existing scripts are used/extended; no future artifact package prerequisite.

## S24D: revision comparison

`compareFixture({fixture,baseline,candidate})` accepts two explicitly resolved graph/registry snapshots with implementation/contract digests and identical reviewed fixture/dependency scripts. Compile each through the production compiler and execute existing test harness. No source inference, dynamic npm install or public API request. An incompatible contract is an explicit comparison result, not coerced input.

Pair by case ID, node logical ID/explicit origin map, output port and occurrence index within the case; preserve legitimate sequence changes as differences. Ignore random packet/run IDs and wall-time noise for semantic equality. Compare JSON values, output multiplicity/order, recorded decisions/routes and failures. Schema/config/graph changes are shown separately. Performance observations are a separate report, never confused with semantic change.

Result: `equal-on-fixtures | changed-on-fixtures | not-comparable`, with fixture/graph/code digests, changed paths, unchanged covered paths and evidence gaps. Changing fixture facts or missing bindings yields not-comparable. No inference that untested branches or future inputs are unaffected. For deliberately nondeterministic fixtures, refuse semantic equivalence until deterministic inputs are supplied. After S38 retain subflow origin maps; do not build subflow support early.

## S24E: useful application and failure model

Content review/preview is proposed as a small useful application: accept a product record from form or upload, validate structure, run independent content/media/eligibility checks, collate a report and render preview if eligible. Same graph serves both entry points; each meaningful domain stage has isolated fixtures and a clear ordinary TypeScript implementation.

Use synthetic local assets and owned loopback services by default. Valid chair produces preview/check report. Structurally valid incomplete table produces domain validation findings as normal typed report data. Archived lamp is intentionally filtered with an explicit reason. Invalid node output is a runtime contract failure and preserves the existing first-terminal behavior; the demo must not imply sibling checks necessarily finish after failure or add new partial-success semantics silently.

Controls inject bounded slow responses, one definite retryable failure, invalid output and cancellation. Cooperative fetches abort; an already-accepted remote effect is labeled irreversible/unknown as appropriate. Bounded channel capacity/concurrency is displayed separately from an explicit service rate limiter. Neither flat memory nor zero429s follows automatically from backpressure. Show source/node tests alongside the visualization so API complexity is visible.

User tasks: explain a surprising preview, explain a missing lamp, isolate/test one rule, export a reviewed regression, modify one rule and compare revisions. These are real runtime observations, not scripted animations. S24E proves installed Next/browser/application integration before an authoring editor exists.

## S24F: fair comparison and roadmap checkpoint

Use the same application requirement, domain functions, adapters, fixtures, concurrency limit, explicit rate-limit policy and AbortSignal propagation in both graph and competent ordinary-TypeScript variants. Plain implementation may use standard promises, queues and structured functions; no intentionally unbounded strawman. Both must pass semantic/effect-count/failure/cancel tests before comparisons are valid.

Publish reproducible task instructions, source diff, versions and raw observations: setup/application code, files/functions touched adding a check, isolated/composed testing effort, evidence available for seeded defects, elapsed time only when actually observed, resource/latency measurements with environment/sample limits. Separate framework instrumentation effort from domain code. Do not invent human results or credit estimates. Agent-only exercise is labeled agent-only; independent-developer usability remains unverified until someone actually participates. No external outreach is authorized.

Checkpoint before S25: demonstrate output and missing-result explanation, working regression export, honest comparison and real application use. If evidence is disappointing/incomplete, record a proposed narrow amendment/investigation and affected blocked editor task; do not demand that every metric favor Nodeflow. Independent usability absence is a recorded gap, not an automatic permanent block on unrelated work. Changing planned order remains an explicit roadmap decision.

## Owners and readiness

S24A emits decisions → S24B causal query/UI → S24C reviewed fixture → S24D revision comparison → S24E installed app → S24F comparison/checkpoint → S25 editor. Assertions X24A.1–X24F.3 live only in conditions.md. All six implementations remain blocked on accepted D1/D5 interfaces and predecessor proof; this amendment approves planning scope only.
