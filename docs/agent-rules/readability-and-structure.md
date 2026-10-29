# Human-reasonable code and structure

Authority: explicit user development direction, 2026-10-29. Applies to implementation planning, source/test design, review and maintenance. Small files are a means to understanding, not a numeric contest.

## Cohesion and file size

Aim for ordinary hand-written source files to stay around a couple of hundred lines or less. Ideally a focused unit of behavior can be understood on one screen. These are readability goals, not a hard 200-line limit, an automated merge gate or a reason to compress formatting. Functions, types and files should each have a clear responsibility.

When a file grows beyond roughly200 lines, inspect whether it holds multiple concepts and whether a named cohesive extraction would improve understanding. Keep an exception when one readable unit is clearer together: explain the concrete reason in the slice handoff/PR. A brief reason is enough; no separate waiver or routine human approval is required. Don't split a coherent state transition or contract just to satisfy a counter, hide work behind re-exports, or trade one understandable file for dozens of one-line wrappers.

The exception principle also applies to tests, reference ledgers, generated declarations and historical documents. Prefer focused scenarios/fixtures and good navigation; preserve valuable context and immutable history. Do not rewrite legacy/generated files solely to lower counts outside the active feature scope.

## Structure should explain the system

A developer should be able to identify responsibilities and likely change locations from folder/file names before opening code. Organize around cohesive capabilities/layers already owned by the architecture: packet, contract, graph, runtime, components, inspection and testing. Choose modest hierarchy depth; avoid both flat file dumping and a maze of nested implementation folders. A directory needs a meaningful responsibility, not an arbitrary size bucket.

For example, runtime.ts may remain the public entry while runtime/ contains clearly named execution-state, input-admission and termination modules once those responsibilities warrant separate files. This is illustrative organization, not a mandatory scaffold or permission for three competing runtimes. Preserve one owner for orchestration and effects across the internal modules.

## Shared code and utilities

Keep small helpers near their consumers by default. Extract shared library behavior when it has a clear contract and a demonstrated common responsibility/callers, or an explicit architectural boundary; give it a name that says what it does. One caller can justify a separate module when it improves cohesion, but does not justify a generic framework of hypothetical future reuse.

Avoid miscellaneous utils/helpers/common dumping grounds, hidden global state, duplicate domain rules and circular imports. Share a truly identical primitive without combining callers whose authorization/error/lifetime policies differ. Public barrels expose deliberate APIs; private implementation helpers stay private. An extraction must make the caller and dependency direction easier to follow, not just shorten the caller's line count.

## Plain code and selective JSDoc

Use concrete domain names, direct control flow and explicit inputs/results/dependencies. Prefer small readable steps over clever expressions, heavy indirection, unexplained abbreviations or compressed lines. Types express shape; code should explain the normal behavior without a narrated comment on every line.

Use JSDoc where it adds information: public API purpose, units, ownership/lifetime, ordering, effect guarantees, cancellation, refusal/error semantics, or a useful example. Explain why an unusual guard/algorithm exists and any non-obvious invariant that must survive refactoring. Do not repeat a TypeScript signature or paraphrase every assignment. If normal logic needs line-by-line explanation, first improve its names, structure or abstraction; keep genuinely necessary rationale after that refactor.

## Review and handoff

Planning identifies cohesive modules and shared primitives; it does not predetermine every helper file. Review asks whether a human can follow folder responsibilities, entry points, data flow and failures without excessive jumping. Inspect newly large/complex files and record useful extractions or a reason to keep them together. Preserve behavioral/type/condition proofs when reorganizing, update changed assertion paths and run affected checks. Line counts alone neither establish quality nor block a sound implementation.

Canonical architecture and slice boundaries still govern semantics. The [shared slice contract](../cursor_plans/fbp-slices/shared-execution.md) explains how cohesive internal modules fit a slice allowlist; no later feature or new public interface is authorized by splitting files.
