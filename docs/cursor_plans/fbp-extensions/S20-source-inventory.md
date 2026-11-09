# S20 source and handoff inventory

Inspected base `53737a3dc229fb95fcc8d4bd7bc730be24e9f8aa` on2026-11-03. Documentation-only design trace X20.1; no proposed runtime is inferred from folder names. Existing sources—not early illustrative destinations—own implementation.

| Current producer | Observed contract / affected consumer | Selected design artifact / future proof owner |
| --- | --- | --- |
| `src/model/graph.ts`, `model/graph/structure.ts` | strict v1 JSON/DAG and task fields; unknown config/version refused | [CG2](contracts/configuration-v2.md); S25 compiler/model/raw JSON |
| `src/component.ts`, `model/catalog.ts` | frozen captured create(), descriptor validation/meaning checks, catalog1 | CG2 factories/descriptors; S25; EV1 decision metadata S24A |
| `src/graph.ts` | one compiler snapshots registry/spec, zero factories, private handle WeakMap | CG2 binding validation; S25, preserved S21 |
| `src/builder.ts` | typed builder emits same v1 spec | CG2 configured overload/version transition; S25 |
| `src/runtime.ts`, `runtime/state.ts` | per-run lifecycle/ledger, existing safe lifecycle diagnostics, first-terminal | [DG1](contracts/diagnostics-v1.md); S21 separate stream, no Snapshot change |
| `src/runtime/tasks.ts`, `task-attempt.ts` | single operation owner,1-based attempts/UUID, explicit retry/settlement, cooperative abort | DG1 observation/provenance overload; S21; [RC1](contracts/recovery-boundaries.md) shared kernel S39 |
| `src/runtime/ports.ts`, `channel.ts` | actual admitted validated packets, node/run dedup and actual queue transfer | DG1 ingress/dequeue/output attribution, no speculative latest-input association |
| `src/function.ts`, `components/map.ts`, `filter.ts` | per-packet automatic tasks; filter false consumes with no reason | DG1 explicit known packet binding S21; [EV1](contracts/evidence-v1.md) decisions S24A |
| `src/components/join-by-key/**` | bounded job/key partial groups, completed anti-reuse, same-job parents | RC1 persisted state adapters S47; no S20 implementation |
| `src/runtime/trace.ts`, `model/execution-trace.ts` | optional EX1 ring128/max1024, payload2048, sent/received/immediate parents | DG1 coexistence; S21, session policy S22, causal query S24B |
| `src/inspection.ts`, `model/inspection.ts`, `model/mermaid/**` | scoped registration/graph/event/sub views, payload-free snapshots | no shape change for S21; new diagnostic model stream consumed S24/S24B |
| `src/testing/index.ts`, `run-node.ts`, `run-graph.ts` | public real-runtime harness, bounded input/output, no replay/fixture API | EV1 fixture/comparison S24C/D; preserve existing harness |
| `fixtures/next-consumer/app/**`, `lib/**` | production installed core, live inspector/dialog/stages/owned HTTP | S24 per-node controls; S24B causal UI; S24E useful installed/workspace app |
| package root/export/build/lock | sole Zod runtime dep, CJS/ESM/model/testing, exact Node/npm | [PK1](contracts/packages-and-storage.md); S26/S32/S39 optional packages |

## Existing executable assertion anchors

- `test/graph.test.js`: “reject graph before effects; browser and server graph issues agree”, “compile snapshots definitions and refuses forged handles”, “own identity and contracts”, “graph shape, names and capacities are deterministic”. These prove present v1/zero-factory behavior, not future config support.
- `test/function-task.test.js`: “automatic operation scope preserves metadata, lineage and serial handler order”, “configured retry invokes only the handler and produces one derived result”, “output validation happens after the task, without retrying invalid results”. DG1 must not change execution placement to make diagnostics convenient.
- `test/node-task-retry.test.js`: “retry classification never evaluates error code getters or proxies”, plus active retry/settlement tests; diagnostic code sanitization cannot call arbitrary getters or weaken safe classification.
- `test/runtime-trace.test.js`, `test/trace-model.test.js`: existing EX1 ring/payload/transfer model and live delivery; DG1 is an added model, not a silent EX1 change.
- `test/package-contracts.test.js`, `test/types/**`, `test/node-task-guidance.test.js`: installed exports/types/guidance snapshot; selected public changes must include their real consumer paths.

## Integration readiness and source limitations

No src/compile.ts or src/graph/ directory exists; correct plan destinations are src/graph.ts, src/builder.ts, src/model/graph/**. No src/testing.ts exists; /testing is src/testing/index.ts. These corrections affect scope/navigation only, not new implementation.

One runtime owns all effects. Generic task context currently has no packet argument; DG1 selects backward-compatible explicit input binding, not implicit inference. No database/editor/replay code exists. New SQL/package compatibility remains named future evidence; no application-specific repo/domain/ORM or provider guarantee was re-audited. External references in PK1/RC1 are primitive API evidence, not qualification receipts.
