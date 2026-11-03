# Diagnostic extension overview — EXT1-r2 / SC20-r1

Owners S21–S24. The canonical selected design is now [DG1-r1](contracts/diagnostics-v1.md), from [S20 review checkpoint](S20-decisions.md). It supersedes the earlier illustrative envelope/session/sink signatures. Existing EX1/Snapshot APIs remain unchanged until owning implementation merges.

- S21: safe metadata/error/operation/attempt stream, trusted explicit packet input correlation and default bounded retention. No payload capture or sinks yet.
- S22: per-node/port/job input/output policy and an expiring owned session; host authorization/deny wins, no run restart.
- S23: bounded sink/export/flush/dispose with visible losses; observer failure never becomes business retry.
- S24: installed Next controls/dialogs, actual node input/output/errors and owned live updates.

S24A–S24B then add declared decisions and causal evidence under [EV1](contracts/evidence-v1.md) and [the explainability story](explainability.md). Retention gaps and uncaptured fields remain explicit; no automatic full-history reconstruction or arbitrary-code reasoning claim.

[X21.1–X24.3](conditions.md) remain the single assertion ledger. New records use run identity; inspection source associations stay separate. Task-scoped records distinguish retries and actual observed outcome from late physical settlement. Legacy tasks without explicit input binding are labeled node-scoped, never assigned a guessed packet.
