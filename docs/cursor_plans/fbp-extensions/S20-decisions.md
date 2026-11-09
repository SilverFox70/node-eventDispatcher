# S20 decisions and release checkpoint SC20-r1

This checkpoint preserves decisions as of S20. For implementation and merge evidence through S51, see the [extension index](INDEX.md).

2026-11-03. User authorized S20.A–C design execution. This selects a concrete proposal for review; it does not claim user preapproval of every new field, merged status, successor implementation, npm publication or deployment.

## Selected design and exact contract owners

| Gate | Selected outcome / canonical owner | Review/readiness disposition |
| --- | --- | --- |
| D1 diagnostics | [DG1-r1](contracts/diagnostics-v1.md): separate metadata stream, exact variants/default bounds, safe errors, task input binding; EX1 unchanged | S21 proposal settled and ready for review; implementation waits for S20 design acceptance/merge and actual execution request |
| D1 configuration | [CG2-r1](contracts/configuration-v2.md): explicit v2 graph/catalog, configured factory, immutable per-instance binding, strict v1 preservation | S25 API proposal selected; later descriptor/builder type fixture gate remains; no v2 source shipped |
| D2 packages | [PK1-r1](contracts/packages-and-storage.md): concrete event-driven-design-* local names, optional dependencies, React Flow UI only, npm workspace+packed consumption | Local identities/direction selected; publication names and exact supported dependency versions not verified; S26 owns compatibility proof |
| D3 storage | User SQLite documents/PostgreSQL host; PK1 chooses native Database worker and pg adapter proposal | Native sqlite is maintained release-candidate API, not stable; revalidation S33; exact schema/driver/migrations blocked until S33.A/S40.A design evidence |
| D4 recovery | [RC1-r1](contracts/recovery-boundaries.md): shared eligible kernel, atomic domain/intent/outcome/continuation, provider uncertainty held, stale SQL fenced | Boundary/crash policy settled; exact adapter/DDL/provider evidence gates explicit in S39.A/S40.A/S43.A/S46.A etc. No qualified durable host claim |
| D5 explanation | [EV1-r1](contracts/evidence-v1.md): declared versus observed decisions, trusted build identity, partial evidence, reviewed offline fixtures and fixed-fact comparisons | Behavior/provenance selected; schema/host review-generator fixtures owned S24A–D.A before their B tasks |

Source trace is [S20 inventory](S20-source-inventory.md). Preserve user-selected workspace and storage choices; do not reopen them merely because implementation has not started. Ordinary names/algorithms remain implementer discretion within these boundaries.

## Precedence and amendment

SC20-r1 and its five linked contracts supersede inconsistent illustrative sketches in EXT1-r2 domain plans. The domain documents remain story/context; no parallel envelope or hash recipe is authoritative. Existing implemented v1 source/contracts remain authoritative for current behavior until the owning implementation merges. Unknown field/version refusal is never bypassed by a cast or UI metadata.

New proposal differences from the earlier draft are intentional: `attempt-started/attempt-finished` distinguish retries; input admission/route sides distinguish graph ingress from component output; task provenance explicitly binds actual delivered packets rather than guesses the most recent one; core events use run identity while inspection source IDs stay separate; flush/dispose results no longer falsely promise completion of noncooperative sink writes. Canonical X21 rows and S21 allowlist include these handoffs.

User direction adopts scope/principles. Status “ready-for-review” means the proposed S21 behavior is settled enough to review, not implementation approved. Remaining future design tasks are explicit blockers, not a universal request for reconfirmation or reason to prevent independent S21 work once accepted/merged/requested.

## G1–G7 design review

- G1: DG1 and CG2 exact fields/refusals/lifecycle/outcome boundaries selected. All old v1 shapes preserved. Future S22 session-policy schema and SQL/codegen adapter details remain named blocked tasks, not S21 hidden choices.
- G2: one compiler/runtime/task kernel; source producer→consumer→proof ownership in inventory. S20 only documentation/guidance; S21 only safe metadata/provenance, not capture/sink/editor.
- G3: X20.1 inventory, X20.2 v1/v2 specimen mapping, X20.3 paused-provider/two-worker walkthrough. Existing graph tests characterize v1; proposed new assertions remain future, not fabricated green tests.
- G4: RC1 traces every commit/invocation/lost-wake/uncertain/stale boundary and why a lease cannot fence an external provider. S20 no SQL/provider effects; source docs cannot prove crash recovery.
- G5: S20 A/B/C bounded to documentation and discovery amendment; future DDL/driver/kernel tasks remain scoped and blocked.
- G6: documentation/link/order/ownership/hash checks; targeted existing graph/function/trace characterization for preservation. New runtime coverage N/A, zero changed production lines. Existing full S19 receipts not relabeled fresh proof.
- G7: next producer/consumer acceptance ownership mapped across installed/workspace/browser/real SQL/process/provider boundaries, with explicit fixture gates before implementation. No stage helper proof substitutes for downstream acceptance.

## Two-executor checks

- S20.A: one executor may mistake destination examples for existing source; inventory names actual graph.ts/builder.ts/testing/index.ts and rejects nonexistent compile.ts paths.
- S20.B: one might add config to v1, infer task parents or reuse EX1 shape. CG2 refuses v1 config; DG1 uses explicit trusted packet binding and separate versioned records; same observable choices required.
- S20.C: one might retry after provider absence or call S20 “durability done.” RC1 holds uncertain intent while the old worker could invoke; journal states design-only proof. No implementation can claim provider exactly-once.

## Next slice

S21 may be reviewed against DG1 now. Branch only after S20 actual master merge and accepted design/explicit execution; preserve predecessor proof. S22–S51 retain their named contract and predecessor gates. S20 does not advance execution to S21 automatically.
