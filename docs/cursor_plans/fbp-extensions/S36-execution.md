# S36 — Readable TypeScript export

PR #54 (S35) merged into master at `e58449eec60c3fe5313e23d60257944a14abe672` after Linux, macOS, Windows and Next.js CI passed. The user approved S36 on that predecessor. S36 uses the existing portable bundle, server-only artifact package and trusted binding/registry contract. It adds no storage schema.

- X36.1: The export uses static bindings and escaped builder arguments. Tests assert deterministic content and refuse mismatched bindings, unapproved configuration and path traversal before writes.
- X36.2: Packed acceptance installs the real packages into clean CommonJS and ESM consumers, compiles the exported TypeScript with Node module resolution, matches the locked graph and revision ID, and runs the split, parallel async maps and keyed join through the production runtime.
- X36.3: Tests cover source-like strings and special object keys as data, plus an existing export containing an edited file. A second write fails with EXPORT_CONFLICT and leaves the edit intact. The publisher writes only fixed filenames into a new directory under a host-owned root.

The host must review configuration for disclosure and supply the trusted node modules. The manifest hashes the three generated content files; the JSON bundle retains the revision and registry lock. A write interrupted by an I/O error may leave a partial directory. Use a fresh name to retry. S37 remains separate.

Local verification: `npm run check`, `npm run test:artifacts` (13 focused tests, 100% coverage in both export modules, and installed CJS/ESM acceptance), `npm run test:next` (55 tests and coverage gate), `node scripts/check-agent-guidance.mjs`, and `git diff --check` passed. Packed acceptance removes its temporary consumer; the Next harness retained fixture evidence as configured.
