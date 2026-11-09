# Agent entry point

NodeDispatcher is a typed flow-based programming library with optional editor, artifact and PostgreSQL durable-host packages. The current numbered roadmap is merged through S51. Read the source and the task before changing a contract.

## Start here

1. Read [the documentation map](docs/AGENT_FILES.md) and [current architecture/status](docs/architecture/README.md).
2. For slice work, read the applicable [foundation index](docs/cursor_plans/fbp-slices/INDEX.md) or [extension index](docs/cursor_plans/fbp-extensions/INDEX.md), [SP1](docs/cursor_plans/fbp-slices/shared-execution.md), the selected slice and its predecessor evidence. For other work, follow the user's actual scope; do not force it through a slice workflow.
3. Read [scope/handoff rules](docs/agent-rules/scope-and-handoff.md), [module/contract rules](docs/agent-rules/modules-and-contracts.md), [verification rules](docs/agent-rules/verification.md) and [human-readable code/structure rules](docs/agent-rules/readability-and-structure.md). Load only relevant architecture details/runbooks thereafter.

## Authority and working state

- User instructions govern the authorized scope. Repository rules establish engineering conventions; proposed plans/ADRs are not accepted product decisions or execution approval.
- Use the [decision register](docs/architecture/decision-register.md) to distinguish user direction, proposed architecture and unresolved interfaces. The packet/job identity amendment belongs to S00; do not implement a guessed contract.
- The [foundation manifest](docs/cursor_plans/fbp-slices/manifest.json) preserves planning history. The [extension manifest](docs/cursor_plans/fbp-extensions/manifest.json) records extension order and verified merges. Use the owning journal and default-branch evidence for completion. Never mark merged from local test success.
- Preserve user changes, local logs and historical plan revisions. Feature implementation uses the selected slice branch, not master. Reuse an appropriate current branch/worktree; do not reset/stash unrelated work.
- Current request/previous authorization determines commit, push, PR, merge, deployment and external-message scope. Do not request permission again when already authorized. Ordinary reversible edits/tests inside scope do not require extra confirmation.

## Commands and phase awareness

Read package.json and the [development guide](docs/DEVELOPMENT_GUIDELINES.md) before running commands. `npm test` builds and runs the core tests. `npm run main` runs an offline example. `npm run test:next` and `npm run test:postgres` require disposable PostgreSQL. The manual `npm run demo:next` can start without it.

The guidance integrity check is available independently:

```sh
node scripts/check-agent-guidance.mjs
```

For feature tests, use the owning slice's actual commands and current config. Distinguish failed, not-run and unavailable. Preserve evidence sufficient for another agent to resume.

## Navigation

- [Plan and review a feature](docs/runbooks/plan-and-review.md)
- [Execute one slice](docs/runbooks/execute-slice.md)
- [Change a contract or decision](docs/runbooks/change-contract.md)
- [Verify, hand off and publish](docs/runbooks/verify-and-publish.md)
- [Maintain these instructions](docs/runbooks/maintain-guidance.md)
- Repository skill: `.agents/skills/fbp-slice-execution/SKILL.md`; see the map for discovery/portability limitations.

No subagent delegation, new chat creation, agent framework or global machine configuration is required by these instructions.
