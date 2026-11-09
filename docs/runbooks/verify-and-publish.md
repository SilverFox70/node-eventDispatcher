# Verify, hand off and publish

## Select checks for the delivered phase

Inspect package.json/config and the [development guide](../DEVELOPMENT_GUIDELINES.md). Core build, test, lint and coverage run without PostgreSQL. The packaged Next acceptance, durable integration and native adoption drill use disposable PostgreSQL. Documentation verification uses `node scripts/check-agent-guidance.mjs`. Match each check to the changed boundary and report its actual result.

Use scoped behavioral checks during iteration and applicable full gates before authorized publication. Prove public types from generated declarations, runtime behavior through real compiler/channels/processes, package behavior from isolated tarball install, and server/client behavior from production fixture builds. Reuse outputs only when candidate/dirty scope, ancestry, config/tool/runtime/lock and checked boundary remain applicable. No blanket repeated suite list when nothing changed.

Coverage acceptance follows [verification rules](../agent-rules/verification.md) and actual S01 configuration. Reconcile meaningful conditions and instrumented source denominator separately. Keep evidence for unexecuted files, uncovered regions/exceptions and exact assertions. New failures must be classified, including familiar messages at new sites. A known failure is still failed, not a green gate.

## Human-readability review

Inspect the changed module tree and entry points as a human reader would. Apply [readability rules](../agent-rules/readability-and-structure.md): small cohesive units, clear hierarchy/dependency direction, deliberate shared primitives, plain control flow and JSDoc for non-obvious contracts. Note a justified larger-file exception in the handoff/PR rather than inventing a hard length gate. Preserve assertions/type/behavior evidence when extracting modules; update their owned paths.

## Required receipt

Each receipt records candidate/dirty scope, cwd/command, tool/config/lock identities, condition/test/assertion, expected and actual result/exit, retained output path and source-restoration check if a deliberate bypass was used. Local-only evidence is labeled; do not commit payloads/secrets/log dumps. A quality check that ran and failed is not unavailable. Check retained outputs exist before handoff.

Report independently:

| Dimension | Example states |
| --- | --- |
| Implementation | complete / partial / blocked, with task/diff scope |
| Behavioral proof | verified / partial / blocked / N/A, with assertion pointers |
| Quality gates | passed / failed-known / failed-introduced / failed-unclassified / not-run / unavailable |
| Coverage | passed / evidenced exception / failed / unverified / N/A |
| Publication | not-requested / ready / blocked / published, with actual commits/remote evidence |

## Authorized publication

Use the user's existing scope for commit/push/PR/merge/deploy; don't ask again when authorized. Before mutation, inspect staged files/diff, repository/remote/branch identity, applicability of hooks/gates and user dirty work. Plans/skills/rules changes do not authorize unrelated implementation or global installations. Preserve local .DS_Store/feedback unless specifically included.

Do not bypass hooks, force-push/reset or relax verification to get a publication through. If blocked, report the exact failure and smallest safe remedy; do independent work within scope. After a successful requested merge/push, verify actual default-branch SHA/ancestry before changing index/manifest progress. Branch green is not merged; approved design is not completed code.
