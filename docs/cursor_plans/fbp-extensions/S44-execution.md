# S44 — Evidence-backed external reconciliation

PR #62 merged to master at `6b599892bd5ea1a6b0b9074ea25c1b3c2f148345` after all five required checks passed. The user requested S44. Migration 005 adds operation revisions, review scheduling fields and a scoped audit log.

- X44.1. The pinned provider adapter authorizes each actor and supplies evidence bound to the exact operation, business key, resource revision, fingerprint and policy version. Mismatched or malformed evidence, including a result rejected by the pinned output contract, is refused and audited.
- X44.2. A controlled HTTP provider reports its original accepted result after response loss. PostgreSQL writes the operation result, derived packet, step outcome, successor, wake and accepted audit together. The successor retains the original input as its immediate parent. An inconclusive lookup records a reason and review time.
- X44.3. A paused original permit can still send after expiry. An absent lookup keeps it held and grants no second permit. Unauthorized actors, stale revisions, conflicting evidence and duplicate resolution refuse. A concurrent race advances the linked step once.

The host implements provider-specific evidence validation. This slice uses the conservative reconciliation-required policy. Safe replay needs a separately verified provider contract. For a shared operation, each linked step advances through its own authorized command. See the [package guide](../../../packages/durable/README.md#reconcile-an-external-outcome). S45 owns persisted time policy.

Local verification passed with repository build and type checks, final lint, all 20 PostgreSQL tests and coverage thresholds, the installed provider suite, durable profile tests, and guidance and diff checks.
