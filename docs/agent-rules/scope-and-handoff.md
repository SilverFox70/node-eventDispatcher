# Scope, order and handoff rules

- Execute the user's actual request. A planning/setup request does not start every implementation slice. A request to execute one slice authorizes that slice's necessary reversible work without repeated routine approval.
- For the FBP series, use the [index](../cursor_plans/fbp-slices/INDEX.md) and [manifest](../cursor_plans/fbp-slices/manifest.json). Default order is sequential; verify predecessor merged into master before the next branch. A green unmerged feature is not a valid next base. An explicit user amendment can change this policy; record the new dependency/proof impact.
- Keep one branch to one accepted story, with its bounded tasks. No catch-all cleanup or later-slice implementation. Equivalent algorithms are agent discretion; changed public/error/identity/effect behavior is a contract amendment.
- Preserve user files and previous evidence. Do not reset/stash the active checkout to create a baseline. Read status/HEAD and reuse an applicable branch/worktree.
- Record meaningful progress in the slice journal: task state, contract revision, exact commands/assertions, candidate/dirty scope, results, remaining gaps and next action. Reference the master condition ledger and actual predecessor receipt instead of duplicating a second matrix.
- Report implementation, behavioral proof, quality/coverage and publication separately. Never claim completed/approved/merged from plan prose or elapsed time.
- If a prerequisite or contract is wrong, identify the smallest affected task and amendment. Continue independent work already authorized; don't quietly change the rest of the roadmap.
- Commit/push/PR/merge/deploy/message only within existing authorization. Honor hooks and branch protections. No forced reset/push or hook bypass to hide a failed proof.

Detailed branch mechanics and ownership: [SP1](../cursor_plans/fbp-slices/shared-execution.md). Resuming and final handoff: [execute](../runbooks/execute-slice.md) and [verify](../runbooks/verify-and-publish.md).
