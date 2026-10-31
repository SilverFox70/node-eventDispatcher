# S16 — Install the framework and author/test nodes outside the repo

Contract version: 2  
Slice revision: r2, 2026-10-29  
Readiness: blocked-on-decision  
Execution: not-started; approved task set: none  
Branch: `codex/fbp-16-package-cookbook`  
Parent: master r6 / SC-FBP-4 + proposed IC1-r2 / SP1-r2; acceptance pending.

## Story and branch outcome

A separate JS or TS application can install the tarball, run graphs and copy a complete node-and-test recipe.

This is one feature/task branch, not permission to execute the full roadmap. The three bounded tasks below belong to this one outcome. One agent session is the sizing target; unresolved prerequisites stop execution rather than expand it.

## Provenance, order and entry conditions

Source: master `9cb666dc6c846512d64edd39770b7eb2f213256c`; old JS prototype inspected, new interfaces not yet implemented. This plan is a future change proposal, not a live-source/coverage success claim. Baseline: S01 captures `fbp-pre-modernization-r2`; later slices verify applicability/reuse it. Existing placeholder npm test exit1 is known from planning; no new checks run here.

- Read [execution index](INDEX.md), [shared contract](shared-execution.md), [master plan](../fbp-foundation-plan.md), then this file.
- Previous: [S15 — Prove composed flows and sustained bounded execution](15-reliability-load-plan.md).
- Base: updated `master` after predecessor is actually merged; never an unmerged sibling feature branch.
- Required predecessor evidence: S15 merged into master, with accepted proof and exact merge SHA recorded.
- Next: [S17 — Run a packaged flow inside a Next.js application](17-next-server-consumer-plan.md).
- Readiness gate: IC1-r2 is now concrete and applied to this proposal; execution remains blocked until its human acceptance and actual S00 merge.
- Legacy master work: T10.

## Solution contract and condition ownership

Shared contract: master SC-FBP-4 + [SP1](shared-execution.md); S00 is the only identity-amendment producer. Conditions contributed by this feature: **C28, C29, C30, C40, C45, C50**. Exact fixtures/assertions live in the master's authoritative ledger; final condition completion owners (including split cases) are in SP1. Reuse predecessor assertions rather than inventing a second truth table. C55–C65 are specified by IC1-r2; acceptance remains pending. S00 walkthroughs are not implementation proof.

## Observable behavior and boundaries

1. Pack exact allowlist; JS require/ESM named imports plus TS consumers resolve generated declarations, no src aliases/transpile requirement. Cross-format opaque handles reject INVALID_ARGUMENT; same-format pipeline works.
2. Copy author recipe with fake service into isolated install, run node/graph harness tests; wrong type and bypassed runtime output fail named assertions. Ship documented pipeline/enrichment/external-feed/backpressure/cancel examples.
3. Move retained legacy scanner/examples, fix reject fallthrough and HTTP adapter via fetch/response.ok/signal/localserver. Remove request/fs-shim/cli-color after consumers gone, retain intentional Zod dependency. Add ISC/license and core CI on three OS with latest-LTS pin.

### Exact allowed-change boundary

- `package.json`
- `package-lock.json`
- `LICENSE`
- `.github/workflows/ci.yml`
- `README.md`
- `docs/guide.md`
- `docs/migration.md`
- `docs/architecture/fbp-runtime.md`
- `docs/node-authoring.md`
- `examples/**`
- `templates/**`
- `server/src/{www,wwwPromise,fileLoader,eventNodeMap,example,test,tinytest}.js (move/remove)`
- `test/package.test.js`
- `test/author-recipe.test.js`
- `test/examples.test.js`
- `test/legacy-examples.test.js`
- `test/types/consumer/**`

Also allowed: this slice's future `S16-execution.md`, append-only local workflow telemetry and necessary index/manifest evidence updates. Generated dist/coverage output is local tooling output, not a license for source changes elsewhere. Existing files are read before editing; future paths are intentional proposed destinations.

### Preserve and exclude

- No npm publish/package rename, real provider network requests, Next fixture dependency or committing private plans/logs into tarball.

Preserve every earlier merged feature's assertions, safe browser/server boundary and JSON/admission-versus-generic-transport separation. No network/provider side effects in unit tests; only localhost adapters/fixture where explicitly owned. Do not introduce global registries or retries to hide missing correlation/lifecycle behavior.

## Planned proof pointers

- `test/package.test.js::consumer uses packed package`
- `test/package.test.js::built distributions usable`
- `test/author-recipe.test.js::consumer recipe gives useful feedback`
- `test/examples.test.js::offline examples and HTTP boundary`
- `test/legacy-examples.test.js::scanner errors and side effect free import`

State/setup/order/exact assertions are the cited master condition rows plus Observable behavior above. Proof strength: type fixtures for authoring, real primitive/runtime integration for execution, isolated packed consumers for distribution, production Next/HTTP/browser for UI. Helper-only greens do not prove a downstream layer. No tests exist yet unless delivered by a predecessor.

## Task contracts

### S16.A — establish this feature's contracts and failing proofs

Purpose/references: the story and conditions above. Prerequisites: S15 merged into master, with accepted proof and exact merge SHA recorded; apply the shared identity-release gate when applicable. Read: parent contract sections corresponding to this feature, shared-execution.md and delivered predecessor symbols. Allowed changes: tests/type fixtures listed in the allowlist, minimal interface scaffold needed to reach the intended behavior, and local journal. Required behavior: establish explicit fixtures/order/outcomes from the linked master ledger before production logic. Named proof targets: test/package.test.js::consumer uses packed package; test/package.test.js::built distributions usable; test/author-recipe.test.js::consumer recipe gives useful feedback; test/examples.test.js::offline examples and HTTP boundary; test/legacy-examples.test.js::scanner errors and side effect free import. Preservation: do not duplicate existing cases that already assert the same boundary; extend their tables. Verification/red: Isolated consumer must fail when exports/declarations/source aliases wrong; recipe returns named negative failures; loader missing-file rejects once; HTTP500 and abort explicit. Completion: retain actual expected nonzero exits/assertion pointers and valid setups; missing module/setup error is not behavioral proof. Stop if predecessor interface, identity amendment or contract semantics are missing.

### S16.B — deliver the bounded feature

Prerequisites: S16.A meaningful failures or documented characterization/design exception. Read the same contract, existing callers and test failures. Allowed changes: production/config/docs paths explicitly listed above and only their necessary public export/declaration consumer updates. Required behavior: all numbered items in Observable behavior and boundaries, with side effects owned by this slice. Preserve the Exclusions and shared invariants. Verification: make named fixtures green through actual delivered interfaces, inspect diff for extra functionality and run the focused commands below. Completion: allowed-path diff plus green evidence; passing unit tests alone is not integrated acceptance. Return to planning if scope requires new semantics, unimplemented later-slice API, widened any types or excluded recovery/features.

### S16.C — accept the story and hand off the branch

Prerequisite: S16.B implementation. Allowed changes: focused evidence-driven fixes within the same allowlist, feature documentation, journal and index/manifest status from actual evidence. Verify story via the Acceptance demonstration, scoped commands, declaration/import paths and meaningful-condition audit. Measure applicable changed production files with S01 coverage config; reuse valid outputs and classify failures against the baseline. Completion evidence: Actual tarball/manifest/install receipt and public cookbook; S17 consumes tarball as a normal Next dependency. Record implementation/proof/gates/coverage/publication separately; do not mark merged from a passing local branch. Stop at this branch's outcome. Next slice cannot start until actual merge into master. Publication only with user authorization; planning request has not granted execution.

## Acceptance demonstration and handoff

Recognizable accepted outcome: **A separate JS or TS application can install the tarball, run graphs and copy a complete node-and-test recipe.**

Handoff artifact/interface: Actual tarball/manifest/install receipt and public cookbook; S17 consumes tarball as a normal Next dependency.

Exact verification commands for this scope (S01 creates tooling; later commands assume merged scripts):

```sh
npm ci
npm run check
npm test
npm run coverage
npm run test:package
npm pack --dry-run
```

Commands must return actual individual exits. `npm run coverage` uses the all-delivered-production denominator, including never-executed changed files. Types-only/docs-only scopes are coverage N/A with reason; S00 does not run implementation tests. UI/Figma/DB checks are N/A unless the feature explicitly owns them: S17 production Next boundary, S18 SVG/keyboard/UI, no DB/Figma source in this series. No external publication is part of the acceptance demonstration.

## IC1-r2 amendment and added proof scope

Canonical proposed identity contract: [IC1-r2](../fbp-identity-contract.md). Copy consumer recipes using ctx.packet metadata and packet/derivePacket factories. Publish current declarations with no ctx.key alias or getResult service. Cross-module handle restrictions and privacy/retention boundary unchanged. Human acceptance remains pending; this section settles the proposal, not release authority.

## Readiness evidence

| Gate | Verdict | Concrete artifact pointers |
| --- | --- | --- |
| G1 interfaces | GAP: IC1-r2 acceptance pending | Shared contract + Observable behavior; IC1-r2 freezes proposed interfaces; human acceptance still blocks execution |
| G2 ownership | PASS | Previous/base/next, numbered boundaries, SP1 handoff graph; sole feature branch above |
| G3 proof scenarios | PASS for settled proposed fixtures; acceptance pending | Master condition pointers and named assertions; no invented test result |
| G4 effects/recovery | GAP if identity propagation affects this feature | Master §§6/7/14 + explicit exclusions; no implicit persistence/retry; identity choice held at S00 |
| G5 bounded tasks | PASS | S16.A→B→C (S00 design-specific sequence), exact allowlist and stop rules |
| G6 commands/baseline | PASS as proposal | Focused command block, S01 baseline/tooling owner, SP1 coverage denominator/evidence policy |
| G7 integration | Proposed; release blocked by S00 | Acceptance demonstration + handoff + next-merge condition; parent T labels do not hide owner |

Two-executor counterexample: an executor cannot change the numbered behavior, error/ordering/identity policy, proof level or branch boundary and still claim this plan is satisfied. Equivalent internal algorithms are allowed. Any ambiguity not resolved by parent/SP1 becomes a recorded planning gap, not agent discretion to change behavior. Runtime/tool/merge evidence is gathered during execution; this table does not assert implemented gates passed.

## S16 execution adoption — 2026-10-31

Explicit execution adopts S16.A–C after actual S15 PR24 merge a0b8807bc56023a432aa4def7ea81689858b8aeb. Historical pending identity/readiness prose yields to delivered accepted IC1/runtime/NT1 contracts. No core API or runtime semantic changes, npm publication or package rename.

Private test/package-fixture.cjs shares actual tarball installs across retained and new consumers; test/package-contracts.test.js splits new manifest/format/declaration proofs from the retained package scenarios. Necessary consumer updates include test/legacy-http.test.js relocation/status policy, test/legacy-dispatcher.test.js removal of the deleted color-package smoke check (all dispatcher assertions retained), test/tooling.test.js npm CLI/path portability, and test/authoring.test.js/test/node-template-fixture.cjs portable path/junction setup for the requested three-OS CI. No assertion or source-map denominator is weakened. eslint.config.mjs includes the new CJS fixture; .c8rc.json relocates the retained HTTP denominator and adds scanner/loader modules under examples/legacy, preserving the shim and full src denominator; the C31 disposable canary additionally proves unexecuted .cjs modules stay in that denominator. docs/DEVELOPMENT_GUIDELINES.md, docs/AGENT_FILES.md and docs/architecture/system-boundaries.md receive current-path/command discovery updates. [S16 receipt](S16-execution.md) separates verified local results from configured hosted CI.

Hosted-CI correction,2026-10-31: first matrix run41220193225 exposed missing registry metadata in clean npm caches and a stress-test clock mock retaining every performance.now call. Bounded follow-up includes test/stress.test.js instrumentation setup only (unchanged100000/capacity2 count/sum/backpressure/cleanup assertions) and an additional cold-cache consumer proof. Package fixtures generate a private exact consumer lock from the shipped tarball integrity plus the existing locked dependency closure; npm ci remains offline and installs real package bytes, with no checkout links or registry lookups. No core/runtime limit, test count, coverage threshold or runner heap limit is relaxed.
