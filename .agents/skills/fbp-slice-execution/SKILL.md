---
name: fbp-slice-execution
description: Execute or resume one saved FBP feature slice in node-eventDispatcher, including approved insertion slices, checking its predecessor, contract readiness and proof handoff. Use for a named slice execution request; not for generic repository edits or permission to implement the whole roadmap.
---

# Execute one FBP slice

Follow the ordered manifest, including approved suffix IDs such as S09A/S09B. Slice identifiers stay stable; they are not numeric execution positions.

Resolve paths relative to this skill's repository, not the caller's home folder. Read [AGENTS.md](../../../AGENTS.md), [the slice index](../../../docs/cursor_plans/fbp-slices/INDEX.md), [SP1](../../../docs/cursor_plans/fbp-slices/shared-execution.md) and the named slice plus existing journal. Follow [the local execution runbook](../../../docs/runbooks/execute-slice.md).

- Confirm the actual branch/HEAD/dirty state, predecessor's real master merge and approved/requested task scope. Reuse an applicable checkout; preserve unrelated work.
- S00 is identity design, not runtime implementation. S04 onward cannot invent the unresolved packet/job/lineage/lookup contract; verify the actual amendment and readiness instead of trusting an old manifest label.
- Work only the selected feature's allowed tasks/files and linked condition proofs. Do tests-first behavioral proof when applicable; use delivered interfaces, not later-slice stubs or a second executor. Record progress/evidence in the slice journal so another agent can resume.
- Stop for a material contract gap using [the amendment procedure](../../../docs/runbooks/change-contract.md), while continuing independent work already authorized. Don't add routine confirmation requests or infer approval from time elapsed.
- Finish with [verification/handoff](../../../docs/runbooks/verify-and-publish.md), separating implementation, proof, gates, coverage and publication. Advance the next slice only from real merge evidence. No commit/push/PR/merge, new chat, subagent launch or global installation is granted by loading this skill; use the user's existing authorization.

For a planning-only or unrelated request, follow its actual scope without activating slice implementation. The instructions remain usable by explicit path even when a client does not automatically discover repository skills.
