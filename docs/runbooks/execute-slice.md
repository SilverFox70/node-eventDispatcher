# Execute or resume one FBP slice

Use when the user requests a named slice or continuation. This procedure is not a command to launch work merely because a plan exists.

## Resolve scope and prerequisites

Read [INDEX](../cursor_plans/fbp-slices/INDEX.md), [manifest](../cursor_plans/fbp-slices/manifest.json), [SP1](../cursor_plans/fbp-slices/shared-execution.md), the selected plan and any existing journal. Verify actual checkout/status/HEAD, relevant guidance and baseline applicability. Current source may have advanced beyond the planning anchor.

Confirm its predecessor is accepted and merged into default master with an actual commit/merge SHA and applicable proof. Do not use an unmerged predecessor feature branch as base under SP1. Reuse a suitable existing branch/worktree; preserve unrelated changes. The proposed branch name is recorded by the slice; no new naming invention required.

Check readiness independently of execution authorization. S00 is a concrete identity-design deliverable; S01–S03 can be reviewed independently; S04 onward must not invent the pending identity contract. If blocked, name the actual missing artifact/decision and do already-authorized independent work. No repeated permission request for normal approved task mechanics.

## Execute bounded tasks

Create/resume the slice journal from [the template](templates/slice-execution.md). Record approved/requested revision/task set and actual scope; use explicit unavailable/not-run states for missing evidence. Read actual source consumers before changes.

For each task: establish meaningful expected behavior and red/characterization proof, implement only allowed paths/API, verify through the assigned layer, inspect diff, then update journal. Use inherited condition IDs and named assertion pointers; do not build a new competing truth table. New interfaces need behavioral red once scaffold exists, not just missing-module errors. Check upstream helper/interface availability on the actual base.

If work requires a new public behavior, excluded feature or another whole slice, apply [contract amendment](change-contract.md). A failing prerequisite is not permission to absorb the roadmap. Save a resumable partial state rather than invent success.

## Handoff the story

Use [verification/handoff](verify-and-publish.md). Include the recognizable outcome, implementation/proof/gate/coverage/publication states, candidate/dirty scope, evidence links, remaining limitations and next action. Stop at current slice completion unless the user authorized further slices. Record actual merge status before advancing next-slice pointer. Do not overwrite predecessor evidence or claim local completion means merged.
