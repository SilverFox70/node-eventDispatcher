# S46 — Durable routing

PR #64 merged to master at `2579b30214fd94aab6af8e48d7c2024ad1d1d1b1` after all five checks passed. Its initial Next.js request-count assertion failed and the rerun passed. The user requested S46.

Migration 007 adds a durable route commit ledger, per-edge sequence records and exposed outputs. The pinned graph derives destinations. Broadcast, filter and merge reuse their branded built-in runtime factories, and map uses the bounded function path. Older linear profiles keep their existing outcome path.

- X46.1. Source output shape, contract and lineage are validated before acknowledgement. The compiler determines the target and the database allocates its sequence. A duplicate commit returns the existing state and a changed command is refused.
- X46.2. A process forks work and commits the first branch, then is killed. The replacement completes three jobs through both branches and merges each output once. The output envelopes preserve the source job and immediate parents.
- X46.3. An edge at capacity holds the entire fan-out batch. The persisted batch drains in order without re-executing its source. A stale claim cannot commit. A terminal branch failure fences an already claimed sibling.

Batch admission is atomic, capped at 32 ports per operator, and periodic sweeps consider at most 100 pending batches. Outputs are paged by persisted sequence. The existing external operation continuation remains on the linear profile. See the [package guide](../../../packages/durable/README.md#recover-fan-out-and-merge). S47 owns keyed join recovery.
