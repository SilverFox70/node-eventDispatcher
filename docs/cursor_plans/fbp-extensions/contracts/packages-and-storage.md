# S20 package, workspace and storage boundaries PK1-r1

Status: selected design proposal. User decisions accepted: SQLite documents, PostgreSQL durable execution, local workspace alongside installed consumption. Exact dependency versions and compatibility tests remain owned by their introduction slices. No packages installed or schema applied in S20.

## Packages and imports selected for the plans

| Location | Local package identity | Public surface / owner |
| --- | --- | --- |
| repository root | existing `event-driven-design` | existing root,/model,/testing; S21 adds safe diagnostic model exports here |
| packages/editor | `event-driven-design-editor` | root client UI; `/model` client-safe editor state; S26 owns build/pack/watch/browser proof |
| packages/artifacts | `event-driven-design-artifacts` | `/model` passive formats; root server compiler/export; `/sqlite` server repository; S32–S33 |
| packages/durable | `event-driven-design-durable` | `/model` passive status; root server host; `/postgres` server transaction/store; S39–S40 |

These are concrete workspace/build identifiers, not verified npm name ownership or publication authorization. If actual publication later finds unavailable names, version the import manifest/consumer recipes in one amendment; never silently install a different public package. Remove prior speculative @nodeflow/* imports from execution plans. Core never depends on optional packages. Model imports cannot transitively load SQL, runtime, handlers or Node builtins.

Staging avoids a forward package dependency: S26–S31 editor owns its session-only draft model over core GraphSpec and cannot import the not-yet-created artifact package. S32 introduces portable artifact model and S33–S37 adapt editor persistence/export to it; no reverse artifacts→editor dependency. Core remains at repository root; do not move it into a workspace subfolder merely to match an illustrative consuming-app layout.

Optional editor uses React Flow (`@xyflow/react`) for canvas presentation. Existing inspector stays usable without it; no computing-flows executor. Official [React Flow docs](https://reactflow.dev/learn) and [SSR guidance](https://reactflow.dev/learn/advanced-use/ssr-ssg-configuration) establish available UI integration patterns, not tested Next compatibility for our package. S26 verifies supported versions/peer dependencies/license and production Next client rendering before dependency changes. No exact latest-version claim is made now.

Use pinned repository Node/npm until a separately authorized supported-LTS/toolchain amendment; do not update global defaults. All new deps need supported-maintenance/audit evidence at introduction. Local-only workspace name availability does not justify introducing an unsupported package.

## Workspace arrangement and rebuild semantics

Application source can contain `apps/web`, `packages/nodeflow` (framework core source), optional sibling packages and ordinary application nodes/graphs. Root npm workspaces includes each actual package path; application declares the exact matching local package version under dependencies. Run install once at workspace root; npm links matching workspace package names. Do not use package-manager-specific workspace:* syntax as an assumed npm contract.

Public package exports target built artifacts/declarations, exactly as installed consumers. Initial commands are workspace-root install → core build → optional model/server/client package builds in dependency order → Next build/dev. S24E first implements/proves an owned watch/rebuild command and local code-change observation; there is no unsupported promise that Next picks up any library mutation automatically. If server process restart is required, the command owns that restart and documents it. A clean build cannot depend on an old dist directory.

One intended core instance per host: fixture asserts registry/compiler/test helpers resolve the same local package; no mix of copied private source and published root instance. Root /model and editor client keep runtime/services out of assets. S26 repeats local proof for optional editor; S37 for exported graph source; S51 for durable host/version pins. Packed consumers stay independent acceptance because workspace links can hide omitted tarball files.

These scripts/manifests are future owner deliverables, not changed by S20. Local workspace support is not source vendoring or an excuse for application imports into private framework files. User-owned business nodes/graphs are ordinary source and never need an independently published package.

## Storage adapter choices and evidence

SQLite repository proposal: built-in `node:sqlite` using `Database`/`Statement`, on a dedicated repository worker so synchronous SQL does not block Next request execution. Official [Node26.13 docs](https://nodejs.org/api/sqlite.html) identify node:sqlite as Stability1.2/release candidate and Database operations as synchronous; DatabaseSync/StatementSync are deprecated aliases and must not be introduced. This is maintained native functionality, not a stable-API claim. S33 must revalidate this explicit RC choice against the supported runtime and crash/CAS/backup needs; if it fails, return a supported-driver amendment rather than silently choose a legacy dependency. No application SQL runs on the browser/client.

PostgreSQL host proposal: supported PostgreSQL18 major, `pg` server adapter with exact supported package/patch selected and locked at S40. [PostgreSQL isolation docs](https://www.postgresql.org/docs/18/transaction-iso.html) and [explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html) describe available transactional primitives; they do not prove our schema/fencing. Read Committed plus explicit row locks/CAS/unique constraints is selected for queue/state transitions; transactions retry only safe DB conflicts before any provider call. No external calls inside transaction retry closures.

Artifact repository SQL schema, exact migrations/worker protocol/backup fixtures: S33 design preflight, explicitly blocked until reviewed. Durable schema keys/checks/CAS and ORM/domain transaction integration: S40 preflight, with S39 shared-kernel map and S43 provider policy before claiming durable effects. This is deliberate remaining scope, not a claim S20 wrote or verified full DDL.

User storage engines remain settled. Exact SQL/driver/performance acceptance stays gated and cannot block independent metadata-only S21. No Realberry source or ORM was audited; same-database sample staging in S40 does not establish Realberry integration.
