# S18 — See graph wiring and event relationships in Next.js

Contract version: 2  
Slice revision: r2, 2026-10-29  
Readiness: blocked-on-decision  
Execution: not-started; approved task set: none  
Branch: `codex/fbp-18-graphical-inspector`  
Parent: master r6 / SC-FBP-4 + proposed IC1-r2 / SP1-r2; acceptance pending.

## Story and branch outcome

A user can visually inspect every registered graph/event source, select details and automatically see current relationship changes with an accessible equivalent.

This is one feature/task branch, not permission to execute the full roadmap. The three bounded tasks below belong to this one outcome. One agent session is the sizing target; unresolved prerequisites stop execution rather than expand it.

## Provenance, order and entry conditions

Source: master `9cb666dc6c846512d64edd39770b7eb2f213256c`; old JS prototype inspected, new interfaces not yet implemented. This plan is a future change proposal, not a live-source/coverage success claim. Baseline: S01 captures `fbp-pre-modernization-r2`; later slices verify applicability/reuse it. Existing placeholder npm test exit1 is known from planning; no new checks run here.

- Read [execution index](INDEX.md), [shared contract](shared-execution.md), [master plan](../fbp-foundation-plan.md), then this file.
- Previous: [S17 — Run a packaged flow inside a Next.js application](17-next-server-consumer-plan.md).
- Base: updated `master` after predecessor is actually merged; never an unmerged sibling feature branch.
- Required predecessor evidence: S17 merged into master, with accepted proof and exact merge SHA recorded.
- Next: [S19 — Accept the complete application/developer story](19-adoption-acceptance-plan.md).
- Readiness gate: IC1-r2 is now concrete and applied to this proposal; execution remains blocked until its human acceptance and actual S00 merge.
- Legacy master work: T11 visual portion / R15.

## Solution contract and condition ownership

Shared contract: master SC-FBP-4 + [SP1](shared-execution.md); S00 is the only identity-amendment producer. Conditions contributed by this feature: **C44, C53, C54**. Exact fixtures/assertions live in the master's authoritative ledger; final condition completion owners (including split cases) are in SP1. Reuse predecessor assertions rather than inventing a second truth table. C55–C65 are specified by IC1-r2; acceptance remains pending. S00 walkthroughs are not implementation proof.

## Observable behavior and boundaries

1. Render deterministic read-only SVG from InspectionSnapshot, source selector and node/port/event details, directed connections and legend for defined/declared/active; text/connection table mirrors exact relationships.
2. Fixture two graph definitions (one without run) plus dispatcher. Automatically deliver current topology changes to the open display, including subscribe, once removal, unsubscribe and publisher disposal. Preserve bounded, explicitly owned source/connection lifetimes; no invented shared immortal server state. See LV1 below.
3. Keyboard-accessible controls/selected state and error/loading/current-request logic; malformed descriptor disables run; obsolete request abort prevents stale UI overwrite. Labels are text, never HTML/code. Verify SVG vertex/edge/label counts against snapshot.

### Exact allowed-change boundary

- `fixtures/next-consumer/app/** (inspector UI/safe snapshot endpoint)`
- `fixtures/next-consumer/lib/inspection-fixture.ts`
- `fixtures/next-consumer/e2e/inspector.spec.ts`
- `fixtures/next-consumer/playwright.config.ts`
- `fixtures/next-consumer/package.json`
- `fixtures/next-consumer/package-lock.json`
- `scripts/test-next.mjs (UI verification)`
- `docs/nextjs.md`

Also allowed: this slice's future `S18-execution.md`, append-only local workflow telemetry and necessary index/manifest evidence updates. Generated dist/coverage output is local tooling output, not a license for source changes elsewhere. Existing files are read before editing; future paths are intentional proposed destinations.

### Preserve and exclude

- No drag/drop editor, visual layout engine dependency in runtime, runtime payload log, arbitrary source discovery or persistent session/run map.

Preserve every earlier merged feature's assertions, safe browser/server boundary and JSON/admission-versus-generic-transport separation. No network/provider side effects in unit tests; only localhost adapters/fixture where explicitly owned. Do not introduce global registries or retries to hide missing correlation/lifecycle behavior.

## Planned proof pointers

- `fixtures/next-consumer/e2e/inspector.spec.ts::graphs and event relationships visualized`
- `fixtures/next-consumer/e2e/inspector.spec.ts::schema and current request state`

State/setup/order/exact assertions are the cited master condition rows plus Observable behavior above. Proof strength: type fixtures for authoring, real primitive/runtime integration for execution, isolated packed consumers for distribution, production Next/HTTP/browser for UI. Helper-only greens do not prove a downstream layer. No tests exist yet unless delivered by a predecessor.

## Task contracts

### S18.A — establish this feature's contracts and failing proofs

Purpose/references: the story and conditions above. Prerequisites: S17 merged into master, with accepted proof and exact merge SHA recorded; apply the shared identity-release gate when applicable. Read: parent contract sections corresponding to this feature, shared-execution.md and delivered predecessor symbols. Allowed changes: tests/type fixtures listed in the allowlist, minimal interface scaffold needed to reach the intended behavior, and local journal. Required behavior: establish explicit fixtures/order/outcomes from the linked master ledger before production logic. Named proof targets: fixtures/next-consumer/e2e/inspector.spec.ts::graphs and event relationships visualized; fixtures/next-consumer/e2e/inspector.spec.ts::schema and current request state. Preservation: do not duplicate existing cases that already assert the same boundary; extend their tables. Verification/red: Selected source graph differs as expected, once edge disappears without manual refresh, hostile labels inert, keyboard details/text agree with graphic, older response cannot overwrite latest. Completion: retain actual expected nonzero exits/assertion pointers and valid setups; missing module/setup error is not behavioral proof. Stop if predecessor interface, identity amendment or contract semantics are missing.

### S18.B — deliver the bounded feature

Prerequisites: S18.A meaningful failures or documented characterization/design exception. Read the same contract, existing callers and test failures. Allowed changes: production/config/docs paths explicitly listed above and only their necessary public export/declaration consumer updates. Required behavior: all numbered items in Observable behavior and boundaries, with side effects owned by this slice. Preserve the Exclusions and shared invariants. Verification: make named fixtures green through actual delivered interfaces, inspect diff for extra functionality and run the focused commands below. Completion: allowed-path diff plus green evidence; passing unit tests alone is not integrated acceptance. Return to planning if scope requires new semantics, unimplemented later-slice API, widened any types or excluded recovery/features.

### S18.C — accept the story and hand off the branch

Prerequisite: S18.B implementation. Allowed changes: focused evidence-driven fixes within the same allowlist, feature documentation, journal and index/manifest status from actual evidence. Verify story via the Acceptance demonstration, scoped commands, declaration/import paths and meaningful-condition audit. Measure applicable changed production files with S01 coverage config; reuse valid outputs and classify failures against the baseline. Completion evidence: Actual graphic and accessibility/UI tests composing /model/inspection with Next package consumer; S19 reviews adoption as whole. Record implementation/proof/gates/coverage/publication separately; do not mark merged from a passing local branch. Stop at this branch's outcome. Next slice cannot start until actual merge into master. Publication only with user authorization; planning request has not granted execution.

## Acceptance demonstration and handoff

Recognizable accepted outcome: **A user can visually inspect every registered graph/event source, select details and automatically see current relationship changes with an accessible equivalent.**

Handoff artifact/interface: Actual graphic and accessibility/UI tests composing /model/inspection with Next package consumer; S19 reviews adoption as whole.

Exact verification commands for this scope (S01 creates tooling; later commands assume merged scripts):

```sh
npm run check
npm run test:next
```

Commands must return actual individual exits. `npm run coverage` uses the all-delivered-production denominator, including never-executed changed files. Types-only/docs-only scopes are coverage N/A with reason; S00 does not run implementation tests. UI/Figma/DB checks are N/A unless the feature explicitly owns them: S17 production Next boundary, S18 SVG/keyboard/UI, no DB/Figma source in this series. No external publication is part of the acceptance demonstration.

## IC1-r2 amendment and added proof scope

Canonical proposed identity contract: [IC1-r2](../fbp-identity-contract.md). Graphic graph/event topology and refreshed metadata remain bounded, no hidden per-packet payload/lineage history store. Safe descriptor/schema rendering is unchanged by packet identity. Human acceptance remains pending; this section settles the proposal, not release authority.

## Readiness evidence

| Gate | Verdict | Concrete artifact pointers |
| --- | --- | --- |
| G1 interfaces | GAP: IC1-r2 acceptance pending | Shared contract + Observable behavior; IC1-r2 freezes proposed interfaces; human acceptance still blocks execution |
| G2 ownership | PASS | Previous/base/next, numbered boundaries, SP1 handoff graph; sole feature branch above |
| G3 proof scenarios | PASS for settled proposed fixtures; acceptance pending | Master condition pointers and named assertions; no invented test result |
| G4 effects/recovery | GAP if identity propagation affects this feature | Master §§6/7/14 + explicit exclusions; no implicit persistence/retry; identity choice held at S00 |
| G5 bounded tasks | PASS | S18.A→B→C (S00 design-specific sequence), exact allowlist and stop rules |
| G6 commands/baseline | PASS as proposal | Focused command block, S01 baseline/tooling owner, SP1 coverage denominator/evidence policy |
| G7 integration | Proposed; release blocked by S00 | Acceptance demonstration + handoff + next-merge condition; parent T labels do not hide owner |

Two-executor counterexample: an executor cannot change the numbered behavior, error/ordering/identity policy, proof level or branch boundary and still claim this plan is satisfied. Equivalent internal algorithms are allowed. Any ambiguity not resolved by parent/SP1 becomes a recorded planning gap, not agent discretion to change behavior. Runtime/tool/merge evidence is gathered during execution; this table does not assert implemented gates passed.

Backend-evaluation display handoff (user direction2026-10-30): consume S05 authoritative safe validation code/path results; before implementation freeze bounded report transport, node/port/revision/run-request attribution and current-result lifecycle for this layer. UI must echo the backend verdict and suppress obsolete responses, with raw payload display only by explicit application policy. See master backend display direction and [S05 contract guide](../../architecture/contracts-and-components.md). This note does not authorize later implementation.

## LV1 — Automatic relationship updates (user direction, 2026-10-31)

This amendment supersedes r2’s manual-refresh workflow and the corresponding C54/T11 wording. The user explicitly prefers seeing relationship changes without refreshing the display. This records a product requirement, not a delivered live API or S18 execution approval.

- Load an authoritative safe snapshot initially, then update SVG, details and accessible relationship text automatically while the inspected source remains connected. Manual refresh may be an optional recovery control; it cannot be required to see a change.
- Prefer change-driven delivery. S18.A must first settle the real mutation-notification producer, scoped server-to-browser transport, source ownership and connection lifecycle against the delivered APIs. Existing `createInspectionScope().snapshot()` only samples state; opening a stream alone does not make it observable. If this requires core changes outside the current allowlist, amend the producer scope and proof owners before implementation.
- Keep pending topology updates bounded (for example, coalesce to the latest snapshot); do not retain packet payloads or an event history. This is a current topology display, not a promise to replay every transient relationship.
- Show connection/stale status on interruption, reconnect automatically with bounded retry behavior, and obtain a fresh authoritative snapshot after reconnect. Discard obsolete source/connection generations and out-of-order snapshots. Clean up observers, connections and timers on source replacement, navigation and disconnect; do not create an immortal session/run map.
- Extend C54 browser proofs: mutate actual registered dispatcher relationships after initial render without clicking refresh; assert graphic and text both change. Cover once removal, unsubscribe, publisher disposal and new subscription, source switching with late updates, interruption/reconnect resynchronization, and teardown releasing owned resources. Runtime tests must prove the actual notification producer if a new producer is needed.

S17 is merged as PR #26 at `6747624ae9c78c72e2f1654ac817f8409a751c9e`. S18 implementation remains unstarted; the live-delivery interface/design checkpoint above must be resolved before dependent implementation tasks are ready.

## LV2 — Execution design checkpoint, 2026-10-31

User requested continuation after PR #27 merged at `56e1fb155fd26f3bb055cb343f68421771789a89`. S18.A–C are authorized for this feature. Earlier blocked identity/predecessor labels are historical; accepted identity and delivered S17 interfaces are reused.

Producer amendment: extend `src/dispatcher.ts` and a cohesive `src/dispatcher/changes.ts`, with `test/dispatcher-changes.test.js` and declaration consumers, to add `dispatcher.onTopologyChange(listener: () => void): () => void`. It emits no values or initial callback. Successful relationship mutations schedule a coalesced microtask notification after synchronous event behavior; once removal notifies even when the application callback throws. No-op/invalid actions do not notify. Each dispatcher admits at most64 observers; invalid listeners throw TypeError, capacity throws RangeError without registration. Disposers are idempotent; removed observers are skipped, including during notification. A throwing observer is detached and cannot alter dispatcher operations or prevent other observers. Mutations during notification schedule another microtask. Callers subscribe before reading an initial snapshot; scopes themselves remain sampling-only. No competing dispatcher or scheduler is added.

Consumer amendment: allow cohesive `fixtures/next-consumer/lib/inspection-*.ts` and `app/inspector/**`, `app/api/inspection/route.ts`, plus `test/next/inspector*.test.js` and necessary shared test tooling. Use existing node:test/Playwright setup rather than introduce a second runner/lock. Fixed graphs/dispatcher are owned per SSE request, with an initial authoritative snapshot then change-driven full snapshots. One queued frame plus one latest pending frame bounds slow-reader buffering; a60-second demo lease bounds each source lifetime. On request abort/cancel/lease expiry, remove observers, timers and registrations and cancel the owned run. The demo's scripted dispatcher mutations are local and deterministic, not remote application discovery or a session persistence service.

Browser uses one native EventSource with server retry interval1500ms, preserving one connection/retry timer rather than building a queue of retry promises. Open resets sequence state for that connection; strictly newer sequence snapshots only, validated through the existing browser-safe inspection exporter/graph validator. Replacement/disposal invalidates old callbacks; error marks the last display stale, automatic reconnection gets a fresh authoritative snapshot. No replay log is retained. Selection is local to the current inventory; deleted selections clear safely. Schema displays describe contracts; runtime payload validation and bounded attributed verdicts remain backend-owned.

C54/S18 proofs now include observer coalescing/removal/refusals/reentrancy, real SSE initial/change frames and cleanup, production SVG/text/source/keyboard/hostile-label parity, and controlled late/invalid/reconnect client events. S18 owns this minimal notification producer addition because the delivered S03/S12 APIs cannot satisfy LV1 alone. S19 still owns whole-series adoption; editing/export UI remains future work.


Execution tooling clarification: LV2’s necessary shared tooling includes `scripts/next/**`, `scripts/test-next.mjs` and `test/next/coverage-signal.test.js` for actual worker/source-map coverage, plus README/current architecture/master/SP1 updates. The inspection layout helper is within `lib/inspection-*.ts`. [S18 receipt](S18-execution.md) records red/green/gates and the adapted existing node:test/Playwright proof paths; no second browser runner was installed.

CI follow-up allowance: `.github/workflows/ci.yml` changes only the existing failure-evidence uploader to supported v7.0.2/Node24 after the hosted deprecation warning, per the repository dependency policy. Core matrix and Next acceptance commands remain intact. The receipt records the actual failure, raw V8 replay and clean verification.
