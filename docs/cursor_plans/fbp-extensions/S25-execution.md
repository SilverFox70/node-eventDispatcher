# S25 execution receipt

The user authorized S25.A–C on 2026-11-06. Branch `codex/fbp-25-configured-graph-contract` starts at `b492eff655bbc81bf5517f49eb0b45f072f22014`, the verified S24F merge from PR #42. Existing unrelated untracked files were excluded.

CG2-r1 governs the work. D1 selects strict v1/v2 compatibility and backend configuration authority. D2 permits local package consumption. S25 uses the existing package boundaries and dependencies. S26 owns the concrete canvas/package compatibility check.

The S24F checkpoint shows equivalent outputs and effects against the TypeScript implementation. The proof includes explaining a seeded missing result, testing a node in isolation and exporting a regression from application evidence. Independent developer usability remains unverified. The checkpoint permits S25 on that evidence.

## Condition evidence

- X25.1 uses `test/configured-graph.test.js`. Before implementation the focused unconfigured v2 case reached the real compiler and failed with `false !== true`. The same suite preserves unconfigured v1 and asserts exact refusal paths for malformed versions and missing or invalid bindings.
- X25.2 runs two instances of the same component with different frozen bindings through the production runtime, then reruns the compiled handle and exercises `runNode`. It also exercises v2 inspection and Mermaid. Packed type fixtures retain port and configuration types.
- X25.3 submits raw JSON with a bad configuration alongside a valid sibling. Stale passive catalog validation succeeds, but the compiler refuses at the bad node with no factory calls. Packed ESM and CJS exercise the configured builder, compiler, catalog and testing entry points.

## Local verification

Node 26.13.0 and npm 11.20.0. Build, typecheck, lint and guidance passed. The focused graph/catalog suite passed 25/25. The complete core coverage run passed 305/305, including isolated package consumers and the stress fixtures. The unchanged per-file threshold passed, with 100% statements, lines and branches in the component definition, builder, compiler, graph/catalog models and isolated node runner. Core log: `/tmp/fbp-s25-coverage-final.log`.

The existing inspection path retains the v2 spec and catalog, and Mermaid renders the topology. The authoring UI and its configuration editor belong to subsequent slices. The production Next.js regression run and publication are pending.
