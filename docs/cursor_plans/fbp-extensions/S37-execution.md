# S37 — Artifact adoption acceptance

PR #55 merged to master at `e3d7115629ff7555b3f2c337ee7069c0174a5bfb` after the three core platform checks and packaged Next.js check passed. The user approved S37 on that predecessor. The slice exercises existing APIs and storage formats.

- X37.1. The sample receiving host checks the export file hashes, receipt, runtime package version, node implementation bytes, contract descriptor, and trusted static bindings. The fixture refuses changed node implementation, contract or runtime versions with `BINDING_MISMATCH` before running the exported graph.
- X37.2. The demo uses the editor's document command model to author and configure a graph, saves it in SQLite, tests it with the production fixture runner and locks the result. A fresh installed project compiles the generated TypeScript and compiles the portable JSON with the same pinned registry. Both forms reproduce the receipt's fixture output and reject invalid input with `INPUT_CONTRACT`. The same project runs again with a source-built npm workspace core. The consuming process has SQLite disabled and the editor package is absent.
- X37.3. After locking, the author saves a distinct newer draft, closes its repository and copies the database. A separate process opens the copy and verifies the newer draft alongside the original locked graph, layout and receipt. The same proof passes after the consumer rejects changed pins.

The authoring demo drives the editor model in code. Its runtime version and digest policy are an example of host-managed adoption checks. The packed harness removes its temporary authoring and production directories. For usage and recovery, see the [adoption demo](../../../examples/adoption/README.md) and [storage guide](../../artifact-storage.md). S38 owns version-pinned subflows.

Local verification passed: repository build, typecheck and lint via `npm run check`, all 13 artifact tests and coverage thresholds via `npm run test:artifacts`, the installed and workspace acceptance, and guidance and diff checks. Artifact source coverage was 100% across all four metrics.
