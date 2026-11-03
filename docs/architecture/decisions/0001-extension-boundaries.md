# ADR0001 — Explainable extension boundaries

Status: proposed for review; design work complete under S20 request, not silently accepted architecture. Date:2026-11-03. Supersedes illustrative extension sketches only, not implemented v1 APIs.

## Context

Foundation S19 merged. User requested per-node diagnostics, Node-RED-style authoring, saved/exportable graphs, optional durability, explainability-first application proof and local workspace consumption. SQLite documents/PostgreSQL durable host are explicit user choices. Current strict v1 config/factory/trace interfaces cannot be assumed to implement those features.

## Chosen proposal

[SC20-r1 decision checkpoint](../../cursor_plans/fbp-extensions/S20-decisions.md) owns exact selected contract links: DG1 diagnostic records/provenance, CG2 configured graphs, PK1 optional packages/workspace/storage, RC1 recovery/effect boundary, EV1 causal evidence/fixtures/comparison. Do not duplicate their schemas here.

Add rich capabilities through those boundaries while preserving a lightweight core, public imports and one compiler/shared task semantics. Generic operations remain node-scoped unless explicitly bound to actual delivered packets. Saved documents are not persisted executions. Provider uncertainty requires evidence, not a new local ID advertised as idempotency.

Alternatives declined: silently extend strict v1; serialize closures; use latest-input guesses as packet ancestry; let logging failure drive business retries; treat lease expiry as provider fencing; distribute code only through registry publication; copy private framework sources into each app. They lose compatibility, provenance or recovery correctness.

## Consumers and proof

[Source inventory](../../cursor_plans/fbp-extensions/S20-source-inventory.md) traces current owners; [condition ledger](../../cursor_plans/fbp-extensions/conditions.md) keeps one assertion owner. S21 proposal is settled for review. Later driver/schema/kernel/provider/codegen compatibility remain named design gates; no future feature is marked implemented.

## Authority and release

User S20 execution authorizes design work, branch and existing review-submission workflow. Explicit earlier product choices remain accepted; this new exact API proposal awaits design review/merge. No S21 implementation, automatic merge, npm publish, deployment or Realberry mutation authorized here. Actual receipt: [S20 journal](../../cursor_plans/fbp-extensions/S20-execution.md).
