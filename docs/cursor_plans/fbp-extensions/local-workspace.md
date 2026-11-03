# Local workspace consumption — EXT1-r2 addendum

User decision, 2026-11-01: support consuming Nodeflow as a local workspace package inside the application repository, alongside the installed-package path. This accepts the consumption target; implementation/tooling changes are not started by this documentation update.

## Arrangement

Illustrative application repository:

```text
project/
  apps/web/              Next.js application
  packages/nodeflow/     framework source, package manifest and build
  nodes/                 application-owned node implementations
  graphs/                application-owned graph definitions
```

Folder names are illustrative. Applications can keep nodes/graphs under their own source directory instead. Import Nodeflow by its public package name/exports through a local workspace dependency; no npm publication or tarball installation is required for the local development loop. A package boundary is retained even when source lives in the same repository.

Initial supported target: npm workspaces using the repository-supported Node/npm versions and ordinary local package-name resolution. Do not assume another package manager’s `workspace:` protocol is accepted by npm. The owning implementation slice must supply a tested concrete workspace manifest/lockfile, dependency declaration and application scripts. Other package managers remain unclaimed until verified.

Build library exports before the application consumes them. Supply an owned watch/rebuild workflow that propagates framework changes into the Next development process; do not promise immediate updates merely because folders are linked. Restart requirements must be explicit if a particular server change cannot hot reload. Clean production build must establish correct dependency order and fresh artifacts without a manually prepared dist folder.

Keep server/runtime and browser model/client entries separated. Resolve one intended local core instance and compatible optional packages; no accidental second registry/runtime identity caused by mixed local and published copies. Dependencies remain declared in their owning package and reproduced by the workspace lockfile. Local code uses the same public exports, contracts and tests as published consumers.

Application business nodes/graphs stay ordinary editable project source. Readable exported graph TypeScript also belongs to the application. Direct source copying into a Next app and arbitrary imports from framework private source files are not the supported workspace arrangement; they require a separate explicit contract if later needed.

## Proof ownership without new slices

- **S24E / X24E.2:** first useful Next application runs both as an isolated installed consumer and as a local npm workspace consumer. Fresh checkout/install/build/run uses public imports without publication; edit one framework behavior, rebuild/watch and observe the expected changed fixture result. Application nodes remain local source.
- **S26 / X26.2:** optional editor resolves through a local workspace too, preserving client/server boundaries and one intended core instance; retain the independent packed-consumer proof.
- **S37 / X37.2:** exported TS/JSON works with local workspace runtime/registry bindings and installed packages; same fixture outputs and failure categories. Changed local implementation invalidates pinned code digests/receipts rather than masquerading as the old revision.
- **S51 / X51.2:** optional durable host can be composed locally while retaining code/schema pins and core-only dependency isolation. Local rebuild never silently changes code for an already-pinned running workflow.

Each owning slice introduces the exact executable setup/commands and extends existing acceptance fixtures; no workspace scripts are claimed available today. These additions are part of the existing canonical condition rows, not a second condition ledger. No new slice IDs or branch order change.

Installed tarball tests remain required: workspace links alone can hide missing package files or accidental private imports. Conversely, a packed-consumer pass does not prove local rebuild/watch behavior. Both paths serve different useful development and distribution boundaries.
