# Dependency cleanup after S01

Authority: user asked to fix dependency vulnerabilities, then clarified S01 had merged and unsupported packages should be avoided wherever a practical replacement exists. Base: S01 PR5 merge e82ea08497d9e08f52a35b007d06ac667e9fadae. Branch: codex/remove-legacy-dependencies. Existing uncommitted cleanup was carried onto this base without reset/stash. S02 has not started.

## Changes and compatibility

- Remove request and its vulnerable transitive tree; legacy GET/form POST examples use native fetch. Response bodies remain text even for HTTP errors. Redirects are explicitly refused; transport failures reject promise helpers and emit Error values on completion events. Correct the old POST method-function bug to actual POST. No automatic replay/retry is added by the wrappers.
- Replace deprecated shortid with native randomUUID for diagnostic log keys. Log key format changes to UUIDv4; event interfaces remain unchanged.
- Remove npm fs shim (the caller already used Node's builtin fs); upgrade cli-color to its current published release, exact pin in package.json/lock. Its used color functions are exercised.
- Include all three changed legacy source files in the coverage denominator. Isolate the nested c8 canary's temporary data directory: its inherited parent directory could otherwise clear the outer coverage raw data. This was exposed by adapter coverage and fixed without excluding files.
- Record user policy on supported dependencies and F02 visual authoring/test-load/source-generation roadmap. F02 is not delivered by this change or S18's inspector.

## Evidence

Before: online npm audit reported18 vulnerabilities, including5 critical. After removal/update: online audit reports0 at every severity, exit0. Current dependency/lock state supersedes S01 install receipts; historical baseline is preserved. Tests cover localhost GET, form encoding, non-success status bodies, refused redirects, transport failures, both event completion paths, logger UUIDs, legacy dispatcher behavior and current color functions. No external HTTP examples are run.

Coverage:5 tests pass with100% statements/lines/branches for the three modified legacy files and three TS entry scaffolds. Existing dispatcher missing-unsubscribe failure is characterized, not fixed. Changes to the large historical dispatcher are confined to the native ID allocation; no size-driven rewrite. S02 must preserve applicable proofs, migrate the legacy compatibility shim and update the denominator as it replaces files.

Final check/install/audit/publication evidence follows below. No merge or Next/editor implementation claimed.

Final npm ci, npm run check, npm run coverage, online npm audit, guidance integrity and whitespace checks all exit0. Lock SHA256:bf9c99a9567367299e8e5f4afb613fe457a513ad43d1513594af781f2f862bbd. Current cli-color pin:2.0.4. npm reports an unapproved es5-ext postinstall script; no approval/bypass was added, and installation/tests succeed without it.

Roadmap clarification: user requires durable saved graph definitions, locked/versioned releases and portable project exports, separately from F01 execution recovery. Recorded in F02; roadmap-only, no editor/storage implementation or new verification claim.
