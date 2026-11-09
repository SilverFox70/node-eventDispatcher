# S39 — Durable task profile

PR #57 merged to master at `91e94027b68682a2c70ce71fc8a9b1fbd4b84188` after Ubuntu, macOS, Windows and Next.js CI passed. The user approved S39 on that predecessor. D4 allows the bounded pure task profile and requires separate proof before external effect or state adapters. PostgreSQL remains the accepted engine for the later host.

The optional ESM package publishes a server profile API and a passive pin reader. The core bridge uses one compiled graph definition and ordinary single-node projections. The finite invocation loop moved from the testing SDK to runtime, and the testing export retains its prior signature. Both paths still use `createTasks`, `taskAttempt`, `validateValue`, and `derivePacket`. A configured function shares the ordinary function operation loop and the existing graph configuration validation.

- X39.1. An explicit version 1 pure registration with matching implementation evidence admits the bounded function. An ordinary streaming factory is refused even with a purported pure registration and the entry counter remains zero. A pure function without configured retries runs once.
- X39.2. The profile and in-memory graph use identical packet input and validated configuration. Their output payload, immediate parents, job/key, contract failures, and retry counts match. The adapter records invocation-local attempts and a computed packet. No SQL scheduler or durable outcome is involved.
- X39.3. Resume requires the stored execution and adapter digests. Changed implementation, observed port contract, runtime version, missing registry binding, or unsupported adapter refuses with `VERSION_UNAVAILABLE` and zero replacement calls. Explicit recomputation uses fresh attempt/run/packet IDs and preserves the input job, key, and parent.

Host review supplies the pure assertion and implementation digest. The pin reader imports only core model data. Persisted attempt accounting, claim fencing, and outcome commitment remain host work for subsequent slices. The [package guide](../../../packages/durable/README.md) describes the usage and bounds.

Local verification passed with `npm run check`, final lint and type checks, `npm run coverage` (310 tests and all per-file gates), `npm run test:durable` (3 focused tests and 100% reported package coverage), installed runtime and declarations, guidance, and diff checks. Next browser CI runs on the review PR.
