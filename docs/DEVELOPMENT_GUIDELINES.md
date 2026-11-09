# Development guide

## Current checkout

The package exposes the typed dispatcher and FBP runtime. Retained historical utilities live under examples/legacy; only server/src/eventDispatcher.js remains as a compatibility shim. The sole runtime dependency is Zod. Native fetch and node:fs/promises replace historical HTTP/filesystem dependencies. S16 removes obsolete scratch scripts and verifies the public cookbook from installed tarballs.

S01 introduces the following commands (use the exact Node/npm pins in .nvmrc and package.json):

| Command | Meaning |
| --- | --- |
| `npm ci` | Reproduce the locked dependency installation |
| `npm run build` | Generate ESM/CJS JavaScript, declarations and source maps |
| `npm run check` | Build, strict source/declaration-consumer type checks and lint |
| `npm test` | Build and run delivered offline node:test suites |
| `npm run test:next` / `npm run demo:next` | Production packed Next consumer acceptance / manual localhost trial |
| `npm run test:package` | Build, pack/install isolated consumers and run the shipped cookbook |
| `npm run coverage` | Build, run offline tests with all-files source mapping, enforce per-file thresholds |
| `node scripts/check-agent-guidance.mjs` | Validate documentation links and slice ordering |
| `npm run main` | Offline pipeline demo |

The root exports the dispatcher factory, singleton and types, with S03 ownership/publisher inspection. /model exports browser-safe readonly topology types; /testing exports bounded runNode/runGraph helpers using the production compiler/runtime. See [dispatcher migration](architecture/dispatcher.md). The CommonJS compatibility shim remains under server/src; copyable legacy utilities are under examples/legacy. No global runtime change is required; use a version manager or command-local PATH. Exact engine enforcement deliberately refuses an unsupported Node/npm combination. [S01 receipt](cursor_plans/fbp-slices/S01-execution.md) records versions and proof; [baseline](agent-baselines/INDEX.md) records the historical placeholder test and defects.

## Toolchain and package boundaries

Use the pinned Node/npm versions from `.nvmrc` and `package.json`. The root, browser-safe model, Node testing helpers and optional packages have separate entry points. Next fixture dependencies stay out of the core package. See the [current architecture](architecture/README.md) and [durable host runbook](runbooks/operate-durable-host.md).

Use `npm run test:artifacts` and `npm run test:durable` for optional package checks. Build core before running `npm run test:postgres` with `FBP_POSTGRES_TEST_URL`. The durable adoption drill additionally builds artifacts and durable and uses native `pg_dump` and `pg_restore`.

## Implementing changes

Follow [rules](agent-rules/scope-and-handoff.md) and the [execution runbook](runbooks/execute-slice.md). Each feature has one recognizable accepted story and explicit branch/file/proof boundaries. Test wrong behavior at the appropriate boundary; preserve red/green receipts and do not widen types or add a second executor to get a test green.

A source/data-model/interface change requires tracing affected producers and consumers, including JS callers and JSON graphs that bypass TypeScript. Generated artifacts do not justify hand-maintained duplicate declarations. Documentation and metadata edits should receive link/order validation; they do not need fabricated runtime tests.

For a public API or other consequential change, use [the amendment runbook](runbooks/change-contract.md). For final checks or authorized publication, use [verification and publication](runbooks/verify-and-publish.md).


## Human-reasonable implementation

Follow [readability and structure](agent-rules/readability-and-structure.md): aim for ordinary source files around a couple of hundred lines or less, with focused behavior understandable on one screen where practical. Structure folders/files so a human can locate responsibilities, keep shared primitives deliberate and plainly named, and use JSDoc for useful contracts/rationale rather than narration. This is a strong design/review guideline with reasoned exceptions, not a hard size gate or an instruction to fragment/condense code. Every feature's handoff reviews cohesion and newly large files; no extra approval ceremony is required for a sensible exception.

S04 adds public packet/derivePacket factories and FlowError, with internal admission/channel primitives. See [ownership/validation](architecture/packets-and-channels.md); a generic type or internal rich-value test does not enable public custom codecs.

S05 adds contract/jsonContract, defineComponent/describeRegistry and browser-safe catalog helpers. See [authoring/profile boundaries](architecture/contracts-and-components.md); unsupported schema features fail explicitly, and UI payload evaluation remains backend-authoritative. Offline packed tests require the dependency cache populated by npm ci.

The packaged Next.js acceptance suite includes the durable inspector. Set `FBP_POSTGRES_TEST_URL` to a disposable PostgreSQL server with permission to create and drop a test database before running `npm run test:next`. The manual `npm run demo:next` command can start without PostgreSQL.
