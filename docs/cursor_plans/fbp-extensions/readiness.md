# Evidence, decisions and readiness — EXT1-r2

2026-10-31. Proposed plans, not accepted architecture or implementation receipts.

## Evidence and provenance

| Source | Observed fact / planning consequence |
| --- | --- |
| User conversation | Four extensions requested; Node-RED authoring reference; no-refresh relationships; isolated tests/readable exports; optional durability and provider uncertainty; human-reasonable small files |
| User reply during this pass | SQLite for local saved graphs/demos, PostgreSQL for optional durable host. Storage engines selected, not driver/API or complete schema approval |
| User tagline/direction during this pass | “every result can be explained, every node can be tested alone, and every change can be traced.” Visibility is the product focus; no unsupported comparative claim about Node-RED/RxJS |
| Fetched origin/master | S19/PR31 merged at `53737a3dc229fb95fcc8d4bd7bc730be24e9f8aa`; local S19 branch head `6329cd22b32e9b9607703834f529bbfc5c083135` |
| `src/model/graph.ts`, graph structure validator | Strict GraphSpec v1, JSON/DAG, bounded nodes/edges, typed named ports and task policies; no config/layout/revisions |
| `src/component.ts`, `src/runtime/tasks.ts`, `src/runtime/trace.ts` | Captured factory/process; operation boundary; optional bounded EX1 trace. Cannot snapshot arbitrary closures or iterators |
| `src/model/catalog.ts`, inspection and Next fixture | Browser-safe descriptors, read-only live graph/event inspector and node input/output/stage views; no editable document or durable host |
| `package.json`, development guide, S19 receipts | Existing build/check/test/coverage/package/Next commands and pinned Node26.13.0/npm11.20.0. Receipt history is not a fresh full-suite run in this planning pass |
| Pinned Node sqlite import check | Database/Statement and compatibility symbols exist; this proves availability only, not stability/support or the chosen repository adapter |

Current merge/base differences still require preflight before implementation. Repository notes calling npm test a placeholder are historical: current package.json has delivered tests. Preserve historical receipts; do not use stale prose to invent a missing toolchain.

Research is primary-source only: [Node-RED editor](https://nodered.org/docs/user-guide/editor/), [React Flow docs](https://reactflow.dev/learn), [PostgreSQL SELECT/row locks](https://www.postgresql.org/docs/current/sql-select.html). These establish relevant interfaces, not our compatibility or correctness. Exact supported dependency versions/license, native SQLite API status, package-name ownership and ORM/domain integration remain unverified.

Realberry source/tickets were **not re-audited in this planning pass**. IAW-2919 workload details are prior conversation context and a future acceptance hypothesis, not a current source-backed replacement assessment. No access to all other chats is assumed. A later adoption investigation must read the actual current repository, contracts and tests first.

## Decisions and explicit release gates

| Gate | Proposed choice / authority | Required output before dependent implementation | Blocked owners |
| --- | --- | --- | --- |
| D1 contract | User goals accepted; exact interfaces here proposed | S20 reviewed API/error/path examples, per-kind diagnostic fields, GraphSpec/Catalog v1→v2 compatibility, canonical/build digest recipe and schema refusal fixtures; record accepted amendment | S21–S51 affected public/data contracts |
| D2 package/canvas | Optional separately packaged editor/artifact/durable entries; React Flow proposed | S20 local package/import identifiers/build map, supported Node/React/Next dependency/license evidence, all-files coverage plan and installed-consumer boundary; S26 lock current versions at implementation | S26 onward package-producing tasks |
| D3 persistence | **User chose SQLite graphs + PostgreSQL durable host** | Supported driver/native API and SQL major evidence; exact CAS schema/migrations/transaction APIs; same-connection domain integration and backup policy. No reopening engine choice without new evidence | S33–S34 and S40+ storage implementation |
| D4 recovery | Eligible task/operator profile, shared kernel and conservative uncertain-effects policy proposed | Source-level kernel extraction map; exact state/SQL constraints, fan-out batch transaction schema, provider-policy proof/evidence interface, retention horizon and approved crash traces | S39–S51 |

D5 adds the [explainability contract](explainability.md): source review confirms existing filter false consumes a packet without reason, EX1 retains only transfers and bounded immediate parents, and public /testing exposes runNode/runGraph without run capture/comparison. S24A–S24F own the missing decision/evidence/fixture/comparison/application proofs. Exact schema/API/digest provider review blocks their implementation; no gap is described as already delivered.

S20 owns the bounded design-review story: produce these explicit decisions/artifacts or keep a named gate open with affected task IDs. It does not implement all extensions, invent approval, or require every future function/helper name now. A reviewed alternative updates one shared revision plus every dependent consumer/proof, not an ad-hoc choice on a later branch.

## Content gates G1–G7

| Gate | Content assessment now | Required execution release |
| --- | --- | --- |
| G1 interfaces/outcomes | Proposed versioned boundaries in domain contracts; refusal/effect rules explicit. Exact public signatures/DDL/provider evidence fields not accepted | D1/D3/D4 accepted for selected task; ambiguous alternatives eliminated |
| G2 ownership/DAG | Single compiler/shared invocation kernel, separate editor/store/host ownership and sequential manifest; no implementation overlap authorized | Verify predecessor merge and current paths; trace source consumers |
| G3 condition evidence | 114 canonical planned rows, concrete cases/outcomes/forbidden effects and sole task owner; not passed tests | Add exact assertion file/test pointers and any newly discovered meaningful conditions at preflight |
| G4 commit/recovery | Explicit domain transaction, outcome+continuation, invocation uncertainty, fence limitations and reconciliation path | Freeze SQL/CAS and provider evidence contract; owning real DB/HTTP proof before dependent claims |
| G5 bounded tasks | A/B/C contracts per story, allowlists/prerequisites/stops/exclusions; no entire roadmap execution | Confirm one-agent branch size from current source; amend/split if story exceeds practical scope |
| G6 commands/coverage | Existing commands resolved; future package/DB commands assigned owners and labeled unavailable; per-file ≥95% and condition proof required | Package-owning slice introduces actual scripts/instrumentation before result claims |
| G7 integration | Installed/browser/SQL/process/provider acceptance owners assigned, with local tests in owning slices and composed milestones | Actual downstream receipts; helper green never discharges DB/provider guarantee |

**Readiness:** S20 is `ready-for-review` as a bounded design/decision story. S21–S51 remain `blocked-on-decision`, additionally waiting for their sequential predecessors. No task is `approved-for-execution`. These are detailed executable-direction drafts, not a claim that unspecified schemas can safely be implemented today. D3 engine selection is resolved; D3 implementation evidence remains open.

## Two-executor and failure walkthrough

For every slice, A pins the same valid/rejected versioned specimen; B implements only the domain contract; C attacks the named boundary. The task ledger specifies actual result and forbidden effects, avoiding “add logging,” “support recovery” or “use a database” as sufficient acceptance. All 114 rows were inspected for setup/action/result/owner/proof level; exact executable pointers remain a prerequisite gap rather than fabricated files.

Counterexamples and dispositions:

- Executor A might serialize config into v1; B might silently ignore it. Both violate S25: v2 required, v1 unchanged, raw JSON invalid config refused before factories.
- A might treat a socket disconnect as workflow failure; B might rerun it. S49 keeps persisted lifecycle separate from transport; refresh/reconnect cannot submit a new mutation.
- A might use localStorage as durable save; B might overwrite SQL revisions. S33 requires actual committed SQLite transaction and expected-revision CAS, tested after OS process exit.
- A might generate code by stringifying a closure; B might emit imports from untrusted metadata. S36 requires trusted static binding manifest, escaped literals, ownership hashes and isolated installed build/run.
- A might think an epoch fences the HTTP provider; B might retry after absent lookup. S43–S44 explicitly hold uncertainty until definitive safe evidence; delayed old worker test asserts zero new calls.
- A might checkpoint the existing streaming iterator; B might build an unrelated graph interpreter. S39 refuses ineligible processes and proves shared-kernel parity before durable operators.
- A might delete join tombstones on terminal cleanup; B might reopen a completed group after restart. S47/S51 preserve anti-reuse evidence over the supported replay horizon and test refusal.

Crash trace: commit domain revision+obligation → claim epoch1 → commit provider intent → provider accepts → worker dies → sweep claims eligible recovery epoch2 → sees unresolved intent → persists uncertain/waiting → reconciliation validates original success → one outcome+successor commit → notification lost → sweep finds successor. At no point does a missing notification lose owed work or a recovered worker automatically repeat the provider call. A stale epoch1 commit is rejected. If epoch1 could still invoke, a negative lookup does not release the resource slot.

Normal visual trace: registered node source+fixture → typed catalog/config → edit graph snapshot → backend validation → explicit test run → actual packet/operation observations → matching receipt → CAS save → immutable lock → integrity-checked bundle/readable TS → independent installed runtime. Each transition has an owning slice and negative proof; code installation, production effects and version upgrade require explicit host policy.

## Review findings retained

No source/tests/config were changed, new packages installed or production gates run. Documentation integrity/order checks validate navigation and plan structure only. Remaining material decisions are exposed rather than hidden inside generic implementation tasks. Broad package scopes must narrow to concrete symbols during current-source preflight; the target file roots do not authorize unrelated rewrites. No time/credit estimate is implied by a slice count.

Actual documentation checks and scope are recorded in [the planning receipt](planning-evidence.md); no production gate result is claimed.

User-directed addendum, 2026-11-01: [local workspace consumption](local-workspace.md) is an accepted target alongside installed packages. Exact npm manifest/build/watch compatibility is still an implementation proof obligation, owned by existing S24E/S26/S37/S51 conditions; no new slice or delivered capability is inferred.

## S20 execution checkpoint — 2026-11-03

[S20 SC20-r1](S20-decisions.md) supersedes the initial readiness snapshot for selected proposals. User requested S20.A–C; design work is complete for review, not merged. DG1 makes S21 proposal ready for review; no S21 code approved. PK1 selects local identities/native SQLite-worker/pg adapter proposals with primary-source limitations; RC1/EV1/CG2 choose boundary behavior. Exact later package versions/SQL/kernel/provider/codegen fixture gates remain scoped and blocked. Initial “no task approved” statements above describe planning time; they are not a reason to refuse the explicit S20 request.
