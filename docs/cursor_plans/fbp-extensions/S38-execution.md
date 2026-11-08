# S38 — Version-pinned subflows

PR #56 merged to master at `3a9eb7dd6edc2c1f2ce86cc6aec49edd306d33a6` after the Next.js locator correction and all four required checks passed. The user approved S38 on that predecessor.

The server artifact API accepts a composition with a graph and named instance references. A host supplies the trusted registry and resolves exact bundles. Nested children also supply the original composition, which must expand to the same locked graph. This uses the existing graph, bundle and SQLite formats. The parent owner retains the nested composition alongside the lock and tests any configuration override as part of the parent.

- X38.1. `subflows.test.js` checks deterministic physical IDs and exact exposed descriptors, missing or substituted revisions, and the seventeenth nesting level. Installed TypeScript declarations exercise the composition and origin map signatures.
- X38.2. A real SQLite worker issues a fixture receipt and locks the source graph. The normal compiler/runtime run two instances of that locked child, yield 3 and 6 from matching inputs, and expose diagnostic IDs that resolve to the correct instance path and child node.
- X38.3. The expander refuses recursive references, expansion limits and mismatched bindings before any process factory. The ordinary compiler rejects flattened wiring cycles. A new child revision with identical wiring gets a different physical ID, while a pinned parent remains unchanged. Dropped or inconsistent nested provenance is refused.

The new acceptance uses actual installed packages and closes its repository in a finally block. The runtime and editor still use the existing flat graph. The visual editor has no subflow editing controls in this slice. S39 remains separate.

Local verification passed with `npm run check`, `npm run test:artifacts` (19 tests, all artifact files at 100% on the reported coverage metrics, plus installed declarations and runtime checks), and guidance and diff checks. The Next browser suite runs on the review PR.
