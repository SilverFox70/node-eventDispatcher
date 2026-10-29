# Maintain repository guidance

When adding/changing rules, runbooks, architecture, plans or skills:

1. Choose one owner. Root AGENTS routes; docs/agent-rules owns policy; architecture owns status/boundaries/accepted ADRs; runbooks own procedures; local SKILL.md routes a focused task. Avoid copying identical rules into every tool's configuration.
2. Preserve scope/authority. Clearly separate current implementation, user direction, proposed design and accepted decision. Update changed phase facts after real feature merge; don't turn all future ideas into mandatory current work.
3. Update [the map](../AGENT_FILES.md) and local links. If slice order/readiness changes, update INDEX, manifest, affected previous/next plans, SP1 owners and journals/receipts consistently. Preserve historical master revisions/ADRs.
4. For a skill, use concise name/description with a narrow trigger, read only task-relevant references, and link canonical repository documents instead of personal absolute paths. Automatic loading is client-dependent; manual path invocation must remain understandable. Don't create a global/home skill installation as a side effect.
5. Run `node scripts/check-agent-guidance.mjs`. It checks local Markdown links across guidance/plans and the slice manifest/order/index/task/condition-owner references. It does not prove semantic contract consistency, client skill discovery or feature correctness.
6. Validate changed SKILL.md frontmatter with an available skill validator; if missing, disclose the validation limit instead of claiming success. Review one realistic allowed task and one excluded/missing-prerequisite task against the instructions. No need to launch subagents or external actions for a small local skill.

Doc changes do not need runtime tests that just mirror wording. If changing the integrity script, verify it accepts valid repository structure and actually rejects a broken link/manifest in temporary fixtures; use no network and do not alter user files to simulate failures.
