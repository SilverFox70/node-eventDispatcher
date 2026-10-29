# Module and contract rules

These are constraints for implementing the proposed FBP design, not claims those modules exist today. Exact product behavior remains the approved master/identity/ADR revision for the task.

- Keep one production graph validator/compiler and one execution runtime. Typed builder, function helper, test harness, inspector and future visual editor consume those interfaces; none implements a competing interpreter.
- Separate packet identity, payload representation/ownership and channel ordering. Initial public admission is JSON-only, while packet/contract/channel generics leave room for future values. FIFO is per connection, not a global job-completion order. S00 must settle job/packet/lineage/key/lookup semantics before dependent implementation.
- Named ports have typed and runtime-validated contracts. A schema/representation ID must have one meaning. Type checking does not prove JS or JSON input safety; validate real ingress and output before effects/delivery. Do not use any/coercion/fallback schemas to hide mismatched contracts.
- Keep browser-safe graph/catalog/inspection metadata independent of Node runtime, executable registry, handlers, credentials and testing code. The server registry is authoritative; serialized metadata cannot grant execution authority.
- Graphs/dispatchers are explicitly registered for inspection. Distinguish defined wiring, declared publishers and active subscriptions. No implicit source discovery or leaked function source/payloads in diagrams.
- Queues/processes/inspection scopes are owned, bounded and per-run/per-scope. Endpoints and observers cannot grow unbounded hidden promise or logging queues. Preserve close/drain versus abort/discard and first-terminal semantics of the approved contract.
- Rich payloads, cycles, persistence and agent-driven application generation are extension goals, not enabled merely by a cast or flag. Add validation/ownership/lifecycle/effect/proof contracts before enabling a new profile.
- Follow [human-reasonable code and structure](readability-and-structure.md): cohesive small modules, clear folder responsibilities, deliberate shared utilities and useful JSDoc; size targets never justify duplicated policies, hidden logic or a second executor.

Read [system boundaries](../architecture/system-boundaries.md) and [decision status](../architecture/decision-register.md); use [contract amendment](../runbooks/change-contract.md) for a material change.
